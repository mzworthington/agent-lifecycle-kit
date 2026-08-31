import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { parseExternalLockFile } from './parse_external_lock.js';

function writeLock(contents: unknown): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-lock-'));
  const lockPath = path.join(dir, 'external.lock.json');
  fs.writeFileSync(lockPath, JSON.stringify(contents), 'utf8');
  return lockPath;
}

describe('parseExternalLockFile', () => {
  it('reads repository, skill, pin, agent, scope, and id', () => {
    const lockPath = writeLock({
      agent: 'cursor',
      scope: 'user',
      skills: [
        {
          id: 'cloudflare',
          repository: 'cloudflare/skills',
          skill: 'skills/cloudflare',
          pin: 'v1.0.0'
        }
      ]
    });
    const entries = parseExternalLockFile(lockPath);
    assert.deepEqual(entries, [
      {
        repository: 'cloudflare/skills',
        skill: 'skills/cloudflare',
        pin: 'v1.0.0',
        agent: 'cursor',
        scope: 'user',
        id: 'cloudflare'
      }
    ]);
  });

  it('returns an empty list when skills is missing', () => {
    const lockPath = writeLock({ agent: 'cursor', scope: 'user' });
    assert.deepEqual(parseExternalLockFile(lockPath), []);
  });

  it('throws when the lockfile is missing', () => {
    assert.throws(
      () => parseExternalLockFile('/tmp/kit-missing-external.lock.json'),
      /lockfile not found/
    );
  });

  it('throws when a field contains a pipe', () => {
    const lockPath = writeLock({
      skills: [{ repository: 'a|b', skill: 'skills/x', id: 'x' }]
    });
    assert.throws(() => parseExternalLockFile(lockPath), /must not contain '\|'/);
  });

  it('defaults agent/scope and derives skill from id', () => {
    const lockPath = writeLock({
      skills: [{ repository: 'cloudflare/skills', id: 'cloudflare', pin: 'v1' }]
    });
    const [entry] = parseExternalLockFile(lockPath);
    assert.equal(entry?.skill, 'cloudflare');
    assert.equal(entry?.agent, 'cursor');
    assert.equal(entry?.scope, 'user');
    assert.equal(entry?.id, 'cloudflare');
  });

  it('throws on invalid JSON or a missing repository', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-lock-'));
    const bad = path.join(dir, 'bad.json');
    fs.writeFileSync(bad, '{not json', 'utf8');
    assert.throws(() => parseExternalLockFile(bad), /invalid JSON/);
    const incomplete = writeLock({ skills: [{ skill: 'x' }] });
    assert.throws(() => parseExternalLockFile(incomplete), /repository and skill/);
  });
});
