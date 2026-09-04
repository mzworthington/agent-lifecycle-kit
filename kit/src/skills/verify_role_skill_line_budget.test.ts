import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import {
  printRoleSkillLineBudgetResult,
  verifyRoleSkillLineBudget,
  type RoleSkillLineBudgetResult
} from './verify_role_skill_line_budget.js';

function writeSkill(root: string, name: string, kind: string, bodyLines: number): void {
  const dir = path.join(root, 'skills', name);
  fs.mkdirSync(dir, { recursive: true });
  const body = Array.from({ length: bodyLines }, (_, i) => `line ${i}`).join('\n') + '\n';
  fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\nname: ${name}\nkind: ${kind}\n---\n${body}`);
}

function skillRepo(skills: Array<{ name: string; kind: string; bodyLines: number }>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-role-budget-'));
  fs.mkdirSync(path.join(root, 'skills'));
  for (const skill of skills) {
    writeSkill(root, skill.name, skill.kind, skill.bodyLines);
  }
  return root;
}

const tight = { budget: 10, allowlist: [] as const };

describe('verifyRoleSkillLineBudget', () => {
  it('fails a role skill whose body exceeds the budget, naming the skill and count', () => {
    const root = skillRepo([{ name: 'agent-fat', kind: 'role', bodyLines: 12 }]);
    const result = verifyRoleSkillLineBudget(root, tight);
    assert.equal(result.ok, false);
    assert.deepEqual(result.violations, [{ skill: 'agent-fat', lines: 12, budget: 10 }]);
    assert.deepEqual(result.allowed, []);
  });

  it('reports an over-budget allowlisted skill as allowed, not as a silent skip', () => {
    const root = skillRepo([{ name: 'agent-prune', kind: 'role', bodyLines: 12 }]);
    const result = verifyRoleSkillLineBudget(root, { budget: 10, allowlist: ['agent-prune'] });
    assert.equal(result.ok, true);
    assert.deepEqual(result.violations, []);
    assert.deepEqual(result.allowed, [{ skill: 'agent-prune', lines: 12, budget: 10 }]);
  });

  it('does not gate profile or lang skills that exceed the role budget', () => {
    const root = skillRepo([
      { name: 'lang-go', kind: 'profile', bodyLines: 40 },
      { name: 'agent-tdd', kind: 'role', bodyLines: 8 }
    ]);
    const result = verifyRoleSkillLineBudget(root, tight);
    assert.equal(result.ok, true);
    assert.deepEqual(result.violations, []);
    assert.deepEqual(result.allowed, []);
  });
});

describe('printRoleSkillLineBudgetResult', () => {
  it('prints allowed over-budget skills instead of omitting them', () => {
    const result: RoleSkillLineBudgetResult = {
      ok: true,
      budget: 150,
      violations: [],
      allowed: [{ skill: 'agent-prune', lines: 162, budget: 150 }]
    };
    const lines: string[] = [];
    const log = console.log;
    const error = console.error;
    console.log = (...args: unknown[]) => {
      lines.push(args.map(String).join(' '));
    };
    console.error = (...args: unknown[]) => {
      lines.push(args.map(String).join(' '));
    };
    try {
      printRoleSkillLineBudgetResult(result);
    } finally {
      console.log = log;
      console.error = error;
    }
    const joined = lines.join('\n');
    assert.match(joined, /ALLOWED/);
    assert.match(joined, /agent-prune/);
    assert.match(joined, /162/);
    assert.doesNotMatch(joined, /ERROR:/);
  });
});
