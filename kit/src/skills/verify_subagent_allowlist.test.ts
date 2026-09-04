import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  STAY_SKILL_PREFIXES,
  listGenerateSubagents,
  resolveSkillsOnlyMode,
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
expandKillIndicator: Promote misses with wk eval dataset from-trace into evals/edd/subagent_routing.jsonl versus evals/suites/routing-matrix.json.
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

const docsOk =
  '# Subagents\n\nIsolation, readonly audit, sequential specialists, parent only.\nGear 1 and gear 2 stay one agent. Escape hatch: agent-adapter. Freeze if worse than the skill picker.\nSkills-only: WK_SUBAGENTS=0. wk agents launch-prompt. eval adapter. wk eval compare.\n';

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
      'docs/subagents.md': docsOk
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
      'docs/subagents.md': docsOk
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
      'docs/subagents.md': docsOk
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
    assert.equal(result.catalog?.skillsOnly, false);
    assert.match(docs, /WK_SUBAGENTS/);
    assert.match(docs, /skills-only/i);
    assert.match(docs, /launch-prompt/);
    assert.match(docs, /eval adapter/i);
    assert.match(result.catalog?.expandKillIndicator ?? '', /from-trace/);
    assert.match(result.catalog?.expandKillIndicator ?? '', /routing-matrix/);
    assert.match(docs, /wk eval compare/);
  });

  it('fails when freeze is indicated and a specialist is added anyway', () => {
    const freezeYaml = validYaml.replace(
      'Freeze this generate list if auto-delegation is worse than today\'s skill picker.',
      'Freeze the generate list.'
    ).replace(
      'agent-adapter:\n    runtime: skill\n',
      'agent-adapter:\n    runtime: skill\n  agent-copy:\n    runtime: subagent\n    bucket: isolation\n    readonly: false\n'
    );
    const root = writeTree({
      'skills/subagents.yaml': freezeYaml,
      'skills/agent-orchestrator/SKILL.md': '---\nname: agent-orchestrator\n---\n',
      'skills/agent-debug/SKILL.md': '---\nname: agent-debug\n---\n',
      'skills/agent-review/SKILL.md': '---\nname: agent-review\n---\n',
      'skills/agent-spec/SKILL.md': '---\nname: agent-spec\ntriggers:\n  - gherkin\n---\n',
      'skills/agent-tdd/SKILL.md': '---\nname: agent-tdd\n---\n',
      'skills/agent-adapter/SKILL.md': '---\nname: agent-adapter\n---\n',
      'skills/agent-copy/SKILL.md': '---\nname: agent-copy\n---\n',
      'docs/subagents.md': docsOk,
      'evals/edd/subagent_routing.jsonl': `${JSON.stringify({
        id: 'trace-miss',
        prompt: 'Please isolate the noisy CI logs from last night.',
        tags: ['prod-derived'],
        expect: { tool: 'launch_specialist', arguments_contains: { specialist: 'agent-debug' } }
      })}\n`,
      'evals/suites/routing-matrix.json': JSON.stringify({
        suite: 'routing-matrix',
        test_cases: [{ id: 'r1', prompt: 'Write gherkin for export', target_skill: 'agent-spec' }]
      })
    });
    const result = verifySubagentAllowlist(root);
    assert.equal(result.ok, false);
    assert.match(result.errors.join('\n'), /frozen/);
    assert.match(result.errors.join('\n'), /agent-copy/);
  });

  it('fails when freeze is indicated and expandKill still tells you to add a role', () => {
    const staleKill = validYaml.replace(
      'Freeze this generate list if auto-delegation is worse than today\'s skill picker.',
      'Freeze this generate list if worse than the skill picker. Fix thin handovers before adding roles.'
    );
    const root = writeTree({
      'skills/subagents.yaml': staleKill,
      'skills/agent-orchestrator/SKILL.md': '---\nname: agent-orchestrator\n---\n',
      'skills/agent-debug/SKILL.md': '---\nname: agent-debug\n---\n',
      'skills/agent-review/SKILL.md': '---\nname: agent-review\n---\n',
      'skills/agent-spec/SKILL.md': '---\nname: agent-spec\ntriggers:\n  - gherkin\n---\n',
      'skills/agent-tdd/SKILL.md': '---\nname: agent-tdd\n---\n',
      'skills/agent-adapter/SKILL.md': '---\nname: agent-adapter\n---\n',
      'docs/subagents.md': docsOk,
      'evals/edd/subagent_routing.jsonl': `${JSON.stringify({
        id: 'trace-miss',
        prompt: 'Please isolate the noisy CI logs from last night.',
        tags: ['prod-derived'],
        expect: { tool: 'launch_specialist', arguments_contains: { specialist: 'agent-debug' } }
      })}\n`,
      'evals/suites/routing-matrix.json': JSON.stringify({
        suite: 'routing-matrix',
        test_cases: [{ id: 'r1', prompt: 'Write gherkin for export', target_skill: 'agent-spec' }]
      })
    });
    const result = verifySubagentAllowlist(root);
    assert.equal(result.ok, false);
    assert.match(result.errors.join('\n'), /add a role|adding roles/i);
  });

  it('rejects a stale generate list that does not match roles', () => {
    const stale = `${validYaml}
generate:
  isolation: [agent-debug]
  audit: [agent-review]
  sequential: [agent-tdd]
  parent: [agent-orchestrator]
`;
    const root = writeTree({
      'skills/subagents.yaml': stale,
      'skills/agent-orchestrator/SKILL.md': 'x',
      'skills/agent-debug/SKILL.md': 'x',
      'skills/agent-review/SKILL.md': 'x',
      'skills/agent-spec/SKILL.md': 'x',
      'skills/agent-tdd/SKILL.md': 'x',
      'skills/agent-adapter/SKILL.md': 'x',
      'docs/subagents.md': docsOk
    });
    const result = verifySubagentAllowlist(root);
    assert.equal(result.ok, false);
    assert.match(result.errors.join('\n'), /must match roles/);
  });
});

describe('resolveSkillsOnlyMode', () => {
  it('follows the catalog when WK_SUBAGENTS is unset', () => {
    assert.equal(resolveSkillsOnlyMode({ catalogSkillsOnly: false, env: {} }), false);
    assert.equal(resolveSkillsOnlyMode({ catalogSkillsOnly: true, env: {} }), true);
  });

  it('treats WK_SUBAGENTS=0 as skills-only and WK_SUBAGENTS=1 as launch', () => {
    assert.equal(
      resolveSkillsOnlyMode({ catalogSkillsOnly: false, env: { WK_SUBAGENTS: '0' } }),
      true
    );
    assert.equal(
      resolveSkillsOnlyMode({ catalogSkillsOnly: true, env: { WK_SUBAGENTS: '1' } }),
      false
    );
  });
});
