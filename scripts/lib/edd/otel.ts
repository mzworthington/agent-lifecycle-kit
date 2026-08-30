/**
 * Lightweight OpenTelemetry-shaped span emitter for agentic loops.
 * Shares field names with eval datasets so prod traces can be converted to JSONL.
 */

export interface AgentSpanAttributes {
  suite?: string;
  caseId?: string;
  prompt: string;
  toolCalls: Array<{ name: string; arguments: string | Record<string, unknown> }>;
  routingConfidence?: number;
  latencyMs: number;
  tokens: number;
  passed?: boolean;
  toolName?: string;
}

export interface OtelSpan {
  name: string;
  traceId: string;
  spanId: string;
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  attributes: Record<string, string | number | boolean>;
}

export type OtelEmitter = (span: OtelSpan) => void;

function hexId(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return [...arr].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function emitAgentSpan(emitter: OtelEmitter | undefined, attrs: AgentSpanAttributes): OtelSpan {
  const start = BigInt(Date.now()) * 1_000_000n;
  const end = start + BigInt(Math.max(0, Math.round(attrs.latencyMs))) * 1_000_000n;
  const primaryTool = attrs.toolCalls[0]?.name ?? '';
  const span: OtelSpan = {
    name: 'agent.loop',
    traceId: hexId(16),
    spanId: hexId(8),
    startTimeUnixNano: start.toString(),
    endTimeUnixNano: end.toString(),
    attributes: {
      'kit.suite': attrs.suite ?? '',
      'kit.case_id': attrs.caseId ?? '',
      'kit.prompt': attrs.prompt,
      'kit.tool_name': primaryTool || (attrs.toolName ?? ''),
      'kit.tool_payload': JSON.stringify(attrs.toolCalls),
      'kit.routing_confidence': attrs.routingConfidence ?? 0,
      'kit.latency_ms': attrs.latencyMs,
      'kit.tokens': attrs.tokens,
      'kit.passed': attrs.passed ?? false
    }
  };
  emitter?.(span);
  return span;
}

export interface RoutingDriftSample {
  version: string;
  toolCounts: Record<string, number>;
}

/**
 * Alert when a tool's share of traffic drops sharply vs a baseline version.
 * Example: read_architecture_yaml 30% → 2% implies routing drift.
 */
export function detectRoutingDrift(input: {
  baseline: RoutingDriftSample;
  current: RoutingDriftSample;
  tool: string;
  /** Absolute percentage-point drop that triggers an alert (default 20). */
  dropThresholdPoints?: number;
}): { drifted: boolean; baselineShare: number; currentShare: number; message: string } {
  const dropThreshold = input.dropThresholdPoints ?? 20;
  const baselineTotal = Object.values(input.baseline.toolCounts).reduce((a, b) => a + b, 0) || 1;
  const currentTotal = Object.values(input.current.toolCounts).reduce((a, b) => a + b, 0) || 1;
  const baselineShare = ((input.baseline.toolCounts[input.tool] ?? 0) / baselineTotal) * 100;
  const currentShare = ((input.current.toolCounts[input.tool] ?? 0) / currentTotal) * 100;
  const drop = baselineShare - currentShare;
  const drifted = drop >= dropThreshold;
  return {
    drifted,
    baselineShare,
    currentShare,
    message: drifted
      ? `Routing drift: ${input.tool} fell from ${baselineShare.toFixed(1)}% (${input.baseline.version}) to ${currentShare.toFixed(1)}% (${input.current.version})`
      : `No significant drift for ${input.tool}`
  };
}

/** Shadow-eval sampling: select ~sampleRate of production interactions. */
export function shouldShadowEval(sampleRate = 0.05, rand: () => number = Math.random): boolean {
  return rand() < sampleRate;
}
