import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { evaluateOwnership, shouldInstallInitHooks, type RepoView } from './ownership.js';

function view(over: Partial<RepoView> = {}): RepoView {
  return {
    nameWithOwner: 'mzworthington/archlens',
    ownerLogin: 'mzworthington',
    isFork: false,
    isArchived: false,
    viewerPermission: 'ADMIN',
    ...over
  };
}

describe('evaluateOwnership', () => {
  it('treats admin and maintain sources as in scope', () => {
    assert.deepEqual(evaluateOwnership(view()), {
      inScope: true,
      reason: 'owned',
      nameWithOwner: 'mzworthington/archlens'
    });
    assert.equal(evaluateOwnership(view({ viewerPermission: 'MAINTAIN' })).inScope, true);
  });

  it('excludes forks, archived repos, and non-maintainers', () => {
    assert.equal(evaluateOwnership(view({ isFork: true })).reason, 'fork');
    assert.equal(evaluateOwnership(view({ isArchived: true })).reason, 'archived');
    assert.equal(evaluateOwnership(view({ viewerPermission: 'WRITE' })).reason, 'not-admin');
    assert.equal(evaluateOwnership(view({ viewerPermission: 'READ' })).inScope, false);
  });

  it('blocks write when GitHub metadata is missing', () => {
    assert.deepEqual(evaluateOwnership(undefined), {
      inScope: false,
      reason: 'github-unavailable',
      nameWithOwner: undefined
    });
  });

  it('still allows init --hook when GitHub is unavailable, not on forks', () => {
    assert.equal(shouldInstallInitHooks(evaluateOwnership(undefined), true), true);
    assert.equal(shouldInstallInitHooks(evaluateOwnership(view({ isFork: true })), true), false);
    assert.equal(shouldInstallInitHooks(evaluateOwnership(view()), false), false);
  });
});
