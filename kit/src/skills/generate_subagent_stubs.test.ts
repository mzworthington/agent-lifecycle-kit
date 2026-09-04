import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  AGENTS_DIR_REL,
  SUBAGENT_STUB_LINE_BUDGET,
  generateSubagentStubs,
  renderSubagentStub,
  verifySubagentStubs
} from './generate_subagent_stubs.js';

const kitRoot = fileURLToPath(new URL('../../..', import.meta.url));
const PLAYBOOK = 'UNIQUE_PLAYBOOK_SENTENCE_DO_NOT_COPY_INTO_THE_STUB_FILE_PLEASE.';

const allowlistYaml = `version: 1
expandKill: Freeze this generate list if auto-delegation is worse than today's skill picker.
expandKillIndicator: Promote misses with wk eval dataset from-trace into evals/edd/subagent_routing.jsonl.
staySkillPrefixes:
  - lang-
  - framework-
  - profile-
tdd:
  skill: agent-tdd
  gears: same-session
  escapeHatch: agent-adapter
roles:
  agent-orchestrator:
    runtime: parent
  agent-review:
    runtime: subagent
    bucket: audit
    readonly: true
  agent-tdd:
    runtime: subagent
    bucket: sequential
    readonly: false
  agent-adapter:
    runtime: skill
`;

function writeTree(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-stubs-'));
  const skill = (name: string, description: string, extra: string) =>
    `---\nname: ${name}\ndescription: >-\n  ${description}\nkind: role\n---\n# Role body\n\n${extra}\n`;
  fs.mkdirSync(path.join(root, 'skills/agent-review'), { recursive: true });
  fs.mkdirSync(path.join(root, 'skills/agent-tdd'), { recursive: true });
  fs.mkdirSync(path.join(root, 'skills/agent-orchestrator'), { recursive: true });
  fs.mkdirSync(path.join(root, 'skills/agent-adapter'), { recursive: true });
  fs.writeFileSync(path.join(root, 'skills/subagents.yaml'), allowlistYaml);
  fs.writeFileSync(
    path.join(root, 'skills/agent-review/SKILL.md'),
    skill('agent-review', 'Reviews diffs against hexagonal boundaries. Use when the user asks for a PR review.', PLAYBOOK)
  );
  fs.writeFileSync(
    path.join(root, 'skills/agent-tdd/SKILL.md'),
    skill(
      'agent-tdd',
      'Owns the short TDD loop including gear 1 and gear 2. Use for TDD.',
      'Long SOP paste belongs in SOPs not here.'
    )
  );
  fs.writeFileSync(path.join(root, 'skills/agent-orchestrator/SKILL.md'), skill('agent-orchestrator', 'Routes.', 'x'));
  fs.writeFileSync(path.join(root, 'skills/agent-adapter/SKILL.md'), skill('agent-adapter', 'Deep-dive.', 'x'));
  fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'docs/subagents.md'),
    'isolation audit sequential parent skill picker. Gear 1. agent-adapter. Skills-only WK_SUBAGENTS. launch-prompt eval adapter. wk eval miss-rate.\n'
  );
  return root;
}

describe('renderSubagentStub', () => {
  it('emits a thin Cursor agent with skill description, load path, and readonly for audit', () => {
    const stub = renderSubagentStub({
      name: 'agent-review',
      description: 'Reviews diffs. Use when the user asks for a PR review.',
      readonly: true,
      sameSessionTdd: false
    });
    assert.match(stub, /^---\nname: agent-review\n/);
    assert.match(stub, /readonly: true/);
    assert.match(stub, /model: inherit/);
    assert.match(stub, /skills\/agent-review\/SKILL\.md/);
    assert.match(stub, /kit-knowledge/);
    assert.match(stub, /wk model resolve --skill agent-review/);
    assert.doesNotMatch(stub, /gpt-|opus|kimi/i);
    assert.ok(stub.split('\n').length <= SUBAGENT_STUB_LINE_BUDGET);
  });

  it('forbids splitting TDD gears in the tdd stub', () => {
    const stub = renderSubagentStub({
      name: 'agent-tdd',
      description: 'TDD short loop.',
      readonly: false,
      sameSessionTdd: true
    });
    assert.match(stub, /gear 1/i);
    assert.match(stub, /gear 2/i);
    assert.match(stub, /same session/i);
    assert.match(stub, /agent-adapter/);
  });
});

describe('generateSubagentStubs and verifySubagentStubs', () => {
  it('writes one stub per generate role and does not copy the skill playbook', () => {
    const root = writeTree();
    const written = generateSubagentStubs(root);
    assert.deepEqual(written.sort(), ['agent-review.md', 'agent-tdd.md']);
    const review = fs.readFileSync(path.join(root, AGENTS_DIR_REL, 'agent-review.md'), 'utf8');
    assert.match(review, /readonly: true/);
    assert.match(review, /PR review/);
    assert.doesNotMatch(review, new RegExp(PLAYBOOK));
    assert.doesNotMatch(review, /Interaction Mandate/);
    const tdd = fs.readFileSync(path.join(root, AGENTS_DIR_REL, 'agent-tdd.md'), 'utf8');
    assert.match(tdd, /same session/i);
    assert.doesNotMatch(tdd, /readonly: true/);
    const result = verifySubagentStubs(root);
    assert.equal(result.ok, true, result.errors.join('\n'));
  });

  it('fails verify when a stub is stale, fat, or an extra agent file appears', () => {
    const root = writeTree();
    generateSubagentStubs(root);
    fs.writeFileSync(path.join(root, AGENTS_DIR_REL, 'agent-review.md'), '---\nname: agent-review\n---\n'.repeat(80));
    fs.writeFileSync(path.join(root, AGENTS_DIR_REL, 'agent-copy.md'), 'stale extra\n');
    const result = verifySubagentStubs(root);
    assert.equal(result.ok, false);
    assert.match(result.errors.join('\n'), /stale|line budget|agent-copy/i);
  });

  it('keeps committed Waykit stubs current, thin, and free of skill playbooks', () => {
    const result = verifySubagentStubs(kitRoot);
    assert.equal(result.ok, true, result.errors.join('\n'));
    const review = fs.readFileSync(path.join(kitRoot, AGENTS_DIR_REL, 'agent-review.md'), 'utf8');
    assert.match(review, /readonly: true/);
    const skill = fs.readFileSync(path.join(kitRoot, 'skills/agent-review/SKILL.md'), 'utf8');
    const body = skill.replace(/^---[\s\S]*?\n---\n/, '');
    const longLine = body
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.length > 60 && line.startsWith('You review'));
    if (longLine) {
      assert.equal(review.includes(longLine), false);
    }
    const tdd = fs.readFileSync(path.join(kitRoot, AGENTS_DIR_REL, 'agent-tdd.md'), 'utf8');
    assert.match(tdd, /Do not split gear 1 and gear 2/);
  });
});
