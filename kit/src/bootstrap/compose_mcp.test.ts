import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { composeMCP } from './compose_mcp.js';

const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function writeServer(
  root: string,
  id: string,
  mcp: Record<string, unknown>,
  requiredEnv: string[] = []
): void {
  const dir = path.join(root, 'mcps', 'servers', id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'server.json'), JSON.stringify({ mcp, requiredEnv }), 'utf8');
}

function writeProfile(root: string, name: string, servers: string[]): string {
  const dir = path.join(root, 'mcps', 'profiles');
  fs.mkdirSync(dir, { recursive: true });
  const profilePath = path.join(dir, `${name}.json`);
  fs.writeFileSync(profilePath, JSON.stringify({ name, servers }), 'utf8');
  return profilePath;
}

describe('composeMCP', () => {
  it('writes merged mcpServers to an output file', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-mcp-'));
    writeProfile(root, 'demo', ['alpha', 'beta']);
    writeServer(root, 'alpha', { alpha: { command: 'npx', args: ['alpha'] } });
    writeServer(root, 'beta', { beta: { command: 'node', args: ['beta.js'] } });
    const out = path.join(root, 'out', 'mcp.json');
    composeMCP('demo', out, false, { repoDir: root, env: {} });
    const body = JSON.parse(fs.readFileSync(out, 'utf8')) as { mcpServers: Record<string, unknown> };
    assert.deepEqual(Object.keys(body.mcpServers), ['alpha', 'beta']);
  });

  it('backs up an existing output file', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-mcp-'));
    writeProfile(root, 'demo', ['alpha']);
    writeServer(root, 'alpha', { alpha: { command: 'npx' } });
    const out = path.join(root, 'mcp.json');
    fs.writeFileSync(out, '{"old":true}\n', 'utf8');
    composeMCP('demo', out, false, { repoDir: root, env: {} });
    const backups = fs.readdirSync(root).filter((f) => f.startsWith('mcp.json.bak.'));
    assert.equal(backups.length, 1);
    assert.equal(fs.readFileSync(path.join(root, backups[0]!), 'utf8'), '{"old":true}\n');
  });

  it('installs into the Cursor config dir under homedir', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-mcp-'));
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-home-'));
    const cursorDir = path.join(home, 'cursor-config');
    writeProfile(root, 'demo', ['alpha']);
    writeServer(root, 'alpha', { alpha: { command: 'npx' } });
    composeMCP('demo', undefined, true, { repoDir: root, homedir: home, cursorDir, env: {} });
    const installed = path.join(cursorDir, 'mcp.json');
    assert.equal(fs.existsSync(installed), true);
    const body = JSON.parse(fs.readFileSync(installed, 'utf8')) as { mcpServers: { alpha: unknown } };
    assert.ok(body.mcpServers.alpha);
  });

  it('accepts a profile path and warns on missing required env', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-mcp-'));
    writeServer(root, 'alpha', { alpha: { command: 'npx' } }, ['NEED_ME']);
    const profilePath = path.join(root, 'custom.json');
    fs.writeFileSync(profilePath, JSON.stringify({ servers: ['alpha'] }), 'utf8');
    const out = path.join(root, 'mcp.json');
    const warnings: string[] = [];
    const orig = console.warn;
    console.warn = (msg?: unknown) => {
      warnings.push(String(msg));
    };
    try {
      composeMCP(profilePath, out, false, { repoDir: root, env: {} });
    } finally {
      console.warn = orig;
    }
    assert.match(warnings.join('\n'), /alpha:NEED_ME/);
  });

  it('rejects a missing profile', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-mcp-'));
    fs.mkdirSync(path.join(root, 'mcps', 'profiles'), { recursive: true });
    assert.throws(() => composeMCP('nope', undefined, false, { repoDir: root }), /Profile JSON not found/);
  });

  it('rejects duplicate mcpServers keys', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-mcp-'));
    writeProfile(root, 'demo', ['a', 'b']);
    writeServer(root, 'a', { shared: { command: 'npx' } });
    writeServer(root, 'b', { shared: { command: 'node' } });
    assert.throws(
      () => composeMCP('demo', path.join(root, 'out.json'), false, { repoDir: root, env: {} }),
      /Duplicate mcpServers key 'shared'/
    );
  });

  it('rejects an empty mcp object', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-mcp-'));
    writeProfile(root, 'demo', ['alpha']);
    writeServer(root, 'alpha', {});
    assert.throws(
      () => composeMCP('demo', path.join(root, 'out.json'), false, { repoDir: root, env: {} }),
      /must contain a non-empty mcp object/
    );
  });

  it('composes the default profile with Linear remote MCP', () => {
    const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'kit-mcp-default-')), 'mcp.json');
    composeMCP('default', out, false, { repoDir: kitRoot, env: {} });
    const body = JSON.parse(fs.readFileSync(out, 'utf8')) as {
      mcpServers: Record<string, { url?: string }>;
    };
    assert.equal(body.mcpServers.linear?.url, 'https://mcp.linear.app/mcp');
    assert.ok(body.mcpServers['kit-knowledge']);
    assert.ok(body.mcpServers.github);
    assert.ok(body.mcpServers.memory);
    assert.ok(body.mcpServers.context7);
    assert.equal(body.mcpServers.notion, undefined);
    assert.equal(body.mcpServers.slack, undefined);
  });

  it('composes the cloudflare-ops profile from the kit catalog', () => {
    const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'kit-mcp-cf-')), 'mcp.json');
    composeMCP('cloudflare-ops', out, false, { repoDir: kitRoot, env: {} });
    const body = JSON.parse(fs.readFileSync(out, 'utf8')) as {
      mcpServers: Record<string, { url?: string }>;
    };
    assert.equal(body.mcpServers.cloudflare?.url, 'https://mcp.cloudflare.com/mcp');
    assert.equal(
      body.mcpServers['cloudflare-observability']?.url,
      'https://observability.mcp.cloudflare.com/mcp'
    );
    assert.ok(body.mcpServers['kit-knowledge']);
    assert.equal(body.mcpServers.vercel, undefined);
  });

  it('composes the astro profile from the kit catalog', () => {
    const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'kit-mcp-astro-')), 'mcp.json');
    composeMCP('astro', out, false, { repoDir: kitRoot, env: {} });
    const body = JSON.parse(fs.readFileSync(out, 'utf8')) as {
      mcpServers: Record<string, { url?: string }>;
    };
    assert.equal(body.mcpServers['astro-docs']?.url, 'https://mcp.docs.astro.build/mcp');
    assert.ok(body.mcpServers['kit-knowledge']);
    assert.equal(body.mcpServers.context7, undefined);
  });
});
