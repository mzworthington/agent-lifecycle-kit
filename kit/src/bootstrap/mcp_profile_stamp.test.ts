import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import {
  MCP_PROFILE_STAMP_REL,
  profileToRestore,
  readMcpProfileStamp,
  recordComposedProfile
} from './mcp_profile_stamp.js';

describe('mcp profile stamp', () => {
  it('records previous and current profile names without secrets', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-mcp-stamp-'));
    recordComposedProfile(dir, 'default');
    const afterOps = recordComposedProfile(dir, 'cloudflare-ops');
    assert.deepEqual(afterOps, { previous: 'default', current: 'cloudflare-ops' });
    const raw = fs.readFileSync(path.join(dir, MCP_PROFILE_STAMP_REL), 'utf8');
    assert.match(raw, /"previous": "default"/);
    assert.doesNotMatch(raw, /token|secret|KEY/i);
  });

  it('restores kit default when nothing was composed', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-mcp-stamp-'));
    assert.equal(profileToRestore(dir), 'default');
    assert.equal(readMcpProfileStamp(dir), undefined);
  });
});
