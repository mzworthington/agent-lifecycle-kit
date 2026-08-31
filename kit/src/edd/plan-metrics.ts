import { annotatePlanStepFailures } from './trajectory.js';
import type { AgentToolCall } from './schema.js';

/**
 * Pure `plan_adherence`: ordered tool plan must match expected names.
 */
export function evaluatePlanAdherence(input: {
  toolCalls: AgentToolCall[];
  expectedPlan: string[];
}): { failures: string[]; stepFailures: Map<number, string> } {
  if (!input.expectedPlan.length) {
    return { failures: [], stepFailures: new Map() };
  }
  const stepFailures = annotatePlanStepFailures(input.expectedPlan, input.toolCalls);
  return { failures: [...stepFailures.values()], stepFailures };
}

/**
 * Pure `step_efficiency`: reject needless extra tool steps beyond max_steps.
 */
export function evaluateStepEfficiency(input: {
  toolCalls: AgentToolCall[];
  maxSteps: number;
  haltedAutonomousExecution?: boolean;
}): string[] {
  const failures: string[] = [];
  const count = input.toolCalls.length;
  if (count > input.maxSteps) {
    failures.push(
      `efficiency: used ${count} tool step(s), max allowed ${input.maxSteps}`
    );
  }
  return failures;
}

export function resolveMaxSteps(input: {
  maxSteps?: number;
  expectToolsLength?: number;
  noTool?: boolean;
}): number {
  if (input.maxSteps !== undefined) return input.maxSteps;
  if (input.noTool) return 0;
  if (input.expectToolsLength && input.expectToolsLength > 0) return input.expectToolsLength;
  return 1;
}
