import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { gitHooksDir, kitRootFrom, projectCursorDir, resolveRepoDir, userCursorDir } from './paths.js';

describe('kitRootFrom', () => {
  it('walks up from this module to bin/kit.ts', () => {
    const root = kitRootFrom(import.meta.url);
    assert.equal(fs.existsSync(path.join(root, 'bin', 'kit.ts')), true);
    assert.equal(fs.existsSync(path.join(root, 'package.json')), true);
  });
});

describe('resolveRepoDir', () => {
  it('honors REPO_DIR when set', () => {
    const prev = process.env.REPO_DIR;
    process.env.REPO_DIR = '/tmp/kit-repo-override';
    try {
      assert.equal(resolveRepoDir(import.meta.url), '/tmp/kit-repo-override');
    } finally {
      if (prev === undefined) delete process.env.REPO_DIR;
      else process.env.REPO_DIR = prev;
    }
  });
});

describe('cursor and git install paths', () => {
  it('defaults Cursor config and git hooks to the host layout', () => {
    assert.equal(userCursorDir('/Users/me'), path.join('/Users/me', '.cursor'));
    assert.equal(projectCursorDir('/app'), path.join('/app', '.cursor'));
    assert.equal(gitHooksDir('/app/.git'), path.join('/app', '.git', 'hooks'));
  });
});
