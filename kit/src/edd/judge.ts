import type { AgentResponse, AgentToolCall } from './schema.js';

export const JUDGE_PROMPT_TEMPLATE = `You are an impartial technical evaluator grading an AI agent's response.

[User Prompt]: {prompt}
[Tool Output Provided to Agent]: {tool_output}
[Agent's Final Response]: {agent_response}

Evaluate the Agent's Final Response based on the following criteria:
1. Accuracy: Does the response accurately reflect the Tool Output?
2. Hallucination: Did the agent invent any architectural details, dependencies, or components not present in the Tool Output?
3. Tone: Is the response concise and professional?

Score the response as PASS or FAIL. You must output a JSON object with exactly two keys: "score" (PASS/FAIL) and "reasoning" (a brief explanation).`;

export const CRITERIA_JUDGE_PROMPT_TEMPLATE = `You are an impartial evaluator. Score the agent against each criterion independently.

[User Prompt]: {prompt}
[Tool Output]: {tool_output}
[Agent Response]: {agent_response}
[Criteria]:
{criteria}

Return JSON with keys:
- "results": array of { "criterion": string, "pass": boolean, "reason": string }
- "score": number from 0 to 1 (fraction of criteria that passed)
Only evaluate the listed criteria.`;

export const TASK_COMPLETION_PROMPT_TEMPLATE = `You are an impartial evaluator. Did the agent achieve the user's goal?

[User Prompt]: {prompt}
[Goal]: {goal}
[Tool Calls]: {tool_calls}
[Tool Output]: {tool_output}
[Agent Response]: {agent_response}

Return JSON with keys "score" (PASS/FAIL) and "reasoning" (brief).
PASS only if the goal was achieved. Calling a related tool without achieving the goal is FAIL.`;

export interface JudgeVerdict {
  score: 'PASS' | 'FAIL';
  reasoning: string;
  hallucinated: boolean;
}

export interface CriteriaJudgeVerdict {
  score: number;
  passed: boolean;
  reasoning: string;
  results: Array<{ criterion: string; pass: boolean; reason: string }>;
}

export function buildJudgePrompt(input: {
  prompt: string;
  toolOutput: unknown;
  agentResponse: string;
}): string {
  return JUDGE_PROMPT_TEMPLATE.replace('{prompt}', input.prompt)
    .replace('{tool_output}', JSON.stringify(input.toolOutput, null, 2))
    .replace('{agent_response}', input.agentResponse);
}

export function buildCriteriaJudgePrompt(input: {
  prompt: string;
  toolOutput: unknown;
  agentResponse: string;
  criteria: string[];
}): string {
  const listed = input.criteria.map((c, i) => `${i + 1}. ${c}`).join('\n');
  return CRITERIA_JUDGE_PROMPT_TEMPLATE.replace('{prompt}', input.prompt)
    .replace('{tool_output}', JSON.stringify(input.toolOutput, null, 2))
    .replace('{agent_response}', input.agentResponse)
    .replace('{criteria}', listed);
}

export function buildTaskCompletionPrompt(input: {
  prompt: string;
  goal: string;
  toolCalls: AgentToolCall[];
  toolOutput: unknown;
  agentResponse: string;
}): string {
  return TASK_COMPLETION_PROMPT_TEMPLATE.replace('{prompt}', input.prompt)
    .replace('{goal}', input.goal)
    .replace('{tool_calls}', JSON.stringify(input.toolCalls, null, 2))
    .replace('{tool_output}', JSON.stringify(input.toolOutput, null, 2))
    .replace('{agent_response}', input.agentResponse);
}

/**
 * Deterministic local judge used when model is scripted/mock or no API key is present.
 * Flags hallucination when the agent mentions component/dependency tokens absent from tool output.
 */
export function localJudge(input: {
  prompt: string;
  toolOutput: unknown;
  agentResponse: string;
}): JudgeVerdict {
  const toolText = JSON.stringify(input.toolOutput ?? {}).toLowerCase();
  const response = input.agentResponse.toLowerCase();

  const inventedPatterns = [
    /inventory-service/,
    /billing-gateway/,
    /legacy-monolith/,
    /kafka cluster/,
    /redis cluster/
  ];
  const hallucinated = inventedPatterns.some((re) => re.test(response) && !re.test(toolText));

  let reflectsTool = true;
  if (toolOutputHasComponent(input.toolOutput)) {
    const component = String((input.toolOutput as { component?: string }).component ?? '').toLowerCase();
    if (component && !response.includes(component) && !response.includes('architecture')) {
      reflectsTool = false;
    }
  }

  const pass = !hallucinated && reflectsTool && response.trim().length > 0;
  return {
    score: pass ? 'PASS' : 'FAIL',
    reasoning: pass
      ? 'Response reflects tool output without inventing architecture details.'
      : hallucinated
        ? 'Response invents architectural details not present in tool output.'
        : 'Response does not accurately reflect the provided tool output.',
    hallucinated
  };
}

function toolOutputHasComponent(toolOutput: unknown): boolean {
  return !!toolOutput && typeof toolOutput === 'object' && 'component' in (toolOutput as object);
}

function inventedArchitecture(response: string, toolOutput: unknown): boolean {
  const toolText = JSON.stringify(toolOutput ?? {}).toLowerCase();
  const inventedPatterns = [
    /inventory-service/,
    /billing-gateway/,
    /legacy-monolith/,
    /kafka cluster/,
    /redis cluster/
  ];
  return inventedPatterns.some((re) => re.test(response.toLowerCase()) && !re.test(toolText));
}

function reflectsToolOutput(response: string, toolOutput: unknown): boolean {
  if (!toolOutputHasComponent(toolOutput)) return response.trim().length > 0;
  const component = String((toolOutput as { component?: string }).component ?? '').toLowerCase();
  const r = response.toLowerCase();
  if (!component) return r.trim().length > 0;
  return r.includes(component) || r.includes('architecture');
}

/**
 * Scripted/heuristic criteria judge. Prefer live model for nuanced criteria.
 */
export function localCriteriaJudge(input: {
  prompt: string;
  toolOutput: unknown;
  agentResponse: string;
  toolCalls?: AgentToolCall[];
  criteria: string[];
  threshold?: number;
}): CriteriaJudgeVerdict {
  const threshold = input.threshold ?? 1;
  const response = input.agentResponse;
  const results = input.criteria.map((criterion) => {
    const c = criterion.toLowerCase();
    let pass = true;
    let reason = 'Heuristic match';

    if (/invent|hallucin|absent from tool/.test(c)) {
      pass = !inventedArchitecture(response, input.toolOutput);
      reason = pass ? 'No invented architecture details.' : 'Invented details not in tool output.';
    } else if (/reflect|accurat|tool output|grounded/.test(c)) {
      pass = reflectsToolOutput(response, input.toolOutput);
      reason = pass ? 'Response reflects tool output.' : 'Response does not reflect tool output.';
    } else if (/no tool|must not call|without (a )?tool|does not (select|call)/.test(c)) {
      pass = !(input.toolCalls?.length);
      reason = pass ? 'No tool call issued.' : 'Unexpected tool call.';
    } else if (/concise|professional|tone/.test(c)) {
      pass = response.trim().length > 0 && response.trim().length < 4000;
      reason = pass ? 'Response length is reasonable.' : 'Response empty or excessively long.';
    } else {
      const tokens = criterion
        .split(/[^a-zA-Z0-9_-]+/)
        .map((t) => t.toLowerCase())
        .filter((t) => t.length >= 5);
      const hit = tokens.some((t) => response.toLowerCase().includes(t));
      pass = hit || tokens.length === 0;
      reason = pass ? 'Response covers criterion tokens.' : `Missing tokens from: ${criterion}`;
    }

    return { criterion, pass, reason };
  });

  const passedCount = results.filter((r) => r.pass).length;
  const score = results.length === 0 ? 1 : passedCount / results.length;
  const passed = score + 1e-9 >= threshold;
  const failed = results.filter((r) => !r.pass).map((r) => r.criterion);
  return {
    score,
    passed,
    reasoning: passed
      ? `Criteria score ${score.toFixed(2)} >= ${threshold}`
      : `Failed criteria: ${failed.join('; ') || '(none)'}; score ${score.toFixed(2)} < ${threshold}`,
    results
  };
}

/**
 * Scripted task-completion heuristic: correct expected tool use (or no_tool) counts as done;
 * optional goal tokens must appear in the response when no tool was expected.
 */
export function localTaskCompletion(input: {
  prompt: string;
  goal?: string;
  expectTool?: string;
  expectTools?: string[];
  noTool?: boolean;
  toolCalls: AgentToolCall[];
  agentResponse: string;
}): JudgeVerdict {
  const calls = input.toolCalls ?? [];

  if (input.noTool) {
    const ok = calls.length === 0;
    return {
      score: ok ? 'PASS' : 'FAIL',
      reasoning: ok ? 'Goal met without tool use.' : 'Tool call issued when goal required none.',
      hallucinated: false
    };
  }

  if (input.expectTools?.length) {
    const ok =
      calls.length >= input.expectTools.length &&
      input.expectTools.every((name, i) => calls[i]?.name === name);
    return {
      score: ok ? 'PASS' : 'FAIL',
      reasoning: ok ? 'Ordered tool plan completed.' : 'Expected tool plan not completed.',
      hallucinated: false
    };
  }

  if (input.expectTool) {
    const ok = calls[0]?.name === input.expectTool;
    return {
      score: ok ? 'PASS' : 'FAIL',
      reasoning: ok
        ? `Goal advanced via tool ${input.expectTool}.`
        : `Expected tool ${input.expectTool} was not used.`,
      hallucinated: false
    };
  }

  if (input.goal) {
    const tokens = input.goal
      .split(/[^a-zA-Z0-9_-]+/)
      .map((t) => t.toLowerCase())
      .filter((t) => t.length >= 4);
    const response = input.agentResponse.toLowerCase();
    const hit = tokens.length === 0 || tokens.some((t) => response.includes(t));
    return {
      score: hit ? 'PASS' : 'FAIL',
      reasoning: hit ? 'Response addresses goal tokens.' : `Response misses goal: ${input.goal}`,
      hallucinated: false
    };
  }

  return {
    score: calls.length > 0 || input.agentResponse.trim().length > 0 ? 'PASS' : 'FAIL',
    reasoning: 'No explicit goal; treated non-empty outcome as complete.',
    hallucinated: false
  };
}

function useLocalJudgeModel(model: string, apiKey?: string): boolean {
  return model === 'scripted' || model === 'mock' || model === 'local' || !apiKey;
}

async function postJsonJudge(
  input: { model: string; baseUrl?: string; apiKey?: string },
  judgePrompt: string
): Promise<Record<string, unknown>> {
  const baseUrl = (input.baseUrl ?? process.env.KIT_EVAL_BASE_URL ?? 'https://api.openai.com/v1').replace(
    /\/$/,
    ''
  );
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${input.apiKey}`
    },
    body: JSON.stringify({
      model: input.model,
      messages: [{ role: 'user', content: judgePrompt }],
      temperature: 0,
      response_format: { type: 'json_object' }
    })
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Judge provider error ${res.status}: ${body.slice(0, 400)}`);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content ?? '{}';
  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function runLlmJudge(input: {
  prompt: string;
  toolOutput: unknown;
  agentResponse: string;
  model: string;
  baseUrl?: string;
  apiKey?: string;
}): Promise<JudgeVerdict> {
  if (useLocalJudgeModel(input.model, input.apiKey)) {
    return localJudge(input);
  }

  const parsed = await postJsonJudge(input, buildJudgePrompt(input));
  const score = String(parsed.score ?? 'FAIL').toUpperCase() === 'PASS' ? 'PASS' : 'FAIL';
  return {
    score,
    reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : '',
    hallucinated: score === 'FAIL'
  };
}

export async function runCriteriaJudge(input: {
  prompt: string;
  toolOutput: unknown;
  agentResponse: string;
  toolCalls?: AgentToolCall[];
  criteria: string[];
  threshold?: number;
  model: string;
  baseUrl?: string;
  apiKey?: string;
}): Promise<CriteriaJudgeVerdict> {
  const threshold = input.threshold ?? 1;
  if (!input.criteria.length) {
    return {
      score: 0,
      passed: false,
      reasoning: 'criteria_judge metric missing criteria',
      results: []
    };
  }

  if (useLocalJudgeModel(input.model, input.apiKey)) {
    return localCriteriaJudge(input);
  }

  const parsed = await postJsonJudge(input, buildCriteriaJudgePrompt(input));
  const rawResults = Array.isArray(parsed.results) ? parsed.results : [];
  const results = input.criteria.map((criterion, i) => {
    const row = rawResults[i] as { pass?: boolean; reason?: string; criterion?: string } | undefined;
    return {
      criterion,
      pass: row?.pass === true,
      reason: typeof row?.reason === 'string' ? row.reason : row?.pass ? 'ok' : 'failed'
    };
  });
  const passedCount = results.filter((r) => r.pass).length;
  const score =
    typeof parsed.score === 'number' && Number.isFinite(parsed.score)
      ? Math.min(1, Math.max(0, parsed.score))
      : results.length === 0
        ? 0
        : passedCount / results.length;
  const passed = score + 1e-9 >= threshold;
  const failed = results.filter((r) => !r.pass).map((r) => r.criterion);
  return {
    score,
    passed,
    reasoning: passed
      ? `Criteria score ${score.toFixed(2)} >= ${threshold}`
      : `Failed criteria: ${failed.join('; ') || '(none)'}; score ${score.toFixed(2)} < ${threshold}`,
    results
  };
}

export async function runTaskCompletionJudge(input: {
  prompt: string;
  goal?: string;
  expectTool?: string;
  expectTools?: string[];
  noTool?: boolean;
  toolCalls: AgentToolCall[];
  toolOutput: unknown;
  agentResponse: string;
  model: string;
  baseUrl?: string;
  apiKey?: string;
}): Promise<JudgeVerdict> {
  if (useLocalJudgeModel(input.model, input.apiKey)) {
    return localTaskCompletion(input);
  }

  const goal =
    input.goal ??
    (input.noTool
      ? 'Answer without calling tools'
      : input.expectTools?.length
        ? `Complete tool plan: ${input.expectTools.join(' → ')}`
        : input.expectTool
          ? `Use tool ${input.expectTool} to satisfy the user`
          : input.prompt);

  const parsed = await postJsonJudge(
    input,
    buildTaskCompletionPrompt({
      prompt: input.prompt,
      goal,
      toolCalls: input.toolCalls,
      toolOutput: input.toolOutput,
      agentResponse: input.agentResponse
    })
  );
  const score = String(parsed.score ?? 'FAIL').toUpperCase() === 'PASS' ? 'PASS' : 'FAIL';
  return {
    score,
    reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : '',
    hallucinated: false
  };
}

export function toolOutputFromResponse(
  response: AgentResponse,
  fallback: unknown
): unknown {
  return fallback ?? null;
}
