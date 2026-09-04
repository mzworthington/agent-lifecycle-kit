import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { kitRootFrom } from '../shared/paths.js';
import { listAgentSkills } from '../models/catalog.js';
import {
  SUBAGENTS_REL,
  dispositionFor,
  loadSubagentAllowlist,
  printSubagentAllowlistResult,
  verifySubagentAllowlist
} from './subagents.js';

const kitRoot = kitRootFrom(import.meta.url);

const PILOT_GENERATE_AGENT = [
  'agent-debug',
  'agent-xfn',
  'agent-review',
  'agent-security',
  'agent-arch-drift',
  'agent-spec',
  'agent-tdd'
] as const;

function writeAllowlist(root: string, body: string): void {
  fs.mkdirSync(path.join(root, 'skills'), { recursive: true });
  fs.writeFileSync(path.join(root, SUBAGENTS_REL), body, 'utf8');
}

function skillMd(root: string, name: string): void {
  const dir = path.join(root, 'skills', name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\nname: ${name}\nkind: role\n---\n# ${name}\n`, 'utf8');
}

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

describe('subagent allowlist (live kit)', () => {
  const catalog = loadSubagentAllowlist(kitRoot);

  it('pilot generate-agent set is isolation, readonly audit, and sequential specialists', () => {
    assert.deepEqual(catalog.generateAgent, [...PILOT_GENERATE_AGENT]);
    assert.deepEqual(catalog.bandSkills('pilot-isolation'), ['agent-debug', 'agent-xfn']);
    assert.deepEqual(catalog.bandSkills('readonly-audit'), [
      'agent-review',
      'agent-security',
      'agent-arch-drift'
    ]);
    assert.deepEqual(catalog.bandSkills('sequential-specialists'), ['agent-spec', 'agent-tdd']);
  });

  it('keeps the orchestrator as parent-only', () => {
    assert.deepEqual(catalog.parentOnly, ['agent-orchestrator']);
    assert.equal(dispositionFor(catalog, 'agent-orchestrator'), 'parent-only');
    assert.equal(catalog.generateAgent.includes('agent-orchestrator'), false);
  });

  it('marks lang-*, framework-*, and profile-* stay-skill, not generate-agent', () => {
    assert.deepEqual(catalog.staySkillPrefixes, ['lang-', 'framework-', 'profile-']);
    for (const name of ['lang-typescript', 'framework-next', 'profile-api']) {
      assert.equal(dispositionFor(catalog, name), 'stay-skill');
    }
  });

  it('keeps TDD gears 1 and 2 on one agent and adapter as the escape hatch', () => {
    assert.equal(catalog.tdd.skill, 'agent-tdd');
    assert.deepEqual(catalog.tdd.gears, [1, 2]);
    assert.equal(catalog.tdd.sameAgent, true);
    assert.equal(catalog.tdd.escapeHatch, 'agent-adapter');
    assert.equal(dispositionFor(catalog, 'agent-tdd'), 'generate-agent');
    assert.equal(dispositionFor(catalog, 'agent-adapter'), 'stay-skill');
    assert.equal(catalog.generateAgent.includes('agent-adapter'), false);
  });

  it('treats unlisted agent-* roles as stay-skill', () => {
    const generate = new Set(catalog.generateAgent);
    const parent = new Set(catalog.parentOnly);
    for (const name of listAgentSkills(kitRoot)) {
      if (generate.has(name) || parent.has(name)) continue;
      assert.equal(dispositionFor(catalog, name), 'stay-skill', name);
    }
  });

  it('names the kill: freeze if auto-delegation is worse than today\'s skill picker', () => {
    assert.match(catalog.kill.freezeIf, /freeze if auto-delegation is worse than today's skill picker/i);
  });

  it('passes wk verify against the live skills tree', () => {
    const result = verifySubagentAllowlist(kitRoot);
    assert.equal(result.ok, true, result.errors.join('\n'));
    assert.deepEqual(result.errors, []);
  });
});

describe('subagent allowlist docs', () => {
  const taxonomy = fs.readFileSync(path.join(kitRoot, 'skills/README.md'), 'utf8');
  const docs = fs.readFileSync(path.join(kitRoot, 'docs/subagents.md'), 'utf8');

  it('publishes the bands in kit docs and the skills taxonomy', () => {
    for (const body of [taxonomy, docs]) {
      assert.match(body, /pilot isolation/i);
      assert.match(body, /readonly audit/i);
      assert.match(body, /sequential specialists/i);
      assert.match(body, /parent only/i);
      assert.match(body, /agent-debug/);
      assert.match(body, /agent-xfn/);
      assert.match(body, /agent-review/);
      assert.match(body, /agent-security/);
      assert.match(body, /agent-arch-drift/);
      assert.match(body, /agent-spec/);
      assert.match(body, /agent-tdd/);
      assert.match(body, /agent-orchestrator/);
    }
  });

  it('marks stack profiles stay-skill and TDD gears as one agent', () => {
    for (const body of [taxonomy, docs]) {
      assert.match(body, /stay-skill/);
      assert.match(body, /generate-agent/);
      assert.match(body, /lang-\*/);
      assert.match(body, /framework-\*/);
      assert.match(body, /profile-\*/);
      assert.match(body, /gear 1/i);
      assert.match(body, /gear 2/i);
      assert.match(body, /agent-adapter/);
      assert.match(body, /escape hatch/i);
    }
  });

  it('names the freeze kill when the list would grow past the pilot set', () => {
    for (const body of [taxonomy, docs]) {
      assert.match(body, /freeze if auto-delegation is worse than today's skill picker/i);
    }
  });
});

describe('verifySubagentAllowlist', () => {
  it('fails when the catalog file is missing', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-subagents-'));
    const result = verifySubagentAllowlist(root);
    assert.equal(result.ok, false);
    assert.match(result.errors.join('\n'), /missing/i);
  });

  it('fails when a generate-agent skill has no SKILL.md', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-subagents-'));
    writeAllowlist(root, MINIMAL_YAML);
    skillMd(root, 'agent-debug');
    const result = verifySubagentAllowlist(root);
    assert.equal(result.ok, false);
    assert.match(result.errors.join('\n'), /agent-xfn/);
  });

  it('fails when generate-agent grows past the frozen pilot set', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-subagents-'));
    writeAllowlist(
      root,
      MINIMAL_YAML.replace(
        'skills: [agent-spec, agent-tdd]',
        'skills: [agent-spec, agent-tdd, agent-docs]'
      )
    );
    for (const name of [...PILOT_GENERATE_AGENT, 'agent-orchestrator', 'agent-docs']) {
      skillMd(root, name);
    }
    const result = verifySubagentAllowlist(root);
    assert.equal(result.ok, false);
    assert.match(result.errors.join('\n'), /pilot set|freeze|agent-docs/i);
  });

  it('prints OK for a valid catalog', () => {
    const result = verifySubagentAllowlist(kitRoot);
    const lines: string[] = [];
    const orig = console.log;
    console.log = (msg?: unknown) => {
      lines.push(String(msg ?? ''));
    };
    try {
      printSubagentAllowlistResult(result);
    } finally {
      console.log = orig;
    }
    assert.equal(result.ok, true);
    assert.match(lines.join('\n'), /OK: subagent allowlist/);
  });
});
