import fs from 'fs';
import path from 'path';
import { parse as parseYaml } from 'yaml';
import { AgentClient, usesScriptedDriver, type AgentDriver } from './agent-client.js';
import { loadDataset } from './dataset.js';
import { buildFailureTrace } from './failure-trace.js';
import { runCaseAssertions } from './run-assertions.js';
import { EvalConfigSchema, type EvalConfig } from './schema.js';
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
    const skipLive = !this.driver && usesScriptedDriver(this.model, this.apiKey);
    const loaded = await loadDataset(datasetPath, this.tags);
    const skippedLive = skipLive
      ? loaded.filter((c) => (c.tags ?? []).includes('requires-live'))
      : [];
    const dataset = skipLive
      ? loaded.filter((c) => !(c.tags ?? []).includes('requires-live'))
      : loaded;
    if (skippedLive.length) {
      console.log(`Skipping ${skippedLive.length} requires-live case(s) (scripted driver).`);
    }

    const suitePromptPath = config.system_prompt
      ? resolvePath(absoluteYaml, config.system_prompt)
      : undefined;
    const systemPrompt =
      this.systemPrompt ??
      (suitePromptPath && fs.existsSync(suitePromptPath)
        ? fs.readFileSync(suitePromptPath, 'utf8')
        : this.systemPromptPath && fs.existsSync(this.systemPromptPath)
          ? fs.readFileSync(this.systemPromptPath, 'utf8')
          : undefined);

    const agent = new AgentClient({
      model: this.model,
      driver: this.driver,
      systemPrompt,
      apiKey: this.apiKey,
      baseUrl: this.baseUrl
    });

    const availableTools: string[] = [];
    if (config.mcp_tools?.length) {
      for (const toolPath of config.mcp_tools) {
        const abs = resolvePath(absoluteYaml, toolPath);
        const contract = JSON.parse(fs.readFileSync(abs, 'utf8')) as {
          name: string;
          description?: string;
          inputSchema?: Record<string, unknown>;
        };
        agent.registerTool(contract);
        availableTools.push(contract.name);
      }
    } else if (config.mocks?.length) {
      for (const mock of config.mocks) {
        agent.registerTool({ name: mock.tool, description: `Mocked tool ${mock.tool}` });
        availableTools.push(mock.tool);
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

      const assertion = await runCaseAssertions({
        response,
        metrics: config.metrics,
        testCase,
        config,
        availableTools,
        suiteYamlPath: absoluteYaml,
        model: this.model,
        judgeModel: this.judgeModel,
        apiKey: this.apiKey,
        baseUrl: this.baseUrl
      });

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

      const metricExpectedTool = config.metrics.find((m) => m.type === 'tool_selection')?.expected;
      const stepIndex = [...assertion.stepFailures.keys()][0];
      results.push({
        id: testCase.id,
        prompt: testCase.prompt,
        passed: assertion.passed,
        latencyMs: latency,
        tokens: response.usage.totalTokens,
        routingConfidence: response.routingConfidence,
        failures: assertion.failures,
        tags: testCase.tags,
        hallucinated: assertion.hallucinated,
        routingOk: assertion.routingOk,
        schemaOk: assertion.schemaOk,
        trajectory: assertion.trajectory,
        trace: assertion.passed
          ? undefined
          : buildFailureTrace({
              testCase,
              response,
              failures: assertion.failures,
              metricExpectedTool,
              stepIndex
            })
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
}
