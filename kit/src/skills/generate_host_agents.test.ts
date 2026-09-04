import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { parse as parseYaml } from 'yaml';
import { kitRootFrom } from '../shared/paths.js';
import { PILOT_GENERATE_AGENT, SUBAGENTS_REL } from './subagents.js';
import {
  HOST_AGENT_HOSTS,
  HOST_AGENT_STUB_BODY_LINE_BUDGET,
  generateHostAgents,
  printHostAgentStubResult,
  renderHostAgentStub,
  verifyHostAgentStubs
} from './generate_host_agents.js';

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

const PLAYBOOK_SENTENCE =
  'Write failing domain unit tests first and confirm the red before any production code.';

function writeSkill(
  root: string,
  name: string,
  description: string,
  extraBody = ''
): void {
  const dir = path.join(root, 'skills', name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'SKILL.md'),
    `---\nname: ${name}\ndescription: >-\n  ${description}\nkind: role\n---\n# Role: ${name}\n\n${PLAYBOOK_SENTENCE}\n\nSee [CODING_PHILOSOPHY.md](../../CODING_PHILOSOPHY.md) §4.\n\n${extraBody}`,
    'utf8'
  );
}

function writeFixture(skills: Array<{ name: string; description: string }>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-host-agents-'));
  fs.mkdirSync(path.join(root, 'skills'), { recursive: true });
  fs.writeFileSync(path.join(root, SUBAGENTS_REL), MINIMAL_YAML, 'utf8');
  for (const skill of skills) {
    writeSkill(root, skill.name, skill.description);
  }
  writeSkill(root, 'agent-orchestrator', 'Routes multi-phase work.');
  writeSkill(root, 'agent-adapter', 'Deep-dive adapters when gear 2 is too large.');
  return root;
}

const ALL_PILOT = PILOT_GENERATE_AGENT.map((name) => ({
  name,
  description: `When to delegate ${name}: use for the ${name} phase.`
}));

function parseStub(content: string): { frontmatter: Record<string, unknown>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  assert.ok(match, 'stub must have YAML frontmatter');
  const frontmatter = parseYaml(match[1] ?? '') as Record<string, unknown>;
  return { frontmatter, body: content.slice(match[0].length) };
}

function countLines(text: string): number {
  if (text.length === 0) return 0;
  const parts = text.split('\n');
  return text.endsWith('\n') ? parts.length - 1 : parts.length;
}

describe('renderHostAgentStub', () => {
  it('uses the skill name and when-to-delegate description, and tells the specialist to load the skill plus kit-knowledge', () => {
    const markdown = renderHostAgentStub({
      skill: 'agent-spec',
      name: 'agent-spec',
      description: 'Eliminates requirement ambiguity. Use when refining a settled feature.',
      readonly: false,
      forbidSplitGears: false,
      modelClass: 'plan'
    });
    const { frontmatter, body } = parseStub(markdown);
    assert.equal(frontmatter.name, 'agent-spec');
    assert.equal(
      frontmatter.description,
      'Eliminates requirement ambiguity. Use when refining a settled feature.'
    );
    assert.equal(frontmatter.model, 'inherit');
    assert.equal(frontmatter.readonly, undefined);
    assert.match(body, /skills\/agent-spec\/SKILL\.md/);
    assert.match(body, /kit-knowledge/);
    assert.match(markdown, /wk model resolve --skill agent-spec/);
    assert.doesNotMatch(markdown, /cursor-grok|composer-2\.5|claude-sonnet|kimi/i);
    assert.doesNotMatch(body, /CODING_PHILOSOPHY/);
    assert.doesNotMatch(body, /Write failing domain unit tests/);
  });

  it('sets readonly on review, security, and arch-drift stubs', () => {
    for (const skill of ['agent-review', 'agent-security', 'agent-arch-drift'] as const) {
      const markdown = renderHostAgentStub({
        skill,
        name: skill,
        description: `When to delegate ${skill}.`,
        readonly: true,
        forbidSplitGears: false,
        modelClass: 'review'
      });
      assert.equal(parseStub(markdown).frontmatter.readonly, true);
    }
  });

  it('forbids splitting gear 1 and gear 2 on the agent-tdd stub', () => {
    const markdown = renderHostAgentStub({
      skill: 'agent-tdd',
      name: 'agent-tdd',
      description: 'Owns the short TDD feedback loop.',
      readonly: false,
      forbidSplitGears: true,
      modelClass: 'implement'
    });
    const { body } = parseStub(markdown);
    assert.match(body, /do not split gear 1 and gear 2/i);
    assert.match(body, /skills\/agent-tdd\/SKILL\.md/);
  });
});

describe('generateHostAgents', () => {
  it('writes Cursor and Claude stubs only for allowlisted generate-agent roles', () => {
    const root = writeFixture(ALL_PILOT);
    const result = generateHostAgents(root);
    const expected = PILOT_GENERATE_AGENT.flatMap((skill) =>
      HOST_AGENT_HOSTS.map((host) => path.join(root, 'agents', host, `${skill}.md`))
    );
    assert.deepEqual(result.files.sort(), expected.sort());
    assert.equal(fs.existsSync(path.join(root, 'agents', 'cursor', 'agent-orchestrator.md')), false);
    assert.equal(fs.existsSync(path.join(root, 'agents', 'claude', 'agent-adapter.md')), false);
    const review = parseStub(
      fs.readFileSync(path.join(root, 'agents', 'cursor', 'agent-review.md'), 'utf8')
    );
    assert.equal(review.frontmatter.name, 'agent-review');
    assert.equal(review.frontmatter.description, 'When to delegate agent-review: use for the agent-review phase.');
    assert.equal(review.frontmatter.readonly, true);
    const tdd = parseStub(fs.readFileSync(path.join(root, 'agents', 'claude', 'agent-tdd.md'), 'utf8'));
    assert.match(tdd.body, /do not split gear 1 and gear 2/i);
    assert.doesNotMatch(tdd.body, new RegExp(PLAYBOOK_SENTENCE));
  });
});

describe('verifyHostAgentStubs', () => {
  it('passes after generate when stubs stay thin and do not copy the skill playbook', () => {
    const root = writeFixture(ALL_PILOT);
    generateHostAgents(root);
    const result = verifyHostAgentStubs(root);
    assert.equal(result.ok, true, result.errors.join('; '));
    assert.deepEqual(result.errors, []);
    const stub = fs.readFileSync(path.join(root, 'agents', 'cursor', 'agent-debug.md'), 'utf8');
    assert.ok(countLines(parseStub(stub).body) <= HOST_AGENT_STUB_BODY_LINE_BUDGET);
  });

  it('fails when a stub grows into a playbook or copies SOP/philosophy text', () => {
    const root = writeFixture(ALL_PILOT);
    generateHostAgents(root);
    const fat = path.join(root, 'agents', 'cursor', 'agent-debug.md');
    const playbook = [
      '---',
      'name: agent-debug',
      'description: >-',
      '  When to delegate agent-debug: use for the agent-debug phase.',
      'model: inherit',
      '---',
      '',
      '# Role: Debug playbook',
      '',
      PLAYBOOK_SENTENCE,
      '',
      'Follow CODING_PHILOSOPHY.md §4 minimal change and paste the SOP here.',
      ...Array.from({ length: HOST_AGENT_STUB_BODY_LINE_BUDGET }, (_, i) => `procedure step ${i}`)
    ].join('\n');
    fs.writeFileSync(fat, playbook, 'utf8');
    const result = verifyHostAgentStubs(root);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => /agent-debug/.test(error)));
    assert.ok(result.errors.some((error) => /line budget|playbook|duplicat/i.test(error)));
  });

  it('fails when an allowlisted stub is missing', () => {
    const root = writeFixture(ALL_PILOT);
    generateHostAgents(root);
    fs.rmSync(path.join(root, 'agents', 'cursor', 'agent-xfn.md'));
    const result = verifyHostAgentStubs(root);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => /agent-xfn/.test(error) && /missing/i.test(error)));
  });
});

describe('printHostAgentStubResult', () => {
  it('prints OK when stubs are thin', () => {
    const lines: string[] = [];
    const log = console.log;
    console.log = (...args: unknown[]) => {
      lines.push(args.map(String).join(' '));
    };
    try {
      printHostAgentStubResult({ ok: true, errors: [] });
    } finally {
      console.log = log;
    }
    assert.match(lines.join('\n'), /OK: host agent stubs/);
  });
});

describe('host agent stubs (live kit)', () => {
  it('generates thin Cursor and Claude files for the frozen generate-agent set', () => {
    const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-host-agents-live-'));
    const result = generateHostAgents(kitRoot, dest);
    assert.equal(result.files.length, PILOT_GENERATE_AGENT.length * HOST_AGENT_HOSTS.length);
    const check = verifyHostAgentStubs(kitRoot, dest);
    assert.equal(check.ok, true, check.errors.join('; '));
    const tdd = parseStub(fs.readFileSync(path.join(dest, 'cursor', 'agent-tdd.md'), 'utf8'));
    assert.match(String(tdd.frontmatter.description), /short TDD feedback loop/i);
    assert.match(tdd.body, /do not split gear 1 and gear 2/i);
    assert.doesNotMatch(tdd.body, /Never import ORM/);
    const review = parseStub(fs.readFileSync(path.join(dest, 'claude', 'agent-review.md'), 'utf8'));
    assert.equal(review.frontmatter.readonly, true);
    assert.match(review.body, /skills\/agent-review\/SKILL\.md/);
    assert.match(review.body, /kit-knowledge/);
  });

  it('keeps the committed agents/ tree thin and in sync with the generator', () => {
    const result = verifyHostAgentStubs(kitRoot);
    assert.equal(result.ok, true, result.errors.join('; '));
  });
});
