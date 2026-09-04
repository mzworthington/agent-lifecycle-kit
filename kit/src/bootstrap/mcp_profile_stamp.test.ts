import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  MCP_PROFILE_STAMP_REL,
  MCP_RESTORE_GITIGNORE_PATTERNS,
  ensureMcpRestoreGitignore,
  gitignoreHasPattern,
  profileToRestore,
  readMcpProfileStamp,
  recordComposedProfile
} from './mcp_profile_stamp.js';

const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function gitCheckIgnored(cwd: string, relPath: string): boolean {
  try {
    execFileSync('git', ['-c', 'core.excludesFile=/dev/null', 'check-ignore', '-q', relPath], {
      cwd,
      stdio: 'ignore'
    });
    return true;
  } catch {
    return false;
  }
}

describe('mcp profile stamp', () => {
  it('records previous and current profile names without secrets', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-mcp-stamp-'));
    recordComposedProfile(dir, 'default');
    const afterOps = recordComposedProfile(dir, 'cloudflare-ops');
    assert.deepEqual(afterOps, { previous: 'default', current: 'cloudflare-ops' });
    const raw = fs.readFileSync(path.join(dir, MCP_PROFILE_STAMP_REL), 'utf8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    assert.deepEqual(Object.keys(parsed).sort(), ['current', 'previous']);
    assert.match(raw, /"previous": "default"/);
    assert.doesNotMatch(raw, /token|secret|KEY|Bearer|api[_-]?key/i);
  });

  it('restores kit default when nothing was composed', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-mcp-stamp-'));
    assert.equal(profileToRestore(dir), 'default');
    assert.equal(readMcpProfileStamp(dir), undefined);
  });

  it('does not toggle back to the vendor profile after restore', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-mcp-stamp-stay-'));
    recordComposedProfile(dir, 'default');
    recordComposedProfile(dir, 'cloudflare-ops');
    const afterNamedRestore = recordComposedProfile(dir, 'default');
    assert.deepEqual(afterNamedRestore, { previous: 'default', current: 'default' });
    assert.equal(profileToRestore(dir), 'default');
    const afterSecond = recordComposedProfile(dir, profileToRestore(dir));
    assert.deepEqual(afterSecond, { previous: 'default', current: 'default' });
  });

  it('gitignores the stamp and json bak sidecars so commits cannot pick up secrets', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-mcp-stamp-gi-'));
    execFileSync('git', ['init'], { cwd: dir, stdio: 'ignore' });
    fs.writeFileSync(path.join(dir, '.git', 'info', 'exclude'), '', 'utf8');
    recordComposedProfile(dir, 'default');
    const gitignore = fs.readFileSync(path.join(dir, '.gitignore'), 'utf8');
    for (const pattern of MCP_RESTORE_GITIGNORE_PATTERNS) {
      assert.equal(gitignoreHasPattern(gitignore, pattern), true);
    }
    fs.mkdirSync(path.join(dir, '.cursor'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.cursor', 'mcp.json.bak.20260102030405'), '{"token":"nope"}\n');
    assert.equal(gitCheckIgnored(dir, MCP_PROFILE_STAMP_REL), true);
    assert.equal(gitCheckIgnored(dir, path.join('.cursor', 'mcp.json.bak.20260102030405')), true);
    const again = fs.readFileSync(path.join(dir, '.gitignore'), 'utf8');
    ensureMcpRestoreGitignore(dir);
    assert.equal(fs.readFileSync(path.join(dir, '.gitignore'), 'utf8'), again);
  });

  it('kit checkout gitignores the stamp and json bak sidecars', () => {
    const body = fs.readFileSync(path.join(kitRoot, '.gitignore'), 'utf8');
    assert.match(body, /\.agents\/mcp-profile\.stamp/);
    assert.match(body, /\*\.json\.bak\.\*/);
  });
});
