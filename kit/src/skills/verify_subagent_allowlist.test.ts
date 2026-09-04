import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  STAY_SKILL_PREFIXES,
  listGenerateSubagents,
  verifySubagentAllowlist
} from './verify_subagent_allowlist.js';

const kitRoot = fileURLToPath(new URL('../../..', import.meta.url));

function writeTree(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-subagents-'));
  for (const [rel, body] of Object.entries(files)) {
    const full = path.join(root, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, body);
  }
  return root;
}

const validYaml = `version: 1
expandKill: Freeze this generate list if auto-delegation is worse than today's skill picker.
staySkillPrefixes:
  - lang-
  - framework-
  - profile-
tdd:
  skill: agent-tdd
  gears: same-session
  escapeHatch: agent-adapter
generate:
  isolation: [agent-debug]
  audit: [agent-review]
  sequential: [agent-spec, agent-tdd]
  parent: [agent-orchestrator]
roles:
  agent-orchestrator:
    runtime: parent
  agent-debug:
    runtime: subagent
    bucket: isolation
    readonly: false
  agent-review:
    runtime: subagent
    bucket: audit
    readonly: true
  agent-spec:
    runtime: subagent
    bucket: sequential
    readonly: false
  agent-tdd:
    runtime: subagent
    bucket: sequential
    readonly: false
  agent-adapter:
    runtime: skill
`;

describe('verifySubagentAllowlist', () => {
  it('accepts a complete tree that keeps profiles as skills and TDD as one subagent', () => {
    const root = writeTree({
      'skills/subagents.yaml': validYaml,
      'skills/agent-orchestrator/SKILL.md': '---\nkind: role\n---\n',
      'skills/agent-debug/SKILL.md': '---\nkind: role\n---\n',
      'skills/agent-review/SKILL.md': '---\nkind: role\n---\n',
      'skills/agent-spec/SKILL.md': '---\nkind: role\n---\n',
      'skills/agent-tdd/SKILL.md': '---\nkind: role\n---\n',
      'skills/agent-adapter/SKILL.md': '---\nkind: role\n---\n',
      'skills/lang-go/SKILL.md': '---\nkind: profile\n---\n',
      'skills/framework-react/SKILL.md': '---\nkind: profile\n---\n',
      'skills/profile-api/SKILL.md': '---\nkind: profile\n---\n',
      'docs/subagents.md':
        '# Subagents\n\nIsolation, readonly audit, sequential specialists, parent only.\nGear 1 and gear 2 stay one agent. Escape hatch: agent-adapter. Freeze if worse than the skill picker.\n'
    });
    const result = verifySubagentAllowlist(root);
    assert.equal(result.ok, true, result.errors.join('\n'));
    assert.deepEqual(listGenerateSubagents(result.catalog).sort(), [
      'agent-debug',
      'agent-review',
      'agent-spec',
      'agent-tdd'
    ]);
    assert.equal(result.catalog?.roles['agent-tdd']?.runtime, 'subagent');
    assert.equal(result.catalog?.tdd.gears, 'same-session');
    assert.equal(result.catalog?.roles['agent-adapter']?.runtime, 'skill');
    assert.equal(result.catalog?.roles['agent-orchestrator']?.runtime, 'parent');
    assert.equal(result.runtimeFor('lang-go'), 'skill');
    assert.equal(result.runtimeFor('framework-react'), 'skill');
    assert.equal(result.runtimeFor('profile-api'), 'skill');
  });

  it('fails when a profile prefix is marked as a subagent', () => {
    const root = writeTree({
      'skills/subagents.yaml': validYaml.replace(
        'agent-adapter:\n    runtime: skill\n',
        'agent-adapter:\n    runtime: skill\n  lang-go:\n    runtime: subagent\n    bucket: isolation\n    readonly: false\n'
      ),
      'skills/agent-orchestrator/SKILL.md': 'x',
      'skills/agent-debug/SKILL.md': 'x',
      'skills/agent-review/SKILL.md': 'x',
      'skills/agent-spec/SKILL.md': 'x',
      'skills/agent-tdd/SKILL.md': 'x',
      'skills/agent-adapter/SKILL.md': 'x',
      'skills/lang-go/SKILL.md': 'x',
      'docs/subagents.md':
        'skill picker isolation audit sequential parent. Gear 1. agent-adapter.'
    });
    const result = verifySubagentAllowlist(root);
    assert.equal(result.ok, false);
    assert.match(result.errors.join('\n'), /lang-go/);
  });

  it('fails when TDD gears are split or the adapter is a second TDD subagent', () => {
    const split = validYaml.replace('gears: same-session', 'gears: split');
    const root = writeTree({
      'skills/subagents.yaml': split,
      'skills/agent-orchestrator/SKILL.md': 'x',
      'skills/agent-debug/SKILL.md': 'x',
      'skills/agent-review/SKILL.md': 'x',
      'skills/agent-spec/SKILL.md': 'x',
      'skills/agent-tdd/SKILL.md': 'x',
      'skills/agent-adapter/SKILL.md': 'x',
      'docs/subagents.md':
        'skill picker isolation audit sequential parent. Gear 1. agent-adapter.'
    });
    const result = verifySubagentAllowlist(root);
    assert.equal(result.ok, false);
    assert.match(result.errors.join('\n'), /same-session/);
  });

  it('fails when expandKill omits the skill-picker freeze', () => {
    const root = writeTree({
      'skills/subagents.yaml': validYaml.replace('skill picker', 'vibes'),
      'skills/agent-orchestrator/SKILL.md': 'x',
      'skills/agent-debug/SKILL.md': 'x',
      'skills/agent-review/SKILL.md': 'x',
      'skills/agent-spec/SKILL.md': 'x',
      'skills/agent-tdd/SKILL.md': 'x',
      'skills/agent-adapter/SKILL.md': 'x',
      'docs/subagents.md': 'isolation audit sequential parent'
    });
    const result = verifySubagentAllowlist(root);
    assert.equal(result.ok, false);
    assert.match(result.errors.join('\n'), /skill picker/i);
  });

  it('classifies the Waykit tree: generate list, profiles stay skills, TDD unsplit', () => {
    const result = verifySubagentAllowlist(kitRoot);
    assert.equal(result.ok, true, result.errors.join('\n'));
    assert.deepEqual(STAY_SKILL_PREFIXES, ['lang-', 'framework-', 'profile-']);
    assert.equal(result.runtimeFor('lang-typescript'), 'skill');
    assert.equal(result.runtimeFor('framework-react'), 'skill');
    assert.equal(result.runtimeFor('profile-iac'), 'skill');
    assert.equal(result.catalog?.roles['agent-orchestrator']?.runtime, 'parent');
    assert.equal(result.catalog?.tdd.gears, 'same-session');
    assert.equal(result.catalog?.tdd.escapeHatch, 'agent-adapter');
    assert.equal(result.catalog?.roles['agent-adapter']?.runtime, 'skill');
    assert.deepEqual(listGenerateSubagents(result.catalog).sort(), [
      'agent-arch-drift',
      'agent-debug',
      'agent-review',
      'agent-security',
      'agent-spec',
      'agent-tdd',
      'agent-xfn'
    ]);
    const docs = fs.readFileSync(path.join(kitRoot, 'docs/subagents.md'), 'utf8');
    assert.match(docs, /skill picker/i);
    assert.match(docs, /gear 1/i);
    assert.match(docs, /agent-adapter/);
  });
});
