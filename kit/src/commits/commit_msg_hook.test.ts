import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { validateConventionalCommit } from './conventional.js';

const repoDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const hook = path.join(repoDir, 'templates/git/commit-msg');

function runHook(raw: string): number {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'commit-msg-'));
  const file = path.join(dir, 'COMMIT_EDITMSG');
  fs.writeFileSync(file, raw);
  const env = { ...process.env };
  delete env.PATH;
  env.PATH = '/usr/bin:/bin';
  env.HOME = dir;
  try {
    execFileSync('sh', [hook, file], { env, stdio: 'pipe' });
    return 0;
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    return typeof status === 'number' ? status : 1;
  }
}

describe('templates/git/commit-msg fallback', () => {
  it('agrees with validateConventionalCommit when wk is not on PATH', () => {
    const samples = [
      'feat(cli): add commit-msg hook',
      'Merge branch \'x\'',
      'Fixed the R2 issue',
      'feat: Add Uppercase'
    ];
    for (const raw of samples) {
      const tsOk = validateConventionalCommit(raw).ok;
      const shOk = runHook(raw) === 0;
      assert.equal(shOk, tsOk, raw);
    }
  });
});
