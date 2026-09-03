import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { originNameWithOwnerFromGitConfig } from './fs.js';

describe('originNameWithOwnerFromGitConfig', () => {
  it('parses ssh and https GitHub remotes', () => {
    assert.equal(
      originNameWithOwnerFromGitConfig('[remote "origin"]\n\turl = git@github.com:me/app.git\n'),
      'me/app'
    );
    assert.equal(
      originNameWithOwnerFromGitConfig('[remote "origin"]\n\turl = https://github.com/me/app.git\n'),
      'me/app'
    );
  });
});
