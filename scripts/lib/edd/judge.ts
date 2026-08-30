import type { AgentResponse } from './schema.js';

export const JUDGE_PROMPT_TEMPLATE = `You are an impartial technical evaluator grading an AI agent's response.

[User Prompt]: {prompt}
[Tool Output Provided to Agent]: {tool_output}
[Agent's Final Response]: {agent_response}

Evaluate the Agent's Final Response based on the following criteria:
1. Accuracy: Does the response accurately reflect the Tool Output?
2. Hallucination: Did the agent invent any architectural details, dependencies, or components not present in the Tool Output?
3. Tone: Is the response concise and professional?

Score the response as PASS or FAIL. You must output a JSON object with exactly two keys: "score" (PASS/FAIL) and "reasoning" (a brief explanation).`;

export interface JudgeVerdict {
  score: 'PASS' | 'FAIL';
  reasoning: string;
  hallucinated: boolean;
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

  // Require at least one token from tool output to appear when tool output is an object with keys
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

export async function runLlmJudge(input: {
  prompt: string;
  toolOutput: unknown;
  agentResponse: string;
  model: string;
  baseUrl?: string;
  apiKey?: string;
}): Promise<JudgeVerdict> {
  const useLocal =
    input.model === 'scripted' ||
    input.model === 'mock' ||
    input.model === 'local' ||
    !input.apiKey;

  if (useLocal) {
    return localJudge(input);
  }

  const judgePrompt = buildJudgePrompt(input);
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
  let parsed: { score?: string; reasoning?: string };
  try {
    parsed = JSON.parse(content) as { score?: string; reasoning?: string };
  } catch {
    return {
      score: 'FAIL',
      reasoning: 'Judge returned non-JSON output',
      hallucinated: true
    };
  }

  const score = String(parsed.score ?? 'FAIL').toUpperCase() === 'PASS' ? 'PASS' : 'FAIL';
  return {
    score,
    reasoning: parsed.reasoning ?? '',
    hallucinated: score === 'FAIL'
  };
}

export function toolOutputFromResponse(
  response: AgentResponse,
  fallback: unknown
): unknown {
  return fallback ?? null;
}
