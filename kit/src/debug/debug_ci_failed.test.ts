import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { debugCiFailed, parseDebugCiArgs } from './debug_ci_failed.js';

describe('parseDebugCiArgs', () => {
  it('applies defaults', () => {
    assert.deepEqual(parseDebugCiArgs([]), {
      runId: '',
      workflow: '',
      branch: '',
      limit: '1',
      repo: '',
      help: false
    });
  });

  it('parses flags including help', () => {
    assert.deepEqual(
      parseDebugCiArgs(['--run', '99', '--workflow', 'CI', '--branch', 'main', '--limit', '5', '--repo', 'org/kit']),
      { runId: '99', workflow: 'CI', branch: 'main', limit: '5', repo: 'org/kit', help: false }
    );
    assert.equal(parseDebugCiArgs(['--help']).help, true);
    assert.equal(parseDebugCiArgs(['-h']).help, true);
  });

  it('throws on unknown args', () => {
    assert.throws(() => parseDebugCiArgs(['--nope']), /Unknown arg: --nope/);
  });
});

describe('debugCiFailed', () => {
  it('prints usage and returns 0 for --help', () => {
    assert.equal(debugCiFailed(['--help']), 0);
  });

  it('returns 2 for unknown args', () => {
    assert.equal(debugCiFailed(['--nope']), 2);
  });
});
