import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { validateEvals } from './validate_evals.js';

const MIN_SCHEMA = {
  type: 'object',
  required: ['suite', 'description', 'version', 'test_cases'],
  properties: {
    suite: { type: 'string' },
    description: { type: 'string' },
    version: { type: 'string' },
    test_cases: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'name', 'target_skill', 'prompt', 'assertions'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          target_skill: { type: 'string' },
          prompt: { type: 'string' },
          assertions: { type: 'object' }
        }
      }
    }
  }
};

function writeSkill(root: string, name: string, triggers: string[]): void {
  const dir = path.join(root, 'skills', name);
  fs.mkdirSync(dir, { recursive: true });
  const triggerYaml = triggers.map((t) => `  - ${t}`).join('\n');
  fs.writeFileSync(
    path.join(dir, 'SKILL.md'),
    `---\nname: ${name}\ndescription: test\ntriggers:\n${triggerYaml}\n---\n# ${name}\n`,
    'utf8'
  );
}

function validCase(id: string, skill: string): Record<string, unknown> {
  return {
    id,
    name: 'case',
    target_skill: skill,
    prompt: 'do the thing',
    assertions: { required_triggers: ['tdd'] }
  };
}

describe('validateEvals', () => {
  it('accepts a schema-valid suite that points at an existing skill', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-val-'));
    fs.mkdirSync(path.join(root, 'evals'), { recursive: true });
    fs.writeFileSync(path.join(root, 'evals', 'schema.json'), JSON.stringify(MIN_SCHEMA), 'utf8');
    writeSkill(root, 'agent-tdd', ['tdd', 'red green']);
    fs.mkdirSync(path.join(root, 'evals', 'suites'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'evals', 'suites', 'ok.json'),
      JSON.stringify({
        suite: 'ok',
        description: 'ok',
        version: '1.0.0',
        test_cases: [validCase('EVAL-TDD-001', 'agent-tdd')]
      }),
      'utf8'
    );
    const result = validateEvals(root);
    assert.equal(result.ok, true);
    assert.equal(result.totalSuites, 1);
    assert.equal(result.totalTests, 1);
  });

  it('fails invalid JSON and missing target skills', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-val-'));
    fs.mkdirSync(path.join(root, 'evals', 'suites'), { recursive: true });
    fs.writeFileSync(path.join(root, 'evals', 'schema.json'), JSON.stringify(MIN_SCHEMA), 'utf8');
    writeSkill(root, 'agent-tdd', ['tdd']);
    fs.writeFileSync(path.join(root, 'evals', 'suites', 'bad.json'), '{not json', 'utf8');
    fs.writeFileSync(
      path.join(root, 'evals', 'suites', 'missing-skill.json'),
      JSON.stringify({
        suite: 'missing',
        description: 'd',
        version: '1.0.0',
        test_cases: [validCase('EVAL-X-001', 'agent-missing')]
      }),
      'utf8'
    );
    const result = validateEvals(root);
    assert.equal(result.ok, false);
    assert.ok(result.errors >= 2);
  });

  it('falls back to structural checks when schema.json is missing', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-val-'));
    fs.mkdirSync(path.join(root, 'evals', 'suites'), { recursive: true });
    writeSkill(root, 'agent-tdd', ['tdd']);
    fs.writeFileSync(
      path.join(root, 'evals', 'suites', 'thin.json'),
      JSON.stringify({ suite: 'thin', version: '1', test_cases: [validCase('EVAL-TDD-001', 'agent-tdd')] }),
      'utf8'
    );
    const result = validateEvals(root);
    assert.equal(result.ok, true);
  });

  it('treats a missing required trigger as a warning, not an error', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-val-'));
    fs.mkdirSync(path.join(root, 'evals'), { recursive: true });
    fs.writeFileSync(path.join(root, 'evals', 'schema.json'), JSON.stringify(MIN_SCHEMA), 'utf8');
    writeSkill(root, 'agent-tdd', ['tdd']);
    fs.mkdirSync(path.join(root, 'evals', 'suites'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'evals', 'suites', 'warn.json'),
      JSON.stringify({
        suite: 'warn',
        description: 'd',
        version: '1.0.0',
        test_cases: [
          {
            ...validCase('EVAL-TDD-001', 'agent-tdd'),
            assertions: { required_triggers: ['definitely-not-a-trigger'] }
          }
        ]
      }),
      'utf8'
    );
    const result = validateEvals(root);
    assert.equal(result.ok, true);
    assert.equal(result.errors, 0);
  });

  it('fails when an agent skill is missing from routing-matrix or lifecycle-roles', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-val-'));
    fs.mkdirSync(path.join(root, 'evals'), { recursive: true });
    fs.writeFileSync(path.join(root, 'evals', 'schema.json'), JSON.stringify(MIN_SCHEMA), 'utf8');
    writeSkill(root, 'agent-tdd', ['tdd']);
    writeSkill(root, 'agent-xfn', ['xfn']);
    fs.mkdirSync(path.join(root, 'evals', 'suites'), { recursive: true });
    const covered = {
      suite: 'routing-matrix',
      description: 'd',
      version: '1.0.0',
      test_cases: [validCase('EVAL-ROUTE-001', 'agent-tdd')]
    };
    fs.writeFileSync(path.join(root, 'evals', 'suites', 'routing-matrix.json'), JSON.stringify(covered), 'utf8');
    fs.writeFileSync(
      path.join(root, 'evals', 'suites', 'lifecycle-roles.json'),
      JSON.stringify({
        suite: 'lifecycle-roles',
        description: 'd',
        version: '1.0.0',
        test_cases: [validCase('EVAL-TDD-001', 'agent-tdd'), validCase('EVAL-XFN-001', 'agent-xfn')]
      }),
      'utf8'
    );
    const result = validateEvals(root);
    assert.equal(result.ok, false);
    assert.ok(result.errors >= 1);
  });

  it('fails when a stack profile is missing from stack-profiles', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-val-'));
    fs.mkdirSync(path.join(root, 'evals'), { recursive: true });
    fs.writeFileSync(path.join(root, 'evals', 'schema.json'), JSON.stringify(MIN_SCHEMA), 'utf8');
    writeSkill(root, 'lang-python', ['python']);
    writeSkill(root, 'lang-go', ['golang']);
    fs.mkdirSync(path.join(root, 'evals', 'suites'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'evals', 'suites', 'stack-profiles.json'),
      JSON.stringify({
        suite: 'stack-profiles',
        description: 'd',
        version: '1.0.0',
        test_cases: [validCase('EVAL-LANG-PYTHON-001', 'lang-python')]
      }),
      'utf8'
    );
    const result = validateEvals(root);
    assert.equal(result.ok, false);
    assert.ok(result.errors >= 1);
  });
});
