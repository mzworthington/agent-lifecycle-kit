import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const installer = path.join(root, 'install.sh');

describe('install.sh', () => {
  it('prints the curl | bash usage without cloning', () => {
    const result = spawnSync('bash', [installer, '--help'], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /curl -fsSL https:\/\/raw\.githubusercontent\.com\/mzworthington\/agent-lifecycle-kit\/main\/install\.sh \| bash/);
    assert.match(result.stdout, /kit init \. --mcp default --hook/);
  });

  it('rejects unknown options and missing --dir values', () => {
    const unknown = spawnSync('bash', [installer, '--bogus'], { encoding: 'utf8' });
    assert.equal(unknown.status, 1);
    assert.match(unknown.stderr, /Unknown option/);
    const missingDir = spawnSync('bash', [installer, '--dir'], { encoding: 'utf8' });
    assert.equal(missingDir.status, 1);
    assert.match(missingDir.stderr, /--dir requires a path/);
  });

  it('refuses to run under a non-bash shell', () => {
    const result = spawnSync('zsh', [installer, '--help'], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /run this installer with bash/);
  });
});
