import type { AgentResponse, EvalCase } from './schema.js';

export interface FailureTrace {
  diagnosis: string;
  suggestedFix: string;
  expectedTool?: string;
  actualTool?: string;
  expectedArguments?: string;
  actualArguments?: string;
  llmOutput?: string;
  stepIndex?: number;
}

interface FailureKind {
  match: string;
  diagnosis: string;
  suggestedFix: string;
  withStep?: boolean;
}

const FAILURE_KINDS: FailureKind[] = [
  {
    match: 'routing:',
    diagnosis:
      'Tool Selection Failure. The model refused to use the tool and hallucinated a generic answer, or selected the wrong tool.',
    suggestedFix:
      'Add a constraint to the system prompt instructing the agent to never guess architectural details and to always use the provided C4 tools.'
  },
  {
    match: 'schema:',
    diagnosis:
      'Schema Violation. The tool only accepts the declared argument types, but the model produced incompatible JSON (e.g. an array for a string field).',
    suggestedFix:
      "Update the tool description to explicitly state that it can only be called for one component at a time, or update the tool's backend logic to accept arrays."
  },
  {
    match: 'argument:',
    diagnosis:
      'Argument Correctness Failure. Arguments were structurally usable but did not match the expected meaning for this intent.',
    suggestedFix:
      'Tighten tool parameter descriptions and examples so the agent extracts the correct identifiers and values from the user prompt.'
  },
  {
    match: 'completion:',
    diagnosis:
      'Task Completion Failure. The agent did not achieve the stated user goal for this case.',
    suggestedFix:
      'Clarify the goal in the system prompt and eval expectations; ensure the agent finishes the workflow rather than stopping after a related tool call.'
  },
  {
    match: 'criteria:',
    diagnosis:
      'Criteria Judge Failure. One or more written suite criteria were not satisfied.',
    suggestedFix:
      'Adjust prompts or tool contracts until each listed criterion passes at the configured threshold; inspect per-criterion reasons in the failure text.'
  },
  {
    match: 'mcp:',
    diagnosis:
      'MCP Use Failure. The agent used a tool outside the catalog or missed the expected MCP capability.',
    suggestedFix:
      'Register the needed MCP tool in the suite and tighten routing so only catalog tools are called.',
    withStep: true
  },
  {
    match: 'plan:',
    diagnosis: 'Plan Adherence Failure. The ordered tool plan diverged at a specific step.',
    suggestedFix:
      'Clarify multi-step instructions and expected tool order in the system prompt and eval expectations.',
    withStep: true
  },
  {
    match: 'efficiency:',
    diagnosis: 'Step Efficiency Failure. The agent took more tool steps than allowed.',
    suggestedFix:
      'Reduce retries and redundant lookups; set max_steps to the intended plan length.',
    withStep: true
  },
  {
    match: 'plugin:',
    diagnosis: 'Plugin Metric Failure. A consumer metric plugin rejected the case.',
    suggestedFix: 'Inspect the plugin reason and adjust prompts, tools, or the plugin threshold.'
  },
  {
    match: 'semantic:',
    diagnosis: 'Semantic Failure. LLM-as-a-judge flagged hallucination or inaccurate synthesis.',
    suggestedFix:
      'Tighten the system prompt to ground answers strictly in tool output; re-run with a stronger judge model locally before CI.'
  },
  {
    match: 'self_correction',
    diagnosis: 'Self-Correction Failure. The agent did not update parameters from the error hint.',
    suggestedFix:
      'Instruct the agent to parse NotFound / validation hints and retry once with corrected arguments.'
  },
  {
    match: 'terminal_fallback',
    diagnosis: 'Terminal Fallback Failure. The agent did not halt after consecutive tool failures.',
    suggestedFix:
      'Enforce a circuit breaker in the system prompt: after N consecutive timeouts, stop retrying and report the constraint to the user.'
  }
];

export function diagnoseFailures(
  failures: string[],
  hallucinated?: boolean
): Pick<FailureTrace, 'diagnosis' | 'suggestedFix'> {
  const failureText = failures.join('; ');
  for (const kind of FAILURE_KINDS) {
    if (failureText.includes(kind.match) || (kind.match === 'semantic:' && hallucinated)) {
      return { diagnosis: kind.diagnosis, suggestedFix: kind.suggestedFix };
    }
  }
  return {
    diagnosis: failureText || 'Assertion failure',
    suggestedFix: 'Inspect the prompt, tool schema, and system instructions for this case.'
  };
}

export function buildFailureTrace(input: {
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
  const base = diagnoseFailures(input.failures);
  const matched = FAILURE_KINDS.find((k) => failureText.includes(k.match));

  return {
    ...base,
    expectedTool,
    actualTool,
    expectedArguments,
    actualArguments,
    llmOutput: input.response.content,
    stepIndex: matched?.withStep ? input.stepIndex : undefined
  };
}
