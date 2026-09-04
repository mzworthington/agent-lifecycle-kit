import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import {
  FREEZE_GENERATE_MAX,
  compareMissRates,
  formatMissRateCompare,
  freezeExpandKillLine
} from './miss_rate.js';

function writeTree(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-miss-rate-'));
  for (const [rel, body] of Object.entries(files)) {
    const full = path.join(root, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, body);
  }
  return root;
}

const seedJsonl = `{"id":"a","prompt":"x","tags":["seed"],"expect":{"no_tool":true}}
`;

describe('compareMissRates', () => {
  it('reports not-enough instead of a fake 0% when no prod-derived traces exist', () => {
    const root = writeTree({
      'evals/edd/subagent_routing.jsonl': seedJsonl,
      'evals/suites/routing-matrix.json': JSON.stringify({ test_cases: [{ id: 'EVAL-1' }] })
    });
    const cmp = compareMissRates(root);
    assert.equal(cmp.verdict, 'not-enough');
    assert.equal(cmp.specialist.enough, false);
    assert.equal(cmp.specialist.rate, null);
    assert.equal(cmp.picker.enough, false);
    assert.match(formatMissRateCompare(cmp), /not-enough/);
    assert.match(formatMissRateCompare(cmp), /^warn  eval miss-rate/);
    assert.doesNotMatch(formatMissRateCompare(cmp), /0\.0%/);
  });

  it('freezes when specialist prod-derived miss rate is higher than the skill picker', () => {
    const root = writeTree({
      'evals/edd/subagent_routing.jsonl': `${seedJsonl}{"id":"m","prompt":"y","tags":["prod-derived"],"expect":{"no_tool":true}}\n`,
      'evals/suites/routing-matrix.json': JSON.stringify({
        test_cases: [
          { id: 'EVAL-1' },
          { id: 'EVAL-2' },
          { id: 'EVAL-3', tags: ['prod-derived'] }
        ]
      })
    });
    const cmp = compareMissRates(root);
    assert.equal(cmp.specialist.prodDerived, 1);
    assert.equal(cmp.specialist.total, 2);
    assert.equal(cmp.picker.prodDerived, 1);
    assert.equal(cmp.picker.total, 3);
    assert.equal(cmp.verdict, 'freeze');
    assert.match(formatMissRateCompare(cmp), /^warn  eval miss-rate/);
    assert.match(freezeExpandKillLine(cmp, 'catalog line'), /Do not add a role/);
  });

  it('holds when specialist miss rate is not worse than the skill picker', () => {
    const root = writeTree({
      'evals/edd/subagent_routing.jsonl':
        '{"id":"m","prompt":"y","tags":["prod-derived"],"expect":{"no_tool":true}}\n{"id":"b","prompt":"z","tags":["seed"],"expect":{"no_tool":true}}\n',
      'evals/suites/routing-matrix.json': JSON.stringify({
        test_cases: [
          { id: 'EVAL-1', tags: ['prod-derived'] },
          { id: 'EVAL-2', tags: ['prod-derived'] }
        ]
      })
    });
    const cmp = compareMissRates(root);
    assert.equal(cmp.verdict, 'hold');
    assert.equal(freezeExpandKillLine(cmp, 'catalog line'), 'catalog line');
  });

  it('treats a missing dataset as not-enough', () => {
    const root = writeTree({});
    const cmp = compareMissRates(root);
    assert.equal(cmp.verdict, 'not-enough');
    assert.equal(cmp.specialist.total, 0);
  });

  it('pins freeze generate max at the current seven specialists', () => {
    assert.equal(FREEZE_GENERATE_MAX, 7);
  });
});
