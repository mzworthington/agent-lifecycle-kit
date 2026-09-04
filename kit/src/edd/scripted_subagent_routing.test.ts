import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  extractHandoverPaths,
  launchArgsForPrompt,
  matchAllowlistedSpecialist,
  skillsOnlyContent
} from './scripted_subagent_routing.js';

describe('scripted_subagent_routing', () => {
  it('extracts handover paths that appear in the prompt', () => {
    assert.deepEqual(
      extractHandoverPaths('Review. Handover path handover/demo/handover_tdd.md'),
      ['handover/demo/handover_tdd.md']
    );
  });

  it('matches allowlisted specialists from intents', () => {
    assert.equal(matchAllowlistedSpecialist('Fix a typo in the README.'), null);
    assert.equal(
      matchAllowlistedSpecialist('Write Gherkin for the signed-off stories. Sequential spec specialist.'),
      'agent-spec'
    );
    assert.equal(
      matchAllowlistedSpecialist('Independent hexagonal architecture-drift audit of this PR. Readonly.'),
      'agent-arch-drift'
    );
    assert.equal(
      matchAllowlistedSpecialist('Spec handover is COMPLETE. Launch the TDD short loop.'),
      'agent-tdd'
    );
  });

  it('only puts handoverPaths on launch args when the prompt names them', () => {
    const missing = launchArgsForPrompt('CI failed on main. Isolate the failed GitHub Actions logs.');
    assert.equal(missing?.specialist, 'agent-debug');
    assert.equal(missing?.handoverPaths, undefined);
    const present = launchArgsForPrompt(
      'Review the PR as an independent audit. Handover path handover/demo/handover_tdd.md'
    );
    assert.deepEqual(present?.handoverPaths, ['handover/demo/handover_tdd.md']);
    assert.equal(present?.class, 'review');
  });

  it('names the SKILL.md path in skills-only content', () => {
    assert.match(skillsOnlyContent('agent-debug'), /skills\/agent-debug\/SKILL.md/);
  });
});
