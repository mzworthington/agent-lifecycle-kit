import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SKILLS_ONLY_ENV, isSkillsOnlyMode } from './skills_only_mode.js';

describe('isSkillsOnlyMode', () => {
  it('is off when unset or explicitly disabled', () => {
    assert.equal(isSkillsOnlyMode({}), false);
    assert.equal(isSkillsOnlyMode({ [SKILLS_ONLY_ENV]: '' }), false);
    assert.equal(isSkillsOnlyMode({ [SKILLS_ONLY_ENV]: '0' }), false);
    assert.equal(isSkillsOnlyMode({ [SKILLS_ONLY_ENV]: 'false' }), false);
    assert.equal(isSkillsOnlyMode({ [SKILLS_ONLY_ENV]: 'off' }), false);
    assert.equal(isSkillsOnlyMode({ [SKILLS_ONLY_ENV]: 'NO' }), false);
  });

  it('is on for 1 / true / on / yes', () => {
    assert.equal(isSkillsOnlyMode({ [SKILLS_ONLY_ENV]: '1' }), true);
    assert.equal(isSkillsOnlyMode({ [SKILLS_ONLY_ENV]: 'true' }), true);
    assert.equal(isSkillsOnlyMode({ [SKILLS_ONLY_ENV]: 'ON' }), true);
    assert.equal(isSkillsOnlyMode({ [SKILLS_ONLY_ENV]: ' yes ' }), true);
  });
});
