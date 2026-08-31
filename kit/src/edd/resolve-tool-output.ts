import type { EvalConfig, EvalCase } from './schema.js';

/** Resolve mocked or case-provided tool output for judges. */
export function resolveToolOutput(
  testCase: EvalCase,
  config: EvalConfig,
  toolName?: string
): unknown {
  if (testCase.tool_output !== undefined) return testCase.tool_output;
  if (!toolName) return null;
  return config.mocks?.find((m) => m.tool === toolName)?.response ?? null;
}
