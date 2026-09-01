import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { backupExistingFile, backupStamp } from './backup_file.js';

describe('backupExistingFile', () => {
  it('formats a local timestamp as YYYYMMDDHHMMSS', () => {
    const stamp = backupStamp(new Date(2026, 7, 31, 9, 5, 7));
    assert.equal(stamp, '20260831090507');
  });

  it('returns undefined when the target does not exist', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-backup-'));
    const missing = path.join(dir, 'mcp.json');
    assert.equal(backupExistingFile(missing), undefined);
  });

  it('copies an existing file to a stamped backup', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-backup-'));
    const target = path.join(dir, 'mcp.json');
    fs.writeFileSync(target, '{"old":true}\n', 'utf8');
    const backup = backupExistingFile(target, new Date(2026, 0, 2, 3, 4, 5));
    assert.equal(backup, `${target}.bak.20260102030405`);
    assert.ok(backup);
    assert.equal(fs.readFileSync(backup, 'utf8'), '{"old":true}\n');
    assert.equal(fs.readFileSync(target, 'utf8'), '{"old":true}\n');
  });
});
