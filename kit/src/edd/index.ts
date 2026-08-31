export { EvalConfigSchema, EvalCaseSchema, type EvalConfig, type EvalCase } from './schema.js';
export { AgentClient, scriptedDriver, usesScriptedDriver, type AgentDriver } from './agent-client.js';
export { EvalRunner, type EvalRunnerOptions } from './runner.js';
export { loadDataset, streamDataset, productionTraceToJsonl } from './dataset.js';
export { generateReport, buildSuiteReport, type SuiteReport, type CaseResult, type FailureTrace } from './telemetry.js';
export {
  localJudge,
  localCriteriaJudge,
  localTaskCompletion,
  JUDGE_PROMPT_TEMPLATE,
  useLocalJudgeModel
} from './judge.js';
export { runLlmJudge, runCriteriaJudge, runTaskCompletionJudge } from './run-judges.js';
export { openAiCompatibleJudgeCompletion, type JudgeCompletionPort } from './judge-provider.js';
export { evaluateArgumentCorrectness, parseToolArguments } from './argument-correctness.js';
export { emitAgentSpan, detectRoutingDrift, shouldShadowEval, type OtelEmitter } from './otel.js';
export { watchTargets } from './watch.js';
