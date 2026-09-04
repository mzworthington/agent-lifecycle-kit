import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { verifySkillsLayout } from './verify_skills_layout.js';

function skillTree(names: string[]): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-skills-'));
  const skills = path.join(root, 'skills');
  fs.mkdirSync(skills);
  fs.writeFileSync(path.join(skills, 'README.md'), '# skills\n');
  fs.writeFileSync(path.join(skills, 'external.lock.json'), '{}\n');
  fs.writeFileSync(path.join(skills, 'subagents.yaml'), 'version: 1\n');
  for (const name of names) {
    fs.mkdirSync(path.join(skills, name));
  }
  return root;
}

describe('verifySkillsLayout', () => {
  it('accepts kit-authored prefixes and known files', () => {
    const root = skillTree(['agent-tdd', 'profile-mcp', 'lang-go', 'framework-react']);
    const result = verifySkillsLayout(root);
    assert.equal(result.ok, true);
    assert.deepEqual(result.invalid, []);
  });

  it('rejects upstream skill directories in skills/', () => {
    const root = skillTree(['agent-tdd', 'cloudflare']);
    const result = verifySkillsLayout(root);
    assert.equal(result.ok, false);
    assert.deepEqual(result.invalid, ['cloudflare']);
  });

  it('treats a missing skills directory as valid', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-skills-'));
    assert.deepEqual(verifySkillsLayout(root), { ok: true, invalid: [] });
  });
});
