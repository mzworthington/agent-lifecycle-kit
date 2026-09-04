import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateConventionalCommit } from './conventional.js';

describe('validateConventionalCommit', () => {
  it('accepts conventional subjects from the SOP', () => {
    for (const raw of [
      'feat(skills): add agent-debug skill',
      'feat(sops): route model class before tdd',
      'fix(cli): retry transient r2 errors',
      'docs: prefer mermaid over ascii diagrams',
      'chore: update .gitignore for env files',
      'feat(api)!: drop v1 export',
      'revert: undo broken mcp compose',
      'feat(skills): claim linear tickets (WAY-123)'
    ]) {
      const result = validateConventionalCommit(raw);
      assert.equal(result.ok, true, raw);
    }
  });

  it('reads the first non-comment line from a COMMIT_EDITMSG body', () => {
    const raw = [
      '',
      '# Please enter the commit message',
      'feat(cli): install commit-msg hook',
      '',
      'Longer body is free-form.',
      '# ------------------------ >8 ------------------------',
      'diff --git a/x b/x'
    ].join('\n');
    assert.equal(validateConventionalCommit(raw).ok, true);
  });

  it('skips git-generated merge and revert subjects', () => {
    assert.equal(validateConventionalCommit('Merge branch \'main\' into feat/hooks').ok, true);
    assert.equal(validateConventionalCommit('Revert "feat(cli): install commit-msg hook"').ok, true);
  });

  it('rejects free-form and docs-by-extension anti-patterns at the subject level', () => {
    const cases = [
      'Fixed the R2 issue',
      'Update gitignore',
      'Prefer Mermaid diagrams over ASCII art',
      'feat: Add Agent Debug Skill',
      'feat: add a trailing period.',
      'feat:',
      'wip: stash this',
      ''
    ];
    for (const raw of cases) {
      const result = validateConventionalCommit(raw);
      assert.equal(result.ok, false, raw);
      assert.match(result.error ?? '', /conventional/i);
    }
  });
});
