import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ghSkillPinArgs } from './skill_pin.js';

describe('ghSkillPinArgs', () => {
  it('omits --pin for latest so gh skill uses tagged release then HEAD', () => {
    assert.deepEqual(ghSkillPinArgs(''), []);
    assert.deepEqual(ghSkillPinArgs('latest'), []);
    assert.deepEqual(ghSkillPinArgs('LATEST'), []);
    assert.deepEqual(ghSkillPinArgs('*'), []);
  });

  it('passes version pins as refs/tags so gh skill does not treat them as commit SHAs', () => {
    assert.deepEqual(ghSkillPinArgs('v1.0.0'), ['--pin', 'refs/tags/v1.0.0']);
    assert.deepEqual(ghSkillPinArgs('1.2.3'), ['--pin', 'refs/tags/1.2.3']);
  });

  it('keeps fully qualified refs and commit SHAs unchanged', () => {
    assert.deepEqual(ghSkillPinArgs('refs/tags/v2.0.0'), ['--pin', 'refs/tags/v2.0.0']);
    assert.deepEqual(ghSkillPinArgs('refs/heads/main'), ['--pin', 'refs/heads/main']);
    const sha = 'f96bff754e428838818017f75817f0f9428acd48';
    assert.deepEqual(ghSkillPinArgs(sha), ['--pin', sha]);
  });
});
