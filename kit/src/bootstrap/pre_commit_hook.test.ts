import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const repoDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

describe('husky pre-commit', () => {
  it('runs TypeScript typecheck so tsc failures cannot skip the hook', () => {
    const hook = fs.readFileSync(path.join(repoDir, '.husky/pre-commit'), 'utf8');
    assert.match(hook, /pnpm typecheck/);
    assert.match(hook, /web" && pnpm typecheck/);
  });

  it('parses published mermaid fences so invalid sequence diagrams fail before CI', () => {
    const hook = fs.readFileSync(path.join(repoDir, '.husky/pre-commit'), 'utf8');
    assert.match(hook, /web" && pnpm test:mermaid/);
  });

  it('fails the always-on context budget before push, not only in kit check CI', () => {
    const hook = fs.readFileSync(path.join(repoDir, '.husky/pre-commit'), 'utf8');
    assert.match(hook, /bin\/kit" measure-context/);
  });
});

describe('husky commit-msg', () => {
  it('checks the commit subject with wk commit-msg', () => {
    const hook = fs.readFileSync(path.join(repoDir, '.husky/commit-msg'), 'utf8');
    assert.match(hook, /bin\/kit" commit-msg/);
  });
});
