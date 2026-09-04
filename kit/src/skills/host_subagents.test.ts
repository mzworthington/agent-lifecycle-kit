import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { kitRootFrom } from '../shared/paths.js';
import { PILOT_GENERATE_AGENT } from './subagents.js';
import {
  WAYKIT_MANAGED_MARKER,
  installHostSubagents,
  isWaykitManaged,
  userSubagentDir
} from './host_subagents.js';

const kitRoot = kitRootFrom(import.meta.url);

const MINIMAL_YAML = `
version: 1
iteration: 0
kill:
  freezeIf: freeze if auto-delegation is worse than today's skill picker
bands:
  - id: pilot-isolation
    disposition: generate-agent
    skills: [agent-debug, agent-xfn]
  - id: readonly-audit
    disposition: generate-agent
    skills: [agent-review, agent-security, agent-arch-drift]
  - id: sequential-specialists
    disposition: generate-agent
    skills: [agent-spec, agent-tdd]
  - id: parent-only
    disposition: parent-only
    skills: [agent-orchestrator]
staySkill:
  prefixes: [lang-, framework-, profile-]
tdd:
  skill: agent-tdd
  gears: [1, 2]
  sameAgent: true
  escapeHatch: agent-adapter
`.trim();

function write(root: string, rel: string, contents: string): void {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, contents, 'utf8');
}

function kitWithAllowlist(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-host-subagents-'));
  write(root, 'skills/subagents.yaml', MINIMAL_YAML);
  for (const name of [...PILOT_GENERATE_AGENT, 'agent-orchestrator', 'agent-adapter']) {
    write(
      root,
      path.join('skills', name, 'SKILL.md'),
      `---\nname: ${name}\ndescription: Use ${name} for phase work.\nkind: role\n---\n# ${name}\n`
    );
  }
  return root;
}

describe('userSubagentDir', () => {
  it('maps Cursor and Claude to user-scope agent dirs only', () => {
    const home = '/Users/me';
    assert.equal(userSubagentDir('cursor', home), path.join(home, '.cursor', 'agents'));
    assert.equal(userSubagentDir('claude', home), path.join(home, '.claude', 'agents'));
  });
});

describe('installHostSubagents', () => {
  it('writes allowlisted stubs under ~/.cursor/agents and ~/.claude/agents', () => {
    const kit = kitWithAllowlist();
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-home-'));
    const result = installHostSubagents({ kitRepoDir: kit, homedir: home });
    for (const host of ['cursor', 'claude'] as const) {
      const dir = userSubagentDir(host, home);
      for (const name of PILOT_GENERATE_AGENT) {
        const file = path.join(dir, `${name}.md`);
        assert.equal(fs.existsSync(file), true, file);
        const body = fs.readFileSync(file, 'utf8');
        assert.equal(isWaykitManaged(body), true);
        assert.match(body, new RegExp(`name:\\s*${name}`));
        assert.match(body, /model:\s*inherit/);
        assert.match(body, new RegExp(`skills/${name}/SKILL\\.md`));
        assert.ok(result.written.includes(file));
      }
      assert.equal(fs.existsSync(path.join(dir, 'agent-orchestrator.md')), false);
      assert.equal(fs.existsSync(path.join(dir, 'agent-adapter.md')), false);
    }
  });

  it('marks readonly-audit Cursor stubs readonly and leaves Claude without that field', () => {
    const kit = kitWithAllowlist();
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-home-'));
    installHostSubagents({ kitRepoDir: kit, homedir: home });
    const cursorReview = fs.readFileSync(
      path.join(userSubagentDir('cursor', home), 'agent-review.md'),
      'utf8'
    );
    const claudeReview = fs.readFileSync(
      path.join(userSubagentDir('claude', home), 'agent-review.md'),
      'utf8'
    );
    const cursorTdd = fs.readFileSync(
      path.join(userSubagentDir('cursor', home), 'agent-tdd.md'),
      'utf8'
    );
    assert.match(cursorReview, /readonly:\s*true/);
    assert.doesNotMatch(claudeReview, /readonly:/);
    assert.doesNotMatch(cursorTdd, /readonly:/);
  });

  it('does not invent Copilot or Antigravity agent dirs', () => {
    const kit = kitWithAllowlist();
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-home-'));
    installHostSubagents({ kitRepoDir: kit, homedir: home });
    assert.equal(fs.existsSync(path.join(home, '.copilot', 'agents')), false);
    assert.equal(fs.existsSync(path.join(home, '.gemini', 'agents')), false);
    assert.equal(fs.existsSync(path.join(home, '.vscode', 'agents')), false);
    assert.equal(fs.existsSync(path.join(home, '.agents', 'agents')), false);
  });

  it('refreshes kit stubs without deleting unrelated custom agents', () => {
    const kit = kitWithAllowlist();
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-home-'));
    const cursorDir = userSubagentDir('cursor', home);
    fs.mkdirSync(cursorDir, { recursive: true });
    fs.writeFileSync(path.join(cursorDir, 'my-reviewer.md'), 'custom agent\n', 'utf8');
    const tddPath = path.join(cursorDir, 'agent-tdd.md');
    fs.writeFileSync(tddPath, `---\nname: agent-tdd\n---\n${WAYKIT_MANAGED_MARKER}\nold stub\n`, 'utf8');
    const result = installHostSubagents({ kitRepoDir: kit, homedir: home });
    assert.equal(fs.readFileSync(path.join(cursorDir, 'my-reviewer.md'), 'utf8'), 'custom agent\n');
    const refreshed = fs.readFileSync(tddPath, 'utf8');
    assert.match(refreshed, /Use agent-tdd for phase work/);
    assert.doesNotMatch(refreshed, /old stub/);
    assert.ok(result.refreshed.includes(tddPath));
    assert.equal(result.skipped.includes(path.join(cursorDir, 'my-reviewer.md')), false);
  });

  it('leaves a same-named custom file that is not kit-managed', () => {
    const kit = kitWithAllowlist();
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-home-'));
    const cursorDir = userSubagentDir('cursor', home);
    fs.mkdirSync(cursorDir, { recursive: true });
    const custom = path.join(cursorDir, 'agent-tdd.md');
    fs.writeFileSync(custom, '---\nname: agent-tdd\n---\nmy own tdd agent\n', 'utf8');
    const result = installHostSubagents({ kitRepoDir: kit, homedir: home });
    assert.equal(fs.readFileSync(custom, 'utf8'), '---\nname: agent-tdd\n---\nmy own tdd agent\n');
    assert.ok(result.skipped.includes(custom));
  });

  it('skips write when the kit has no allowlist file', () => {
    const kit = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-empty-'));
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-home-'));
    const result = installHostSubagents({ kitRepoDir: kit, homedir: home });
    assert.deepEqual(result.written, []);
    assert.equal(fs.existsSync(path.join(home, '.cursor')), false);
  });

  it('dry-run reports paths without creating host dirs', () => {
    const kit = kitWithAllowlist();
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-home-'));
    const result = installHostSubagents({ kitRepoDir: kit, homedir: home, dryRun: true });
    assert.ok(result.written.length > 0);
    assert.equal(fs.existsSync(userSubagentDir('cursor', home)), false);
    assert.equal(fs.existsSync(userSubagentDir('claude', home)), false);
  });

  it('installs the live kit allowlist into a temp home', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-home-'));
    installHostSubagents({ kitRepoDir: kitRoot, homedir: home });
    for (const name of PILOT_GENERATE_AGENT) {
      assert.equal(fs.existsSync(path.join(userSubagentDir('cursor', home), `${name}.md`)), true);
      assert.equal(fs.existsSync(path.join(userSubagentDir('claude', home), `${name}.md`)), true);
    }
  });
});
