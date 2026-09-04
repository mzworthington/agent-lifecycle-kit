import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  FREEZE_EXPAND_KILL,
  FROZEN_GENERATE_BASELINE,
  compareMissRates,
  compareMissRatesFromRepo,
  formatCompareMissRates,
  formatMissRate,
  generateNamesOutsideFreezeBaseline,
  isFromTraceCase,
  skillPickerMiss,
  specialistLaunchMiss
} from './compare_miss_rates.js';
import type { EvalCase } from './schema.js';

const kitRoot = fileURLToPath(new URL('../../..', import.meta.url));

const slogan = 'Freeze this generate list if auto-delegation is worse than today\'s skill picker.';

function fromTrace(partial: Pick<EvalCase, 'id' | 'prompt'> & Partial<EvalCase>): EvalCase {
  return {
    tags: ['prod-derived', 'circuit_breaker'],
    ...partial
  };
}

describe('compareMissRates', () => {
  it('reports not-enough instead of a fake 0% specialist win when there are no from-trace cases', () => {
    const result = compareMissRates({
      specialistCases: [
        {
          id: 'seed-01',
          prompt: 'CI failed on main. Isolate the failed GitHub Actions logs.',
          tags: ['seed', 'routing'],
          expect: { tool: 'launch_specialist', arguments_contains: { specialist: 'agent-debug' } }
        }
      ],
      skillPickerCases: [{ prompt: 'Write gherkin for export', targetSkill: 'agent-spec' }],
      skills: [{ name: 'agent-spec', triggers: ['gherkin'] }],
      catalogExpandKill: slogan
    });
    assert.equal(result.decision, 'not-enough');
    assert.equal(result.specialist.n, 0);
    assert.equal(result.specialist.rate, null);
    assert.equal(formatMissRate(result.specialist), 'not-enough');
    assert.match(formatCompareMissRates(result), /not-enough \(0 from-trace cases/);
    assert.doesNotMatch(formatCompareMissRates(result), /specialist-launch: 0\.0%/);
    assert.equal(result.expandKillLine, slogan);
    assert.match(result.expandKillLine, /skill picker/i);
  });

  it('freezes when specialist-launch miss rate is worse than the skill-picker', () => {
    const result = compareMissRates({
      specialistCases: [
        fromTrace({
          id: 'trace-miss',
          prompt: 'Please isolate the noisy CI logs from last night.',
          expect: { tool: 'launch_specialist', arguments_contains: { specialist: 'agent-debug' } }
        }),
        fromTrace({
          id: 'trace-hit',
          prompt: 'CI failed on main. Isolate the failed GitHub Actions logs.',
          expect: { tool: 'launch_specialist', arguments_contains: { specialist: 'agent-debug' } }
        })
      ],
      skillPickerCases: [
        { prompt: 'Write gherkin for export', targetSkill: 'agent-spec' },
        { prompt: 'Another gherkin pass', targetSkill: 'agent-spec' }
      ],
      skills: [{ name: 'agent-spec', triggers: ['gherkin'] }],
      catalogExpandKill: `${slogan} Fix thin handovers before adding roles.`
    });
    assert.equal(result.specialist.n, 2);
    assert.equal(result.specialist.misses, 1);
    assert.equal(result.skillPicker.misses, 0);
    assert.equal(result.skillPicker.n, 2);
    assert.equal(result.decision, 'freeze');
    assert.equal(result.expandKillLine, FREEZE_EXPAND_KILL);
    assert.match(result.expandKillLine, /^Freeze /);
    assert.doesNotMatch(result.expandKillLine, /add a role|adding roles/i);
    assert.match(formatCompareMissRates(result), /specialist-launch: 50\.0% \(1\/2\)/);
    assert.match(formatCompareMissRates(result), /skill-picker: 0\.0% \(0\/2\)/);
  });

  it('holds when specialist-launch is not worse than the skill-picker', () => {
    const result = compareMissRates({
      specialistCases: [
        fromTrace({
          id: 'trace-hit',
          prompt: 'CI failed on main. Isolate the failed GitHub Actions logs.',
          expect: { tool: 'launch_specialist', arguments_contains: { specialist: 'agent-debug' } }
        })
      ],
      skillPickerCases: [{ prompt: 'hello there', targetSkill: 'agent-spec' }],
      skills: [{ name: 'agent-spec', triggers: ['gherkin'] }],
      catalogExpandKill: slogan
    });
    assert.equal(result.decision, 'hold');
    assert.equal(result.specialist.misses, 0);
    assert.equal(result.skillPicker.misses, 1);
    assert.equal(result.expandKillLine, slogan);
  });

  it('ignores requires-live from-trace rows so local compare stays honest', () => {
    const result = compareMissRates({
      specialistCases: [
        fromTrace({
          id: 'live',
          prompt: 'Please isolate the noisy CI logs from last night.',
          tags: ['prod-derived', 'requires-live'],
          expect: { tool: 'launch_specialist', arguments_contains: { specialist: 'agent-debug' } }
        })
      ],
      skillPickerCases: [{ prompt: 'Write gherkin', targetSkill: 'agent-spec' }],
      skills: [{ name: 'agent-spec', triggers: ['gherkin'] }],
      catalogExpandKill: slogan
    });
    assert.equal(result.decision, 'not-enough');
    assert.equal(result.specialist.n, 0);
  });
});

describe('compare helpers', () => {
  it('treats unlabeled prod-derived cases as specialist misses', () => {
    assert.equal(
      specialistLaunchMiss({ id: 'bare', prompt: 'something vague', tags: ['prod-derived'] }),
      true
    );
    assert.equal(isFromTraceCase({ id: 'seed', prompt: 'x', tags: ['seed'] }), false);
  });

  it('counts a skill-picker miss when no trigger wins the target', () => {
    assert.equal(skillPickerMiss('hello', 'agent-spec', [{ name: 'agent-spec', triggers: ['gherkin'] }]), true);
    assert.equal(
      skillPickerMiss('write gherkin', 'agent-spec', [{ name: 'agent-spec', triggers: ['gherkin'] }]),
      false
    );
  });

  it('names generate entries outside the published seven', () => {
    assert.deepEqual(generateNamesOutsideFreezeBaseline(['agent-tdd', 'agent-copy']), ['agent-copy']);
    assert.equal(FROZEN_GENERATE_BASELINE.length, 7);
  });
});

describe('compareMissRatesFromRepo', () => {
  it('reads the kit host-subagent dataset and reports not-enough today', () => {
    const result = compareMissRatesFromRepo(kitRoot, slogan);
    assert.equal(result.decision, 'not-enough');
    assert.equal(result.specialist.rate, null);
    assert.ok(result.skillPicker.n > 0);
    assert.match(formatCompareMissRates(result), /not-enough/);
  });

  it('loads from-trace JSONL and the routing matrix from a tree', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-compare-'));
    fs.mkdirSync(path.join(root, 'evals/edd'), { recursive: true });
    fs.mkdirSync(path.join(root, 'evals/suites'), { recursive: true });
    fs.mkdirSync(path.join(root, 'skills/agent-spec'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'evals/edd/subagent_routing.jsonl'),
      `${JSON.stringify({
        id: 'trace-miss',
        prompt: 'Please isolate the noisy CI logs from last night.',
        tags: ['prod-derived'],
        expect: { tool: 'launch_specialist', arguments_contains: { specialist: 'agent-debug' } }
      })}\n`
    );
    fs.writeFileSync(
      path.join(root, 'evals/suites/routing-matrix.json'),
      JSON.stringify({
        suite: 'routing-matrix',
        test_cases: [{ id: 'r1', prompt: 'Write gherkin for export', target_skill: 'agent-spec' }]
      })
    );
    fs.writeFileSync(
      path.join(root, 'skills/agent-spec/SKILL.md'),
      '---\nname: agent-spec\ntriggers:\n  - gherkin\n---\n'
    );
    const result = compareMissRatesFromRepo(root, slogan);
    assert.equal(result.decision, 'freeze');
    assert.equal(result.specialist.rate, 1);
    assert.equal(result.skillPicker.rate, 0);
  });
});
