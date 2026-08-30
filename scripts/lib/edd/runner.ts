import fs from 'fs';
import path from 'path';
import { parse as parseYaml } from 'yaml';
import { AgentClient, type AgentDriver } from './agent-client.js';
import { loadDataset } from './dataset.js';
import { runLlmJudge } from './judge.js';
import {
  EvalConfigSchema,
  type AgentResponse,
  type EvalCase,
  type EvalConfig,
  type EvalMetric
} from './schema.js';
import {
  buildSuiteReport,
  generateReport,
  printReportSummary,
  type CaseResult,
  type SuiteReport
} from './telemetry.js';
import { emitAgentSpan, type OtelEmitter } from './otel.js';

export interface EvalRunnerOptions {
  model: string;
  driver?: AgentDriver;
  systemPrompt?: string;
  systemPromptPath?: string;
  judgeModel?: string;
  apiKey?: string;
  baseUrl?: string;
  otel?: OtelEmitter;
  tags?: string[];
}

function resolvePath(baseFile: string, maybeRelative: string): string {
  if (path.isAbsolute(maybeRelative)) return maybeRelative;
  return path.resolve(path.dirname(baseFile), maybeRelative);
}

function parseArgs(raw: string | Record<string, unknown>): Record<string, unknown> | null {
  if (typeof raw === 'object' && raw !== null) return raw;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export class EvalRunner {
  private model: string;
  private driver?: AgentDriver;
  private systemPrompt?: string;
  private systemPromptPath?: string;
  private judgeModel?: string;
  private apiKey?: string;
  private baseUrl?: string;
  private otel?: OtelEmitter;
  private tags?: string[];
  private lastReports: SuiteReport[] = [];

  constructor(options: EvalRunnerOptions) {
    this.model = options.model;
    this.driver = options.driver;
    this.systemPrompt = options.systemPrompt;
    this.systemPromptPath = options.systemPromptPath;
    this.judgeModel = options.judgeModel;
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl;
    this.otel = options.otel;
    this.tags = options.tags;
  }

  getReports(): SuiteReport[] {
    return this.lastReports;
  }

  async runSuite(yamlPath: string): Promise<SuiteReport> {
    console.log(`Starting eval suite: ${yamlPath}`);
    const absoluteYaml = path.resolve(yamlPath);
    const fileContent = fs.readFileSync(absoluteYaml, 'utf8');
    const config: EvalConfig = EvalConfigSchema.parse(parseYaml(fileContent));
    const datasetPath = resolvePath(absoluteYaml, config.dataset);
    const dataset = await loadDataset(datasetPath, this.tags);

    const systemPrompt =
      this.systemPrompt ??
      (this.systemPromptPath && fs.existsSync(this.systemPromptPath)
        ? fs.readFileSync(this.systemPromptPath, 'utf8')
        : undefined);

    const agent = new AgentClient({
      model: this.model,
      driver: this.driver,
      systemPrompt,
      apiKey: this.apiKey,
      baseUrl: this.baseUrl
    });

    // Register MCP tool contracts when listed in the suite
    if (config.mcp_tools?.length) {
      for (const toolPath of config.mcp_tools) {
        const abs = resolvePath(absoluteYaml, toolPath);
        const contract = JSON.parse(fs.readFileSync(abs, 'utf8')) as {
          name: string;
          description?: string;
          inputSchema?: Record<string, unknown>;
        };
        agent.registerTool(contract);
      }
    } else if (config.mocks?.length) {
      for (const mock of config.mocks) {
        agent.registerTool({ name: mock.tool, description: `Mocked tool ${mock.tool}` });
      }
    }

    const startedAt = new Date().toISOString();
    const results: CaseResult[] = [];

    for (const testCase of dataset) {
      agent.resetContext();

      if (config.mocks) {
        for (const mock of config.mocks) {
          agent.registerMockTool(mock.tool, mock.response, {
            after_calls: mock.after_calls,
            error: mock.error
          });
        }
      }

      if (testCase.history?.length) {
        agent.seedHistory(testCase.history);
      }

      const startTime = performance.now();
      const response = await agent.executePrompt(testCase.prompt);
      const latency = performance.now() - startTime;

      const assertion = await this.runAssertions(response, config.metrics, testCase, config);

      emitAgentSpan(this.otel, {
        suite: config.name,
        caseId: testCase.id,
        prompt: testCase.prompt,
        toolCalls: response.tool_calls,
        routingConfidence: response.routingConfidence,
        latencyMs: latency,
        tokens: response.usage.totalTokens,
        passed: assertion.passed
      });

      results.push({
        id: testCase.id,
        prompt: testCase.prompt,
        passed: assertion.passed,
        latencyMs: latency,
        tokens: response.usage.totalTokens,
        routingConfidence: response.routingConfidence,
        failures: assertion.failures,
        tags: testCase.tags,
        hallucinated: assertion.hallucinated
      });
    }

    const report = buildSuiteReport({
      suite: config.name,
      suitePath: absoluteYaml,
      model: this.model,
      startedAt,
      results
    });

    this.lastReports = [report];
    printReportSummary(report);
    return report;
  }

  async runSuites(yamlPaths: string[]): Promise<SuiteReport[]> {
    const reports: SuiteReport[] = [];
    for (const p of yamlPaths) {
      reports.push(await this.runSuite(p));
    }
    this.lastReports = reports;
    return reports;
  }

  writeReports(format: 'md' | 'json', outDir: string): string[] {
    return generateReport(this.lastReports, { format, outDir });
  }

  private async runAssertions(
    response: AgentResponse,
    metrics: EvalMetric[],
    testCase: EvalCase,
    config: EvalConfig
  ): Promise<{ passed: boolean; failures: string[]; hallucinated?: boolean }> {
    const failures: string[] = [];
    let hallucinated: boolean | undefined;

    for (const metric of metrics) {
      if (metric.type === 'tool_selection') {
        const selected = response.tool_calls?.[0]?.name;
        const expected =
          testCase.expect?.no_tool === true
            ? undefined
            : (testCase.expect?.tool ?? metric.expected);

        if (testCase.expect?.no_tool) {
          if (selected) {
            failures.push(`routing: expected no tool, got ${selected}`);
          }
          continue;
        }

        if (!expected) {
          failures.push('routing: tool_selection metric missing expected tool');
          continue;
        }

        if (selected !== expected) {
          failures.push(`routing: expected tool ${expected}, got ${selected ?? '(none)'}`);
        }
      }

      if (metric.type === 'schema_match') {
        const call = response.tool_calls?.[0];
        if (!call) {
          if (testCase.expect?.no_tool) continue;
          failures.push('schema: no tool call to validate');
          continue;
        }
        const parsed = parseArgs(call.arguments);
        if (!parsed) {
          failures.push('schema: tool arguments are not valid JSON');
          continue;
        }
        if (metric.strict !== false) {
          // Strict mode: arguments must be a JSON object
          if (typeof parsed !== 'object' || Array.isArray(parsed)) {
            failures.push('schema: arguments must be a JSON object');
          }
        }
        if (testCase.expect?.arguments_contains) {
          for (const [key, value] of Object.entries(testCase.expect.arguments_contains)) {
            if (parsed[key] !== value) {
              failures.push(`schema: expected ${key}=${JSON.stringify(value)}, got ${JSON.stringify(parsed[key])}`);
            }
          }
        }
      }

      if (metric.type === 'self_correction') {
        const call = response.tool_calls?.[0];
        const parsed = call ? parseArgs(call.arguments) : null;
        const hintOk =
          parsed &&
          (parsed.componentId === 'payment-api' ||
            parsed.component === 'payment-api' ||
            JSON.stringify(parsed).includes('payment-api'));
        if (!hintOk) {
          failures.push('self_correction: agent did not update parameters from error hint');
        }
      }

      if (metric.type === 'terminal_fallback') {
        const maxRetries = metric.max_retries ?? 2;
        if (!response.haltedAutonomousExecution) {
          failures.push('terminal_fallback: agent did not halt after consecutive failures');
        }
        if (response.tool_calls?.length) {
          failures.push('terminal_fallback: agent continued issuing tool calls after breaker');
        }
        if (response.consecutiveToolFailures < maxRetries && !response.haltedAutonomousExecution) {
          failures.push(`terminal_fallback: expected >= ${maxRetries} consecutive failures`);
        }
      }

      if (metric.type === 'llm_as_judge') {
        const toolOutput =
          testCase.tool_output ??
          config.mocks?.find((m) => m.tool === (response.tool_calls?.[0]?.name ?? ''))?.response ??
          null;
        const verdict = await runLlmJudge({
          prompt: testCase.prompt,
          toolOutput,
          agentResponse: response.content,
          model: this.judgeModel ?? config.judge_model ?? this.model,
          apiKey: this.apiKey,
          baseUrl: this.baseUrl
        });
        hallucinated = verdict.hallucinated;
        if (verdict.score !== 'PASS') {
          failures.push(`semantic: ${verdict.reasoning || 'llm_as_judge failed'}`);
        }
      }
    }

    return { passed: failures.length === 0, failures, hallucinated };
  }
}
