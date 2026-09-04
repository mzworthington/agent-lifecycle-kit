import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { KIT_HELP } from './help.js';

describe('KIT_HELP', () => {
  it('lists EDD shadow, profile directory, and site assemble build prerequisite', () => {
    assert.match(KIT_HELP, /run\|watch\|report\|ci\|shadow\|dataset/);
    assert.match(KIT_HELP, /skill-trigger evals/);
    assert.match(KIT_HELP, /mcps\/profiles\//);
    assert.match(KIT_HELP, /site assemble[\s\S]*web build first/);
    assert.match(KIT_HELP, /commit-msg/);
    assert.match(KIT_HELP, /doctor \[dir\]/);
    assert.match(KIT_HELP, /--mcp composes kit default/);
    assert.match(KIT_HELP, /completion <shell>/);
    assert.match(KIT_HELP, /completion install/);
    assert.match(KIT_HELP, /Day-to-day:/);
    assert.match(KIT_HELP, /Typo, bug, or failed CI/);
    assert.match(KIT_HELP, /wk align \./);
    assert.match(KIT_HELP, /wk version/);
    assert.match(KIT_HELP, /--owned --scan/);
    assert.match(KIT_HELP, /wk check/);
    assert.match(KIT_HELP, /mcp restore --project/);
    assert.match(KIT_HELP, /--json/);
    assert.match(KIT_HELP, /role SKILL\.md line budget/);
    assert.match(KIT_HELP, /Usage: wk <command>/);
    assert.match(KIT_HELP, /kit <command>/);
    assert.match(KIT_HELP, /agent-kit <command>/);
    assert.doesNotMatch(KIT_HELP, /default, collab, ops/);
    assert.doesNotMatch(KIT_HELP, /live trigger/i);
  });
});
