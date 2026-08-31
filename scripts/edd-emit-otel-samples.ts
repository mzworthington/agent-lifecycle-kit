#!/usr/bin/env node
/**
 * Emit kit-shaped sample spans to otelop via OTLP/HTTP JSON (port 4318).
 * Usage: node --import tsx/esm scripts/edd-emit-otel-samples.ts
 *        mise run edd:emit-spans
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { emitAgentSpan, type OtelSpan } from '../kit/src/edd/otel.js';
import { kitSpanToOtlpJson } from '../kit/src/edd/shadow.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const endpoint =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.replace(/\/$/, '') || 'http://127.0.0.1:4318';
const tracesUrl = endpoint.includes('/v1/traces') ? endpoint : `${endpoint}/v1/traces`;

async function postSpan(span: OtelSpan): Promise<void> {
  const body = kitSpanToOtlpJson(span);
  const res = await fetch(tracesUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OTLP export failed ${res.status}: ${text}`);
  }
}

async function main(): Promise<void> {
  const fixturePath = path.join(repoRoot, 'evals/edd/examples/otel-agent-loop.json');
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as {
    attributes: Record<string, string | number | boolean>;
    prompt?: string;
  };

  const spans: OtelSpan[] = [];
  const collector = (span: OtelSpan) => {
    spans.push(span);
  };

  // Replay fixture attributes through emitAgentSpan so field names stay canonical.
  emitAgentSpan(collector, {
    suite: String(fixture.attributes['kit.suite'] ?? 'prod'),
    caseId: String(fixture.attributes['kit.case_id'] ?? 'sample'),
    prompt: String(fixture.attributes['kit.prompt'] ?? fixture.prompt ?? ''),
    toolCalls: JSON.parse(String(fixture.attributes['kit.tool_payload'] ?? '[]')),
    routingConfidence: Number(fixture.attributes['kit.routing_confidence'] ?? 0),
    latencyMs: Number(fixture.attributes['kit.latency_ms'] ?? 0),
    tokens: Number(fixture.attributes['kit.tokens'] ?? 0),
    passed: Boolean(fixture.attributes['kit.passed'])
  });

  // A second healthy sample for contrast in the UI.
  emitAgentSpan(collector, {
    suite: 'prod',
    caseId: 'prod-ok-01',
    prompt: 'List payment-api dependencies.',
    toolCalls: [
      { name: 'read_architecture_yaml', arguments: { componentId: 'payment-api' } }
    ],
    routingConfidence: 0.93,
    latencyMs: 380,
    tokens: 140,
    passed: true
  });

  for (const span of spans) {
    await postSpan(span);
    console.log(`emitted ${span.name} case=${span.attributes['kit.case_id']} -> ${tracesUrl}`);
  }
  console.log(`Open otelop UI: http://127.0.0.1:4319`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
