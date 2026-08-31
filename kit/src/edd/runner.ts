import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { AgentClient, usesScriptedDriver, type AgentDriver } from './agent-client.js';
import { loadDataset } from './dataset.js';
import { evaluateArgumentCorrectness, parseToolArguments } from './argument-correctness.js';
import { evaluateMcpUse } from './mcp-use.js';
import { loadMetricPlugin } from './metric-plugin.js';
import { evaluatePlanAdherence, evaluateStepEfficiency, resolveMaxSteps } from './plan-metrics.js';
import { runCriteriaJudge, runLlmJudge, runTaskCompletionJudge } from './run-judges.js';
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
  type FailureTrace,
  type SuiteReport
} from './telemetry.js';
import { buildTrajectory, type TrajectoryStep } from './trajectory.js';
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
  return parseToolArguments(raw);
}

function buildFailureTrace(input: {
  testCase: EvalCase;
  response: AgentResponse;
  failures: string[];
  metricExpectedTool?: string;
  stepIndex?: number;
}): FailureTrace | undefined {
  if (!input.failures.length) return undefined;
  const expectedTool =
    input.testCase.expect?.no_tool === true
      ? undefined
      : (input.testCase.expect?.tool ?? input.metricExpectedTool);
  const actualTool = input.response.tool_calls?.[0]?.name;
  const actualArguments = input.response.tool_calls?.[0]
    ? typeof input.response.tool_calls[0].arguments === 'string'
      ? input.response.tool_calls[0].arguments
      : JSON.stringify(input.response.tool_calls[0].arguments)
    : undefined;
  const expectedArguments = input.testCase.expect?.arguments_contains
    ? JSON.stringify(input.testCase.expect.arguments_contains)
    : undefined;

  const failureText = input.failures.join('; ');
  if (failureText.includes('routing:')) {
    return {
      diagnosis:
        'Tool Selection Failure. The model refused to use the tool and hallucinated a generic answer, or selected the wrong tool.',
      suggestedFix:
        'Add a constraint to the system prompt instructing the agent to never guess architectural details and to always use the provided C4 tools.',
      expectedTool,
      actualTool,
      llmOutput: input.response.content,
      expectedArguments,
      actualArguments
    };
  }
  if (failureText.includes('schema:')) {
    return {
      diagnosis:
        'Schema Violation. The tool only accepts the declared argument types, but the model produced incompatible JSON (e.g. an array for a string field).',
      suggestedFix:
        'Update the tool description to explicitly state that it can only be called for one component at a time, or update the tool\'s backend logic to accept arrays.',
      expectedTool,
      actualTool,
      expectedArguments,
      actualArguments,
      llmOutput: input.response.content
    };
  }
  if (failureText.includes('argument:')) {
    return {
      diagnosis:
        'Argument Correctness Failure. Arguments were structurally usable but did not match the expected meaning for this intent.',
      suggestedFix:
        'Tighten tool parameter descriptions and examples so the agent extracts the correct identifiers and values from the user prompt.',
      expectedTool,
      actualTool,
      expectedArguments,
      actualArguments,
      llmOutput: input.response.content
    };
  }
  if (failureText.includes('completion:')) {
    return {
      diagnosis:
        'Task Completion Failure. The agent did not achieve the stated user goal for this case.',
      suggestedFix:
        'Clarify the goal in the system prompt and eval expectations; ensure the agent finishes the workflow rather than stopping after a related tool call.',
      expectedTool,
      actualTool,
      expectedArguments,
      actualArguments,
      llmOutput: input.response.content
    };
  }
  if (failureText.includes('criteria:')) {
    return {
      diagnosis:
        'Criteria Judge Failure. One or more written suite criteria were not satisfied.',
      suggestedFix:
        'Adjust prompts or tool contracts until each listed criterion passes at the configured threshold; inspect per-criterion reasons in the failure text.',
      expectedTool,
      actualTool,
      expectedArguments,
      actualArguments,
      llmOutput: input.response.content
    };
  }
  if (failureText.includes('mcp:')) {
    return {
      diagnosis: 'MCP Use Failure. The agent used a tool outside the catalog or missed the expected MCP capability.',
      suggestedFix:
        'Register the needed MCP tool in the suite and tighten routing so only catalog tools are called.',
      expectedTool,
      actualTool,
      expectedArguments,
      actualArguments,
      llmOutput: input.response.content,
      stepIndex: input.stepIndex
    };
  }
  if (failureText.includes('plan:')) {
    return {
      diagnosis: 'Plan Adherence Failure. The ordered tool plan diverged at a specific step.',
      suggestedFix:
        'Clarify multi-step instructions and expected tool order in the system prompt and eval expectations.',
      expectedTool,
      actualTool,
      expectedArguments,
      actualArguments,
      llmOutput: input.response.content,
      stepIndex: input.stepIndex
    };
  }
  if (failureText.includes('efficiency:')) {
    return {
      diagnosis: 'Step Efficiency Failure. The agent took more tool steps than allowed.',
      suggestedFix:
        'Reduce retries and redundant lookups; set max_steps to the intended plan length.',
      expectedTool,
      actualTool,
      llmOutput: input.response.content,
      stepIndex: input.stepIndex
    };
  }
  if (failureText.includes('plugin:')) {
    return {
      diagnosis: 'Plugin Metric Failure. A consumer metric plugin rejected the case.',
      suggestedFix: 'Inspect the plugin reason and adjust prompts, tools, or the plugin threshold.',
      expectedTool,
      actualTool,
      llmOutput: input.response.content
    };
  }
  return {
    diagnosis: failureText,
    suggestedFix: 'Inspect the prompt, tool schema, and system instructions for this case.',
    expectedTool,
    actualTool,
    expectedArguments,
    actualArguments,
    llmOutput: input.response.content,
    stepIndex: input.stepIndex
  };
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
      console.log(
        `Skipping ${skippedLive.length} requires-live case(s) (scripted driver).`
      );
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

    // Register MCP tool contracts when listed in the suite
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

      const assertion = await this.runAssertions(response, config.metrics, testCase, config, {
        availableTools,
        suiteYamlPath: absoluteYaml
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

  private async runAssertions(
    response: AgentResponse,
    metrics: EvalMetric[],
    testCase: EvalCase,
    config: EvalConfig,
    ctx: { availableTools: string[]; suiteYamlPath: string }
  ): Promise<{
    passed: boolean;
    failures: string[];
    hallucinated?: boolean;
    routingOk?: boolean;
    schemaOk?: boolean;
    trajectory: TrajectoryStep[];
    stepFailures: Map<number, string>;
  }> {
    const failures: string[] = [];
    let hallucinated: boolean | undefined;
    let routingOk: boolean | undefined;
    let schemaOk: boolean | undefined;
    const stepFailures = new Map<number, string>();

    for (const metric of metrics) {
      if (metric.type === 'tool_selection') {
        if (testCase.expect?.no_tool) {
          const selected = response.tool_calls?.[0]?.name;
          routingOk = !selected;
          if (selected) {
            failures.push(`routing: expected no tool, got ${selected}`);
          }
          continue;
        }

        if (testCase.expect?.tools?.length) {
          const expected = testCase.expect.tools;
          const calls = response.tool_calls ?? [];
          routingOk = true;
          if (calls.length < expected.length) {
            routingOk = false;
            failures.push(
              `routing: expected ${expected.length} tool call(s), got ${calls.length}`
            );
          }
          for (let i = 0; i < expected.length; i++) {
            const got = calls[i]?.name;
            if (got !== expected[i].name) {
              routingOk = false;
              failures.push(
                `routing: call[${i}] expected ${expected[i].name}, got ${got ?? '(none)'}`
              );
            }
          }
          continue;
        }

        const selected = response.tool_calls?.[0]?.name;
        const expected = testCase.expect?.tool ?? metric.expected;

        if (!expected) {
          failures.push('routing: tool_selection metric missing expected tool');
          routingOk = false;
          continue;
        }

        routingOk = selected === expected;
        if (!routingOk) {
          failures.push(`routing: expected tool ${expected}, got ${selected ?? '(none)'}`);
        }
      }

      if (metric.type === 'schema_match') {
        if (testCase.expect?.no_tool) {
          schemaOk = true;
          continue;
        }

        if (testCase.expect?.tools?.length) {
          let ok = true;
          for (let i = 0; i < testCase.expect.tools.length; i++) {
            const call = response.tool_calls?.[i];
            if (!call) {
              failures.push(`schema: missing tool call at index ${i}`);
              ok = false;
              continue;
            }
            const parsed = parseArgs(call.arguments);
            if (!parsed) {
              failures.push(`schema: call[${i}] arguments are not valid JSON`);
              ok = false;
              continue;
            }
            if (metric.strict !== false) {
              if (typeof parsed !== 'object' || Array.isArray(parsed)) {
                failures.push(`schema: call[${i}] arguments must be a JSON object`);
                ok = false;
              }
              for (const [key, value] of Object.entries(parsed)) {
                if (Array.isArray(value)) {
                  failures.push(
                    `schema: call[${i}] expected ${key} to be a string, got array ${JSON.stringify(value)}`
                  );
                  ok = false;
                }
              }
            }
          }
          schemaOk = ok;
          continue;
        }

        const call = response.tool_calls?.[0];
        if (!call) {
          failures.push('schema: no tool call to validate');
          schemaOk = false;
          continue;
        }
        const parsed = parseArgs(call.arguments);
        if (!parsed) {
          failures.push('schema: tool arguments are not valid JSON');
          schemaOk = false;
          continue;
        }
        let ok = true;
        if (metric.strict !== false) {
          if (typeof parsed !== 'object' || Array.isArray(parsed)) {
            failures.push('schema: arguments must be a JSON object');
            ok = false;
          }
          for (const [key, value] of Object.entries(parsed)) {
            if (Array.isArray(value)) {
              failures.push(
                `schema: expected ${key} to be a string, got array ${JSON.stringify(value)}`
              );
              ok = false;
            }
          }
        }
        schemaOk = ok;
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

      if (metric.type === 'argument_correctness') {
        failures.push(
          ...evaluateArgumentCorrectness({
            testCase,
            toolCalls: response.tool_calls ?? []
          })
        );
      }

      if (metric.type === 'mcp_use') {
        const available = metric.allowed_tools?.length ? metric.allowed_tools : ctx.availableTools;
        failures.push(
          ...evaluateMcpUse({
            toolCalls: response.tool_calls ?? [],
            availableTools: available,
            expectTool: testCase.expect?.tool,
            expectTools: testCase.expect?.tools?.map((t) => t.name),
            noTool: testCase.expect?.no_tool === true
          })
        );
      }

      if (metric.type === 'plan_adherence') {
        const expectedPlan =
          testCase.expect?.tools?.map((t) => t.name) ??
          (testCase.expect?.tool ? [testCase.expect.tool] : []);
        if (!expectedPlan.length || testCase.expect?.no_tool) {
          continue;
        }
        const result = evaluatePlanAdherence({
          toolCalls: response.tool_calls ?? [],
          expectedPlan
        });
        for (const [idx, msg] of result.stepFailures) {
          stepFailures.set(idx, msg);
        }
        failures.push(...result.failures);
      }

      if (metric.type === 'step_efficiency') {
        const maxSteps = resolveMaxSteps({
          maxSteps: metric.max_steps,
          expectToolsLength: testCase.expect?.tools?.length,
          noTool: testCase.expect?.no_tool === true
        });
        failures.push(
          ...evaluateStepEfficiency({
            toolCalls: response.tool_calls ?? [],
            maxSteps,
            haltedAutonomousExecution: response.haltedAutonomousExecution
          })
        );
      }

      if (metric.type === 'task_completion') {
        const toolOutput =
          testCase.tool_output ??
          config.mocks?.find((m) => m.tool === (response.tool_calls?.[0]?.name ?? ''))?.response ??
          null;
        const verdict = await runTaskCompletionJudge({
          prompt: testCase.prompt,
          goal: testCase.expect?.goal ?? metric.expected,
          expectTool: testCase.expect?.tool,
          expectTools: testCase.expect?.tools?.map((t) => t.name),
          noTool: testCase.expect?.no_tool === true,
          toolCalls: response.tool_calls ?? [],
          toolOutput,
          agentResponse: response.content,
          model: this.judgeModel ?? config.judge_model ?? this.model,
          apiKey: this.apiKey,
          baseUrl: this.baseUrl
        });
        if (verdict.score !== 'PASS') {
          failures.push(`completion: ${verdict.reasoning || 'task_completion failed'}`);
        }
      }

      if (metric.type === 'criteria_judge') {
        if (testCase.expect?.no_tool) {
          continue;
        }
        const toolOutput =
          testCase.tool_output ??
          config.mocks?.find((m) => m.tool === (response.tool_calls?.[0]?.name ?? ''))?.response ??
          null;
        const verdict = await runCriteriaJudge({
          prompt: testCase.prompt,
          toolOutput,
          agentResponse: response.content,
          toolCalls: response.tool_calls,
          criteria: metric.criteria ?? [],
          threshold: metric.threshold,
          model: this.judgeModel ?? config.judge_model ?? this.model,
          apiKey: this.apiKey,
          baseUrl: this.baseUrl
        });
        if (!verdict.passed) {
          const failed = verdict.results.filter((r) => !r.pass);
          const detail =
            failed.length > 0
              ? failed.map((r) => `${r.criterion} (${r.reason})`).join('; ')
              : verdict.reasoning;
          failures.push(`criteria: ${detail}`);
        }
      }

      if (metric.type === 'llm_as_judge') {
        if (testCase.expect?.no_tool) {
          continue;
        }
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

      if (metric.type === 'plugin') {
        if (!metric.module) {
          failures.push('plugin: metric missing module path');
          continue;
        }
        const modulePath = resolvePath(ctx.suiteYamlPath, metric.module);
        try {
          const plugin = await loadMetricPlugin(pathToFileURL(modulePath).href);
          const trajectoryPreview = buildTrajectory({
            toolCalls: response.tool_calls ?? [],
            content: response.content,
            haltedAutonomousExecution: response.haltedAutonomousExecution,
            stepFailures
          });
          const result = await plugin({
            testCase,
            response,
            trajectory: trajectoryPreview,
            availableTools: ctx.availableTools
          });
          if (!result.pass) {
            failures.push(`plugin: ${result.reason || 'plugin metric failed'}`);
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          failures.push(`plugin: ${msg}`);
        }
      }
    }

    const trajectory = buildTrajectory({
      toolCalls: response.tool_calls ?? [],
      content: response.content,
      haltedAutonomousExecution: response.haltedAutonomousExecution,
      stepFailures
    });

    return {
      passed: failures.length === 0,
      failures,
      hallucinated,
      routingOk,
      schemaOk,
      trajectory,
      stepFailures
    };
  }
}
