/**
 * Shadow-eval runner: sample production turns, judge asynchronously, promote fails to JSONL.
 */

import { productionTraceToJsonl } from './dataset.js';
import { localJudge } from './judge.js';
import { emitAgentSpan, shouldShadowEval, type OtelEmitter, type OtelSpan } from './otel.js';
import { EvalCaseSchema, type AgentToolCall, type EvalCase, type HistoryTurn } from './schema.js';

export interface ProdTurn {
  id: string;
  prompt: string;
  toolCalls?: AgentToolCall[];
  toolOutput?: unknown;
  agentResponse?: string;
  history?: HistoryTurn[];
  expect?: EvalCase['expect'];
  tags?: string[];
  latencyMs?: number;
  tokens?: number;
  routingConfidence?: number;
}

export interface ShadowEvalResult {
  id: string;
  sampled: boolean;
  passed?: boolean;
  hallucinated?: boolean;
  reasoning?: string;
  /** Present when sampled and judge failed - ready to append to a dataset. */
  jsonl?: string;
  case?: EvalCase;
}

export interface ShadowEvalOptions {
  sampleRate?: number;
  rand?: () => number;
  otel?: OtelEmitter;
  /** Override judge (defaults to localJudge). */
  judge?: (input: {
    prompt: string;
    toolOutput: unknown;
    agentResponse: string;
  }) => { score: 'PASS' | 'FAIL'; hallucinated?: boolean; reasoning: string };
}

function parseToolPayload(raw: unknown): AgentToolCall[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((c) => {
      const row = c as { name?: string; arguments?: string | Record<string, unknown> };
      return { name: String(row.name ?? ''), arguments: row.arguments ?? {} };
    });
  }
  if (typeof raw === 'string') {
    try {
      return parseToolPayload(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Accept either a ProdTurn or a kit-shaped OTel span (plus optional judge fields).
 */
export function normalizeProdTurn(raw: unknown): ProdTurn {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Shadow turn must be a JSON object');
  }
  const obj = raw as Record<string, unknown>;

  // Kit OTel span shape from emitAgentSpan
  if (obj.attributes && typeof obj.attributes === 'object' && !Array.isArray(obj.attributes)) {
    const attrs = obj.attributes as Record<string, unknown>;
    const prompt = String(attrs['kit.prompt'] ?? obj.prompt ?? '');
    if (!prompt) throw new Error('OTel span missing kit.prompt (or prompt)');
    const id = String(
      attrs['kit.case_id'] || obj.id || (typeof obj.spanId === 'string' ? obj.spanId : '') || `span-${Date.now()}`
    );
    return {
      id,
      prompt,
      toolCalls: parseToolPayload(attrs['kit.tool_payload'] ?? obj.tool_calls ?? obj.toolCalls),
      toolOutput: obj.tool_output ?? obj.toolOutput,
      agentResponse: String(obj.agent_response ?? obj.agentResponse ?? ''),
      history: obj.history as HistoryTurn[] | undefined,
      expect: obj.expect as EvalCase['expect'] | undefined,
      tags: Array.isArray(obj.tags) ? (obj.tags as string[]) : undefined,
      latencyMs: Number(attrs['kit.latency_ms'] ?? obj.latencyMs ?? 0),
      tokens: Number(attrs['kit.tokens'] ?? obj.tokens ?? 0),
      routingConfidence: Number(attrs['kit.routing_confidence'] ?? obj.routingConfidence ?? 0)
    };
  }

  const prompt = String(obj.prompt ?? '');
  const id = String(obj.id ?? '');
  if (!id || !prompt) throw new Error('Prod turn must include id and prompt');
  return {
    id,
    prompt,
    toolCalls: parseToolPayload(obj.tool_calls ?? obj.toolCalls),
    toolOutput: obj.tool_output ?? obj.toolOutput,
    agentResponse: obj.agent_response != null || obj.agentResponse != null
      ? String(obj.agent_response ?? obj.agentResponse)
      : undefined,
    history: obj.history as HistoryTurn[] | undefined,
    expect: obj.expect as EvalCase['expect'] | undefined,
    tags: Array.isArray(obj.tags) ? (obj.tags as string[]) : undefined,
    latencyMs: obj.latencyMs != null ? Number(obj.latencyMs) : undefined,
    tokens: obj.tokens != null ? Number(obj.tokens) : undefined,
    routingConfidence: obj.routingConfidence != null ? Number(obj.routingConfidence) : undefined
  };
}

/** Convert a kit OtelSpan (or attributes bag) into OTLP/HTTP JSON for any collector. */
export function kitSpanToOtlpJson(span: OtelSpan, serviceName = 'kit-edd'): Record<string, unknown> {
  const attributes = Object.entries(span.attributes).map(([key, value]) => {
    if (typeof value === 'boolean') return { key, value: { boolValue: value } };
    if (typeof value === 'number') {
      return Number.isInteger(value)
        ? { key, value: { intValue: String(value) } }
        : { key, value: { doubleValue: value } };
    }
    return { key, value: { stringValue: String(value) } };
  });
  return {
    resourceSpans: [
      {
        resource: {
          attributes: [{ key: 'service.name', value: { stringValue: serviceName } }]
        },
        scopeSpans: [
          {
            scope: { name: 'kit.edd', version: '1' },
            spans: [
              {
                traceId: span.traceId,
                spanId: span.spanId,
                name: span.name,
                kind: 1,
                startTimeUnixNano: span.startTimeUnixNano,
                endTimeUnixNano: span.endTimeUnixNano,
                attributes,
                status: {
                  code: span.attributes['kit.passed'] === false ? 2 : 1
                }
              }
            ]
          }
        ]
      }
    ]
  };
}

/**
 * Sample + judge one production turn. Does not judge when not sampled.
 */
export function shadowEvalTurn(turn: ProdTurn, options: ShadowEvalOptions = {}): ShadowEvalResult {
  const sampleRate = options.sampleRate ?? 0.05;
  const judge = options.judge ?? localJudge;

  emitAgentSpan(options.otel, {
    caseId: turn.id,
    prompt: turn.prompt,
    toolCalls: turn.toolCalls ?? [],
    latencyMs: turn.latencyMs ?? 0,
    tokens: turn.tokens ?? 0,
    routingConfidence: turn.routingConfidence,
    passed: undefined
  });

  if (!shouldShadowEval(sampleRate, options.rand)) {
    return { id: turn.id, sampled: false };
  }

  const agentResponse = turn.agentResponse ?? '';
  const toolOutput = turn.toolOutput ?? null;
  const verdict = judge({
    prompt: turn.prompt,
    toolOutput,
    agentResponse
  });
  const passed = verdict.score === 'PASS';

  if (passed) {
    return {
      id: turn.id,
      sampled: true,
      passed: true,
      hallucinated: verdict.hallucinated,
      reasoning: verdict.reasoning
    };
  }

  const jsonl = productionTraceToJsonl({
    id: `shadow-${turn.id}`,
    prompt: turn.prompt,
    history: turn.history,
    tags: turn.tags,
    expect: turn.expect,
    reason: 'shadow_fail'
  });
  const parsed = EvalCaseSchema.parse(JSON.parse(jsonl));
  return {
    id: turn.id,
    sampled: true,
    passed: false,
    hallucinated: verdict.hallucinated,
    reasoning: verdict.reasoning,
    jsonl,
    case: parsed
  };
}

export function shadowEvalTurns(
  turns: ProdTurn[],
  options: ShadowEvalOptions = {}
): { results: ShadowEvalResult[]; fails: EvalCase[]; sampled: number; failed: number } {
  const results: ShadowEvalResult[] = [];
  const fails: EvalCase[] = [];
  let sampled = 0;
  let failed = 0;
  for (const turn of turns) {
    const result = shadowEvalTurn(turn, options);
    results.push(result);
    if (result.sampled) sampled += 1;
    if (result.case) {
      failed += 1;
      fails.push(result.case);
    }
  }
  return { results, fails, sampled, failed };
}
