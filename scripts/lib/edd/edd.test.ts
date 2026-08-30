import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { EvalRunner } from './runner.js';
import { loadDataset, productionTraceToJsonl } from './dataset.js';
import { detectRoutingDrift, shouldShadowEval } from './otel.js';
import { localJudge } from './judge.js';
import { generateReport } from './telemetry.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoDir = path.resolve(here, '../../..');

describe('EDD EvalRunner', () => {
  it('passes architecture routing suite with scripted model', async () => {
    const runner = new EvalRunner({
      model: 'scripted',
      systemPromptPath: path.join(repoDir, 'evals/edd/system_prompt.md')
    });
    const report = await runner.runSuite(path.join(repoDir, 'evals/edd/architecture_routing.yaml'));
    assert.equal(report.failed, 0, report.results.filter((r) => !r.passed).map((r) => r.failures.join(',')).join(' | '));
    assert.ok(report.routingAccuracy >= 95);
  });

  it('passes self-correction suite', async () => {
    const runner = new EvalRunner({ model: 'scripted' });
    const report = await runner.runSuite(
      path.join(repoDir, 'evals/edd/architecture_self_correction.yaml')
    );
    assert.equal(report.failed, 0);
  });

  it('passes terminal fallback suite', async () => {
    const runner = new EvalRunner({ model: 'scripted' });
    const report = await runner.runSuite(path.join(repoDir, 'evals/edd/architecture_terminal.yaml'));
    assert.equal(report.failed, 0);
  });

  it('streams JSONL datasets', async () => {
    const cases = await loadDataset(path.join(repoDir, 'evals/edd/architecture_routing.jsonl'), [
      'routing'
    ]);
    assert.ok(cases.length >= 2);
    assert.ok(cases.every((c) => c.id && c.prompt));
  });

  it('converts production traces to JSONL', () => {
    const line = productionTraceToJsonl({
      id: 'prod-001',
      prompt: 'Show payment architecture',
      reason: 'circuit_breaker',
      history: [{ role: 'tool', content: '{"error":"Timeout"}' }]
    });
    const parsed = JSON.parse(line) as { tags: string[] };
    assert.ok(parsed.tags.includes('prod-derived'));
    assert.ok(parsed.tags.includes('circuit_breaker'));
  });

  it('detects routing drift', () => {
    const result = detectRoutingDrift({
      baseline: { version: '1.0', toolCounts: { read_architecture_yaml: 30, other: 70 } },
      current: { version: '1.1', toolCounts: { read_architecture_yaml: 2, other: 98 } },
      tool: 'read_architecture_yaml'
    });
    assert.equal(result.drifted, true);
  });

  it('samples shadow evals at ~5%', () => {
    let hits = 0;
    const n = 2000;
    let i = 0;
    const seq = Array.from({ length: n }, (_, idx) => idx / n);
    for (let k = 0; k < n; k++) {
      if (shouldShadowEval(0.05, () => seq[i++]!)) hits++;
    }
    assert.ok(hits >= 80 && hits <= 120, `hits=${hits}`);
  });

  it('local judge flags hallucinations', () => {
    const verdict = localJudge({
      prompt: 'Summarize architecture',
      toolOutput: { component: 'payment-api' },
      agentResponse: 'payment-api talks to the legacy-monolith and redis cluster'
    });
    assert.equal(verdict.score, 'FAIL');
    assert.equal(verdict.hallucinated, true);
  });

  it('writes markdown evaluation reports', async () => {
    const runner = new EvalRunner({ model: 'scripted' });
    const report = await runner.runSuite(path.join(repoDir, 'evals/edd/architecture_routing.yaml'));
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'edd-report-'));
    const written = generateReport([report], { format: 'md', outDir: dir });
    assert.ok(written.some((p) => p.endsWith('eval-report.md')));
    const md = fs.readFileSync(path.join(dir, 'eval-report.md'), 'utf8');
    assert.match(md, /EDD Evaluation Report/);
    assert.match(md, /Routing accuracy/);
  });
});
