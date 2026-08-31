import {
  buildCriteriaJudgePrompt,
  buildJudgePrompt,
  buildTaskCompletionPrompt,
  localCriteriaJudge,
  localJudge,
  localTaskCompletion,
  useLocalJudgeModel,
  type CriteriaJudgeVerdict,
  type JudgeVerdict
} from './judge.js';
import {
  openAiCompatibleJudgeCompletion,
  type JudgeCompletionPort
} from './judge-provider.js';
import type { AgentToolCall } from './schema.js';

export interface JudgeRuntimeOptions {
  model: string;
  baseUrl?: string;
  apiKey?: string;
  /** Defaults to the OpenAI-compatible HTTP adapter. */
  complete?: JudgeCompletionPort;
}

async function completeJudgeJson(
  options: JudgeRuntimeOptions,
  prompt: string
): Promise<Record<string, unknown>> {
  if (!options.apiKey) {
    return {};
  }
  const complete = options.complete ?? openAiCompatibleJudgeCompletion;
  return complete({
    model: options.model,
    baseUrl: options.baseUrl,
    apiKey: options.apiKey,
    prompt
  });
}

/** Application use-case: accuracy / hallucination judge (local or remote). */
export async function runLlmJudge(input: {
  prompt: string;
  toolOutput: unknown;
  agentResponse: string;
  model: string;
  baseUrl?: string;
  apiKey?: string;
  complete?: JudgeCompletionPort;
}): Promise<JudgeVerdict> {
  if (useLocalJudgeModel(input.model, input.apiKey)) {
    return localJudge(input);
  }

  const parsed = await completeJudgeJson(input, buildJudgePrompt(input));
  const score = String(parsed.score ?? 'FAIL').toUpperCase() === 'PASS' ? 'PASS' : 'FAIL';
  return {
    score,
    reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : '',
    hallucinated: score === 'FAIL'
  };
}

/** Application use-case: criteria judge with threshold (local or remote). */
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
  complete?: JudgeCompletionPort;
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

  const parsed = await completeJudgeJson(input, buildCriteriaJudgePrompt(input));
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

/** Application use-case: task completion (local or remote). */
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
  complete?: JudgeCompletionPort;
}): Promise<JudgeVerdict> {
  if (useLocalJudgeModel(input.model, input.apiKey)) {
    return localTaskCompletion(input);
  }

  const goal =
    input.goal ??
    (input.noTool
      ? 'Answer without calling tools'
      : input.expectTools?.length
        ? `Complete tool plan: ${input.expectTools.join(' -> ')}`
        : input.expectTool
          ? `Use tool ${input.expectTool} to satisfy the user`
          : input.prompt);

  const parsed = await completeJudgeJson(
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
