import type { AgentToolCall } from './schema.js';

export interface TrajectoryStep {
  index: number;
  kind: 'tool' | 'halt' | 'message';
  toolName?: string;
  arguments?: string | Record<string, unknown>;
  failure?: string;
}

/**
 * Build an ordered trajectory from an agent response for step-level reporting.
 */
export function buildTrajectory(input: {
  toolCalls: AgentToolCall[];
  content: string;
  haltedAutonomousExecution?: boolean;
  stepFailures?: Map<number, string>;
}): TrajectoryStep[] {
  const steps: TrajectoryStep[] = [];
  const failures = input.stepFailures ?? new Map<number, string>();

  input.toolCalls.forEach((call, index) => {
    steps.push({
      index,
      kind: 'tool',
      toolName: call.name,
      arguments: call.arguments,
      failure: failures.get(index)
    });
  });

  if (input.haltedAutonomousExecution) {
    steps.push({
      index: steps.length,
      kind: 'halt',
      failure: failures.get(steps.length)
    });
  } else if (!input.toolCalls.length) {
    steps.push({
      index: 0,
      kind: 'message',
      failure: failures.get(0)
    });
  }

  return steps;
}

export function annotatePlanStepFailures(
  expectedPlan: string[],
  toolCalls: AgentToolCall[]
): Map<number, string> {
  const map = new Map<number, string>();
  const limit = Math.max(expectedPlan.length, toolCalls.length);
  for (let i = 0; i < limit; i++) {
    const expected = expectedPlan[i];
    const actual = toolCalls[i]?.name;
    if (expected && actual !== expected) {
      map.set(i, `plan: step[${i}] expected ${expected}, got ${actual ?? '(none)'}`);
    } else if (!expected && actual) {
      map.set(i, `plan: step[${i}] unexpected tool ${actual}`);
    }
  }
  return map;
}
