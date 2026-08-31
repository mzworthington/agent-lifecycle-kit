export { EvalConfigSchema, EvalCaseSchema, type EvalConfig, type EvalCase } from './schema.js';
export { AgentClient, scriptedDriver, usesScriptedDriver, type AgentDriver } from './agent-client.js';
export { EvalRunner, type EvalRunnerOptions } from './runner.js';
export { loadDataset, streamDataset, productionTraceToJsonl } from './dataset.js';
export { generateReport, buildSuiteReport, type SuiteReport, type CaseResult, type FailureTrace } from './telemetry.js';
export { runLlmJudge, localJudge, JUDGE_PROMPT_TEMPLATE } from './judge.js';
export { emitAgentSpan, detectRoutingDrift, shouldShadowEval, type OtelEmitter } from './otel.js';
export { watchTargets } from './watch.js';
