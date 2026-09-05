import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import type { GitHubPort } from './github.js';
import type { RepoView } from './ownership.js';
import { runDoctor } from './run.js';

function write(root: string, rel: string, contents: string): void {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, contents, 'utf8');
}

function owned(name: string): RepoView {
  return {
    nameWithOwner: name,
    ownerLogin: name.split('/')[0] ?? 'me',
    isFork: false,
    isArchived: false,
    viewerPermission: 'ADMIN'
  };
}

describe('runDoctor', () => {
  it('requires gh login for --owned', () => {
    const github: GitHubPort = {
      currentUser: () => undefined,
      viewFromCwd: () => undefined,
      listSources: () => [],
      remoteFileExists: () => false
    };
    const result = runDoctor({
      targetDir: '/tmp',
      write: false,
      owned: true,
      scanDir: '/tmp',
      repoClass: undefined,
      installHook: false,
      login: undefined,
      kitRepoDir: '/tmp',
      github
    });
    assert.equal(result.ok, false);
    assert.match(result.error ?? '', /gh CLI/);
  });

  it('matches --scan clones, leaves uncloned remote-only, and does not write remotes', () => {
    const kit = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-doctor-kit-'));
    const scan = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-doctor-scan-'));
    const product = path.join(scan, 'app');
    fs.mkdirSync(product);
    write(product, 'README.md', 'hi\n');
    write(product, 'LICENSE', 'mit\n');

    const github: GitHubPort = {
      currentUser: () => 'me',
      viewFromCwd: () => undefined,
      listSources: () => [owned('me/app'), owned('me/remote')],
      remoteFileExists: (name, rel) => name === 'me/remote' && rel === 'README.md'
    };

    const result = runDoctor({
      targetDir: scan,
      write: false,
      owned: true,
      scanDir: scan,
      repoClass: undefined,
      installHook: false,
      login: 'me',
      kitRepoDir: kit,
      github,
      listWorktrees: () => [product],
      resolveOrigin: (dir) => (dir === product ? 'me/app' : undefined)
    });

    const cloned = result.reports.find((r) => r.label === 'me/app');
    const remote = result.reports.find((r) => r.label === 'me/remote');
    assert.equal(cloned?.remoteOnly, false);
    assert.equal(cloned?.targetDir, product);
    assert.equal(remote?.remoteOnly, true);
    assert.equal(remote?.plan.writes.length, 0);
    assert.ok(remote?.plan.findings.some((f) => f.relPath === 'LICENSE' && f.status === 'missing'));
    assert.equal(result.ok, false);
  });

  it('still reports missing community files when GitHub is unavailable on a local checkout', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-doctor-local-'));
    write(dir, 'README.md', 'hi\n');
    const github: GitHubPort = {
      currentUser: () => undefined,
      viewFromCwd: () => undefined,
      listSources: () => [],
      remoteFileExists: () => false
    };
    const result = runDoctor({
      targetDir: dir,
      write: false,
      owned: false,
      scanDir: undefined,
      repoClass: 'product',
      installHook: false,
      login: undefined,
      kitRepoDir: '/tmp',
      github
    });
    assert.equal(result.ok, false);
    assert.equal(result.reports[0]?.plan.ownership.reason, 'github-unavailable');
    assert.ok(result.reports[0]?.plan.findings.some((f) => f.relPath === 'CONTRIBUTING.md' && f.status === 'missing'));
  });
});
