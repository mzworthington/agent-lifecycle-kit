export { EvalConfigSchema, EvalCaseSchema, type EvalConfig, type EvalCase } from './schema.js';
export { AgentClient, scriptedDriver, usesScriptedDriver, type AgentDriver } from './agent-client.js';
export { EvalRunner, type EvalRunnerOptions } from './runner.js';
export {
  createConsoleEvalProgress,
  evalDriverKind,
  formatCaseDone,
  formatCasePhase,
  formatSuiteStart,
  type EvalProgress
} from './progress.js';
export { loadDataset, streamDataset, productionTraceToJsonl } from './dataset.js';
export {
  generateReport,
  buildSuiteReport,
  renderGithubSummaryOverview,
  appendGithubStepSummary,
  publishEvalReportToGithubSummary,
  type SuiteReport,
  type CaseResult,
  type FailureTrace
} from './telemetry.js';
export { buildFailureTrace, diagnoseFailures } from './failure-trace.js';
export { redactSecrets } from './redact.js';
export { runCaseAssertions } from './run-assertions.js';
export {
  localJudge,
  localCriteriaJudge,
  localTaskCompletion,
  JUDGE_PROMPT_TEMPLATE,
  useLocalJudgeModel
} from './judge.js';
export { runLlmJudge, runCriteriaJudge, runTaskCompletionJudge } from './run-judges.js';
export {
  openAiCompatibleJudgeCompletion,
  createCliJudgeCompletion,
  claudeCodeJudgeCompletion,
  cursorAgentJudgeCompletion,
  antigravityJudgeCompletion,
  parseJudgeCliStdout,
  resolveJudgeBackend,
  resolveJudgeCompletion,
  resolveJudgeApiKey,
  JUDGE_CLI_PRESETS,
  type JudgeCompletionPort,
  type JudgeBackend,
  type JudgeCliPreset
} from './judge-provider.js';
export {
  ProviderHttpError,
  isRetryableProviderFailure,
  withProviderRetry
} from './provider-retry.js';
export { evaluateArgumentCorrectness, parseToolArguments } from './argument-correctness.js';
export { synthesizeParaphrases, synthesizeDataset } from './synthesize.js';
export { buildTrajectory, annotatePlanStepFailures, type TrajectoryStep } from './trajectory.js';
export { evaluateMcpUse } from './mcp-use.js';
export { evaluatePlanAdherence, evaluateStepEfficiency, resolveMaxSteps } from './plan-metrics.js';
export {
  loadMetricPlugin,
  type MetricPlugin,
  type MetricPluginContext,
  type MetricPluginResult
} from './metric-plugin.js';
export {
  lintCases,
  dedupeCases,
  casesFromTraceFile,
  synthesizeFromSeeds
} from './dataset-hygiene.js';
export { emitAgentSpan, detectRoutingDrift, shouldShadowEval, type OtelEmitter, type OtelSpan } from './otel.js';
export {
  normalizeProdTurn,
  shadowEvalTurn,
  shadowEvalTurns,
  kitSpanToOtlpJson,
  type ProdTurn,
  type ShadowEvalResult,
  type ShadowEvalOptions
} from './shadow.js';
export { watchTargets } from './watch.js';
