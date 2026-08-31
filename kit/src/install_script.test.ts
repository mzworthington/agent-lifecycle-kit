import assert from 'node:assert/strict';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const installer = path.join(root, 'install.sh');

function runInstaller(shell: string, args: string[]): SpawnSyncReturns<string> {
  return spawnSync(shell, [installer, ...args], { encoding: 'utf8' });
}

describe('install.sh', () => {
  it('prints the curl | sh usage without cloning', () => {
    const result = runInstaller('sh', ['--help']);
    assert.equal(result.status, 0, result.stderr);
    assert.match(
      result.stdout,
      /curl -fsSL https:\/\/raw\.githubusercontent\.com\/mzworthington\/agent-lifecycle-kit\/main\/install\.sh \| sh/
    );
    assert.match(result.stdout, /kit init \. --mcp default --hook/);
  });

  it('rejects unknown options and missing --dir values', () => {
    const unknown = runInstaller('sh', ['--bogus']);
    assert.equal(unknown.status, 1);
    assert.match(unknown.stderr, /Unknown option/);
    const missingDir = runInstaller('sh', ['--dir']);
    assert.equal(missingDir.status, 1);
    assert.match(missingDir.stderr, /--dir requires a path/);
  });

  it('runs under bash as well as sh', () => {
    const result = runInstaller('bash', ['--help']);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /\| sh/);
  });
});
