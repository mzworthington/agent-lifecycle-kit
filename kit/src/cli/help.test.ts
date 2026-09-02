import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { KIT_HELP } from './help.js';

describe('KIT_HELP', () => {
  it('lists EDD shadow, profile directory, and site assemble build prerequisite', () => {
    assert.match(KIT_HELP, /run\|watch\|report\|ci\|shadow\|dataset/);
    assert.match(KIT_HELP, /skill-trigger evals/);
    assert.match(KIT_HELP, /mcps\/profiles\//);
    assert.match(KIT_HELP, /site assemble[\s\S]*web build first/);
    assert.doesNotMatch(KIT_HELP, /default, collab, ops/);
    assert.doesNotMatch(KIT_HELP, /live trigger/i);
  });
});
