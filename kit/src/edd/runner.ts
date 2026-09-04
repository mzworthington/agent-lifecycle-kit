import fs from 'fs';
import path from 'path';
import { parse as parseYaml } from 'yaml';
import { AgentClient, scriptedDriver, type AgentDriver } from './agent-client.js';
import { loadDataset } from './dataset.js';
import { judgeBackendForStyle, resolveEvalRun, type EvalStyle } from './eval-style.js';
import { buildFailureTrace } from './failure-trace.js';
import { runCaseAssertions } from './run-assertions.js';
import { EvalConfigSchema, type EvalConfig } from './schema.js';
import { isSkillsOnlyMode } from '../skills/skills_only_mode.js';
import {
  applySkillsOnlyCases,
  rewriteSubagentSuiteForSkillsOnly,
  shouldRemapSubagentExpects
} from './subagent-route.js';
import {
  buildSuiteReport,
  generateReport,
  printReportSummary,
  type CaseResult,
  type SuiteReport
} from './telemetry.js';
import { emitAgentSpan, type OtelEmitter } from './otel.js';
import { createConsoleEvalProgress, type EvalProgress } from './progress.js';
import type { JudgeBackend, JudgeCompletionPort } from './judge-provider.js';

export interface EvalRunnerOptions {
  model: string;
  style?: EvalStyle;
  driver?: AgentDriver;
  systemPrompt?: string;
  systemPromptPath?: string;
  apiKey?: string;
  baseUrl?: string;
  judgeBackend?: JudgeBackend;
  complete?: JudgeCompletionPort;
  otel?: OtelEmitter;
  tags?: string[];
  progress?: EvalProgress;
}

function resolvePath(baseFile: string, maybeRelative: string): string {
  if (path.isAbsolute(maybeRelative)) return maybeRelative;
  return path.resolve(path.dirname(baseFile), maybeRelative);
}

export class EvalRunner {
  private model: string;
  private style: EvalStyle;
  private driver?: AgentDriver;
  private systemPrompt?: string;
  private systemPromptPath?: string;
  private apiKey?: string;
  private baseUrl?: string;
  private judgeBackend?: JudgeBackend;
  private complete?: JudgeCompletionPort;
  private otel?: OtelEmitter;
  private tags?: string[];
  private progress: EvalProgress;
  private lastReports: SuiteReport[] = [];

  constructor(options: EvalRunnerOptions) {
    this.model = options.model;
    this.style =
      options.style ??
      resolveEvalRun({
        model: options.model,
        apiKey: options.apiKey,
        baseUrl: options.baseUrl
      }).style;
    this.driver = options.driver;
    this.systemPrompt = options.systemPrompt;
    this.systemPromptPath = options.systemPromptPath;
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl;
    this.judgeBackend = options.judgeBackend ?? judgeBackendForStyle(this.style);
    this.complete = options.complete;
    this.otel = options.otel;
    this.tags = options.tags;
    this.progress = options.progress ?? createConsoleEvalProgress();
  }

  getReports(): SuiteReport[] {
    return this.lastReports;
  }

  async runSuite(yamlPath: string): Promise<SuiteReport> {
    console.log(`Starting eval suite: ${yamlPath}`);
    const absoluteYaml = path.resolve(yamlPath);
    const fileContent = fs.readFileSync(absoluteYaml, 'utf8');
    const parsed: EvalConfig = EvalConfigSchema.parse(parseYaml(fileContent));
    const skillsOnly = isSkillsOnlyMode();
    const config = skillsOnly ? rewriteSubagentSuiteForSkillsOnly(parsed) : parsed;
    const datasetPath = resolvePath(absoluteYaml, config.dataset);
    const skipLive = this.style === 'local';
    const loaded = await loadDataset(datasetPath, this.tags);
    const skippedLive = skipLive
      ? loaded.filter((c) => (c.tags ?? []).includes('requires-live'))
      : [];
    const routed = skipLive
      ? loaded.filter((c) => !(c.tags ?? []).includes('requires-live'))
      : loaded;
    const dataset = shouldRemapSubagentExpects(skillsOnly, config.mcp_tools)
      ? applySkillsOnlyCases(routed)
      : routed;
    if (skippedLive.length) {
      console.log(`Skipping ${skippedLive.length} requires-live case(s) (local style).`);
    }

    this.progress.onSuiteStart({
      style: this.style,
      model: this.model,
      baseUrl: this.baseUrl ?? process.env.KIT_EVAL_BASE_URL ?? process.env.OPENAI_BASE_URL,
      caseCount: dataset.length,
      skippedLive: skippedLive.length,
      judgeBackend: this.judgeBackend
    });

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
      driver: this.driver ?? (this.style === 'local' ? scriptedDriver : undefined),
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
    const total = dataset.length;
    let index = 0;

    for (const testCase of dataset) {
      index += 1;
      const caseRef = { index, total, id: testCase.id };
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

      const caseStarted = performance.now();
      this.progress.onCasePhase({ ...caseRef, phase: 'agent' });
      try {
        const startTime = performance.now();
        const response = await agent.executePrompt(testCase.prompt);
        const latency = performance.now() - startTime;

        this.progress.onCasePhase({ ...caseRef, phase: 'judges' });
        const assertion = await runCaseAssertions({
          response,
          metrics: config.metrics,
          testCase,
          config,
          availableTools,
          suiteYamlPath: absoluteYaml,
          model: this.model,
          apiKey: this.apiKey,
          baseUrl: this.baseUrl,
          judgeBackend: this.judgeBackend,
          complete: this.complete
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

        this.progress.onCaseDone({
          ...caseRef,
          passed: assertion.passed,
          agentMs: latency,
          totalMs: performance.now() - caseStarted
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
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.progress.onCaseDone({
          ...caseRef,
          passed: false,
          agentMs: performance.now() - caseStarted,
          totalMs: performance.now() - caseStarted
        });
        results.push({
          id: testCase.id,
          prompt: testCase.prompt,
          passed: false,
          latencyMs: performance.now() - caseStarted,
          tokens: 0,
          failures: [`agent: ${message}`],
          tags: testCase.tags
        });
      }
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
