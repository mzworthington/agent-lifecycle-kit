import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadDataset } from './dataset.js';
import { lintCases } from './dataset-hygiene.js';
import { EvalRunner } from './runner.js';
import { EDD_CI_SUITES } from '../quality/quality_gate.js';

const repoDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const goldensDir = path.join(repoDir, 'evals/edd/goldens');

function lintFile(rel: string): void {
  const abs = path.join(goldensDir, rel);
  const lines = fs.readFileSync(abs, 'utf8').split('\n');
  const rows: Array<{ line: number; raw: unknown }> = [];
  lines.forEach((text, i) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    rows.push({ line: i + 1, raw: JSON.parse(trimmed) });
  });
  const issues = lintCases(rows);
  assert.equal(issues.length, 0, issues.map((x) => `line ${x.line}: ${x.message}`).join('; '));
}

describe('architecture routing goldens', () => {
  it('is not part of kit check', () => {
    assert.ok(!EDD_CI_SUITES.some((s) => s.includes('goldens/')));
  });

  it('keeps a working set of 80 and a frozen holdout of 20', async () => {
    const working = await loadDataset(path.join(goldensDir, 'architecture_routing.jsonl'));
    const holdout = await loadDataset(path.join(goldensDir, 'architecture_routing.holdout.jsonl'));
    assert.equal(working.length, 80);
    assert.equal(holdout.length, 20);
    assert.ok(working.every((c) => (c.tags ?? []).includes('golden')));
    assert.ok(working.every((c) => (c.tags ?? []).includes('requires-live')));
    assert.ok(holdout.every((c) => (c.tags ?? []).includes('holdout')));
    assert.ok(holdout.every((c) => (c.tags ?? []).includes('requires-live')));
    const intents = new Set(
      working.flatMap((c) => (c.tags ?? []).filter((t) => t.startsWith('intent:')))
    );
    for (const intent of [
      'intent:lookup',
      'intent:db',
      'intent:multi-first',
      'intent:multi-each',
      'intent:chat',
      'intent:inject',
      'intent:recovery'
    ]) {
      assert.ok(intents.has(intent), `missing ${intent}`);
    }
    const prompts = new Set(working.map((c) => c.prompt));
    for (const c of holdout) {
      assert.ok(!prompts.has(c.prompt), `holdout collides with working: ${c.id}`);
    }
  });

  it('lints both JSONL files', () => {
    lintFile('architecture_routing.jsonl');
    lintFile('architecture_routing.holdout.jsonl');
  });

  it('skips every golden row on local style', async () => {
    const runner = new EvalRunner({
      model: 'scripted',
      systemPromptPath: path.join(repoDir, 'evals/edd/system_prompt.md')
    });
    const report = await runner.runSuite(path.join(goldensDir, 'architecture_routing.yaml'));
    assert.equal(report.total, 0);
    assert.equal(report.failed, 0);
  });
});
