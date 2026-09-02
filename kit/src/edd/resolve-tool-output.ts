import type { EvalConfig, EvalCase } from './schema.js';

/** Resolve mocked or case-provided tool output for judges.
 * Prefer the suite mock: that is the JSON the agent actually received. */
export function resolveToolOutput(
  testCase: EvalCase,
  config: EvalConfig,
  toolName?: string
): unknown {
  if (toolName) {
    const mock = config.mocks?.find((m) => m.tool === toolName)?.response;
    if (mock !== undefined) return mock;
  }
  if (testCase.tool_output !== undefined) return testCase.tool_output;
  return null;
}
