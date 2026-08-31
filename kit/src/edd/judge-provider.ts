/**
 * Driven port: complete a judge prompt via an OpenAI-compatible chat API.
 * Implemented by infrastructure; domain judges stay pure.
 */
export type JudgeCompletionPort = (input: {
  model: string;
  baseUrl?: string;
  apiKey: string;
  prompt: string;
}) => Promise<Record<string, unknown>>;

/**
 * OpenAI-compatible `/chat/completions` adapter for LLM-as-judge calls.
 */
export const openAiCompatibleJudgeCompletion: JudgeCompletionPort = async (input) => {
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
      messages: [{ role: 'user', content: input.prompt }],
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
};
