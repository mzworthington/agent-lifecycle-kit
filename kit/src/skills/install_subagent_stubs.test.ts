import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import {
  MANAGED_AGENTS_MANIFEST,
  installUserSubagentStubs,
  userSubagentInstallDirs
} from './install_subagent_stubs.js';

function seedKit(root: string, files: Record<string, string>): void {
  fs.mkdirSync(path.join(root, 'agents'), { recursive: true });
  for (const [name, body] of Object.entries(files)) {
    fs.writeFileSync(path.join(root, 'agents', name), body);
  }
}

describe('userSubagentInstallDirs', () => {
  it('points at user Cursor and Claude agent dirs, not the product repo', () => {
    assert.deepEqual(userSubagentInstallDirs('/tmp/fake-home'), [
      path.join('/tmp/fake-home', '.cursor', 'agents'),
      path.join('/tmp/fake-home', '.claude', 'agents')
    ]);
  });
});

describe('installUserSubagentStubs', () => {
  it('copies kit stubs into dest dirs and leaves custom files', () => {
    const kit = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-agents-src-'));
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-agents-home-'));
    try {
      seedKit(kit, {
        'agent-tdd.md': '# tdd\n',
        'README.md': '# skip\n'
      });
      const destDirs = [path.join(home, 'cursor-agents'), path.join(home, 'claude-agents')];
      const custom = path.join(destDirs[0]!, 'my-custom.md');
      fs.mkdirSync(path.dirname(custom), { recursive: true });
      fs.writeFileSync(custom, '# mine\n');

      const result = installUserSubagentStubs({ kitRepoDir: kit, destDirs });
      assert.deepEqual(result.destDirs, destDirs);
      for (const dir of destDirs) {
        assert.equal(fs.existsSync(path.join(dir, 'agent-tdd.md')), true);
        assert.equal(fs.existsSync(path.join(dir, 'README.md')), false);
        const manifest = JSON.parse(fs.readFileSync(path.join(dir, MANAGED_AGENTS_MANIFEST), 'utf8')) as {
          files: string[];
        };
        assert.deepEqual(manifest.files, ['agent-tdd.md']);
      }
      assert.equal(fs.readFileSync(custom, 'utf8'), '# mine\n');
    } finally {
      fs.rmSync(kit, { recursive: true, force: true });
      fs.rmSync(home, { recursive: true, force: true });
    }
  });

  it('removes kit-managed files that left the generate list without touching custom agents', () => {
    const kit = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-agents-src-'));
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-agents-home-'));
    try {
      seedKit(kit, { 'agent-tdd.md': '# tdd\n', 'agent-debug.md': '# debug\n' });
      const destDirs = [path.join(home, 'cursor-agents'), path.join(home, 'claude-agents')];
      installUserSubagentStubs({ kitRepoDir: kit, destDirs });
      fs.unlinkSync(path.join(kit, 'agents', 'agent-debug.md'));
      const custom = path.join(destDirs[1]!, 'local.md');
      fs.writeFileSync(custom, '# keep\n');

      const result = installUserSubagentStubs({ kitRepoDir: kit, destDirs });
      assert.equal(fs.existsSync(path.join(destDirs[0]!, 'agent-debug.md')), false);
      assert.ok(result.removed.some((p) => p.endsWith('agent-debug.md')));
      assert.equal(fs.readFileSync(custom, 'utf8'), '# keep\n');
      assert.equal(fs.existsSync(path.join(destDirs[0]!, 'agent-tdd.md')), true);
    } finally {
      fs.rmSync(kit, { recursive: true, force: true });
      fs.rmSync(home, { recursive: true, force: true });
    }
  });

  it('does not write product-repo agent dirs', () => {
    const kit = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-agents-src-'));
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-agents-home-'));
    const product = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-product-'));
    try {
      seedKit(kit, { 'agent-tdd.md': '# tdd\n' });
      installUserSubagentStubs({
        kitRepoDir: kit,
        destDirs: [path.join(home, 'cursor-agents')]
      });
      assert.equal(fs.existsSync(path.join(product, '.cursor', 'agents')), false);
    } finally {
      fs.rmSync(kit, { recursive: true, force: true });
      fs.rmSync(home, { recursive: true, force: true });
      fs.rmSync(product, { recursive: true, force: true });
    }
  });
});
