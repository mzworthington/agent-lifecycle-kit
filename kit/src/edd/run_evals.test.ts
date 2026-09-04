import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { runEvals } from './run_evals.js';

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

describe('runEvals', () => {
  it('passes when the target skill exists and the prompt has no forbidden patterns', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-eval-'));
    writeSkill(root, 'agent-tdd', ['tdd']);
    fs.mkdirSync(path.join(root, 'evals', 'suites'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'evals', 'suites', 'ok.json'),
      JSON.stringify({
        suite: 'ok',
        test_cases: [
          {
            id: 'EVAL-TDD-001',
            name: 'green',
            target_skill: 'agent-tdd',
            prompt: 'write a failing test first',
            assertions: { forbidden_patterns: [': any'] }
          }
        ]
      }),
      'utf8'
    );
    assert.equal(runEvals(root), true);
  });

  it('fails when the target skill is missing or has no triggers', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-eval-'));
    writeSkill(root, 'agent-empty', []);
    fs.mkdirSync(path.join(root, 'evals', 'suites'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'evals', 'suites', 'bad.json'),
      JSON.stringify({
        suite: 'bad',
        test_cases: [
          {
            id: 'EVAL-MISS-001',
            name: 'missing',
            target_skill: 'agent-nope',
            prompt: 'hello',
            assertions: {}
          },
          {
            id: 'EVAL-EMPTY-001',
            name: 'empty triggers',
            target_skill: 'agent-empty',
            prompt: 'hello',
            assertions: {}
          }
        ]
      }),
      'utf8'
    );
    assert.equal(runEvals(root), false);
  });

  it('fails when the prompt contains a forbidden pattern', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-eval-'));
    writeSkill(root, 'agent-tdd', ['tdd']);
    fs.mkdirSync(path.join(root, 'evals', 'suites'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'evals', 'suites', 'forbid.json'),
      JSON.stringify({
        suite: 'forbid',
        test_cases: [
          {
            id: 'EVAL-TDD-001',
            name: 'any',
            target_skill: 'agent-tdd',
            prompt: 'please use : any here',
            assertions: { forbidden_patterns: [': any'] }
          }
        ]
      }),
      'utf8'
    );
    assert.equal(runEvals(root), false);
  });

  it('fails when required_patterns are missing from the skill body', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-eval-'));
    writeSkill(root, 'agent-tdd', ['tdd']);
    fs.mkdirSync(path.join(root, 'evals', 'suites'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'evals', 'suites', 'patterns.json'),
      JSON.stringify({
        suite: 'patterns',
        test_cases: [
          {
            id: 'EVAL-TDD-PAT',
            name: 'missing body contract',
            target_skill: 'agent-tdd',
            prompt: 'tdd',
            assertions: { required_patterns: ['Red-Green-Refactor Plan'] }
          }
        ]
      }),
      'utf8'
    );
    assert.equal(runEvals(root), false);
  });

  it('passes when required_patterns and required_output_sections are in the skill body', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-eval-'));
    writeSkill(root, 'agent-tdd', ['tdd']);
    fs.appendFileSync(path.join(root, 'skills', 'agent-tdd', 'SKILL.md'), '\nRed-Green-Refactor Plan\nPort Interface\n');
    fs.mkdirSync(path.join(root, 'evals', 'suites'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'evals', 'suites', 'patterns-ok.json'),
      JSON.stringify({
        suite: 'patterns-ok',
        test_cases: [
          {
            id: 'EVAL-TDD-OK',
            name: 'body contract',
            target_skill: 'agent-tdd',
            prompt: 'tdd',
            assertions: {
              required_patterns: ['Port Interface'],
              required_output_sections: ['Red-Green-Refactor Plan']
            }
          }
        ]
      }),
      'utf8'
    );
    assert.equal(runEvals(root), true);
  });

  it('passes with zero suites', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-eval-'));
    assert.equal(runEvals(root), true);
  });

  it('names the harness skill-trigger hygiene, not live routing', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-eval-'));
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
      assert.equal(runEvals(root), true);
    } finally {
      console.log = log;
      console.error = error;
    }
    const text = lines.join('\n');
    assert.match(text, /Skill-trigger harness \(registration \/ prompt hygiene\)/);
    assert.match(text, /ok    eval/);
    assert.doesNotMatch(text, /live trigger/i);
  });
});
