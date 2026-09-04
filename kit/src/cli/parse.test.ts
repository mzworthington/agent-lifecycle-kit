import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import { firstPositional, flagValue, hasFlag } from './flags.js';
import { parseKitArgv } from './parse.js';

const opts = { cwd: '/work', repoDir: '/kit' };

describe('flag helpers', () => {
  it('reads a named flag value and presence', () => {
    assert.equal(flagValue(['--out', 'site'], '--out'), 'site');
    assert.equal(flagValue(['--out'], '--out'), undefined);
    assert.equal(flagValue(['--suite'], '--missing'), undefined);
    assert.equal(hasFlag(['--install'], '--install'), true);
    assert.equal(hasFlag([], '--install'), false);
  });

  it('takes the first non-flag positional', () => {
    assert.equal(firstPositional(['--check', './app']), './app');
    assert.equal(firstPositional(['--skip-mcp']), undefined);
  });
});

describe('parseKitArgv', () => {
  it('treats missing args, help, -h, and --help as help', () => {
    assert.deepEqual(parseKitArgv([], opts), { kind: 'help' });
    assert.deepEqual(parseKitArgv(['help'], opts), { kind: 'help' });
    assert.deepEqual(parseKitArgv(['-h'], opts), { kind: 'help' });
    assert.deepEqual(parseKitArgv(['--help'], opts), { kind: 'help' });
  });

  it('returns unknown for an unrecognized command', () => {
    assert.deepEqual(parseKitArgv(['nope'], opts), { kind: 'unknown', command: 'nope' });
  });

  it('resolves init target from --target over a positional directory', () => {
    assert.deepEqual(parseKitArgv(['init', './app', '--target', './other', '--mcp', 'collab', '--hook'], opts), {
      kind: 'init',
      targetDir: path.resolve('/work', './other'),
      mcpProfile: 'collab',
      installMCP: true,
      installIDE: true,
      installHook: true,
      hosts: ['cursor', 'claude', 'copilot', 'antigravity']
    });
  });

  it('resolves init from a positional directory and skip flags', () => {
    assert.deepEqual(parseKitArgv(['init', './app', '--skip-mcp', '--skip-ide'], opts), {
      kind: 'init',
      targetDir: path.resolve('/work', './app'),
      mcpProfile: 'default',
      installMCP: false,
      installIDE: false,
      installHook: false,
      hosts: ['cursor', 'claude', 'copilot', 'antigravity']
    });
  });

  it('defaults init to cwd when flags come first (directory is not a later positional)', () => {
    const parsed = parseKitArgv(['init', '--mcp', 'collab'], opts);
    assert.equal(parsed.kind, 'init');
    if (parsed.kind !== 'init') return;
    assert.equal(parsed.targetDir, path.resolve('/work', '.'));
    assert.equal(parsed.mcpProfile, 'collab');
  });

  it('passes eval rest through for EDD subcommands vs bare eval', () => {
    assert.deepEqual(parseKitArgv(['eval'], opts), { kind: 'eval', rest: [] });
    assert.deepEqual(parseKitArgv(['eval', 'run', '--suite', 'a.yaml'], opts), {
      kind: 'eval',
      rest: ['run', '--suite', 'a.yaml']
    });
  });

  it('parses site assemble with optional --out', () => {
    assert.deepEqual(parseKitArgv(['site', 'assemble'], opts), { kind: 'site-assemble', dest: undefined });
    assert.deepEqual(parseKitArgv(['site', 'assemble', '--out', 'dist/site'], opts), {
      kind: 'site-assemble',
      dest: path.resolve('/work', 'dist/site')
    });
  });

  it('returns usage when site assemble --out has no value', () => {
    assert.deepEqual(parseKitArgv(['site', 'assemble', '--out'], opts), {
      kind: 'usage',
      message: 'Usage: wk site assemble [--out <dir>]'
    });
  });

  it('returns usage for incomplete nested verbs', () => {
    assert.equal(parseKitArgv(['ontology'], opts).kind, 'usage');
    assert.equal(parseKitArgv(['memory'], opts).kind, 'usage');
    assert.equal(parseKitArgv(['site'], opts).kind, 'usage');
    assert.equal(parseKitArgv(['debug-board'], opts).kind, 'usage');
  });

  it('parses ontology, memory, and scan alias', () => {
    assert.deepEqual(parseKitArgv(['ontology', 'generate'], opts), { kind: 'ontology', sub: 'generate' });
    assert.deepEqual(parseKitArgv(['ontology', 'check'], opts), { kind: 'ontology', sub: 'check' });
    assert.deepEqual(parseKitArgv(['memory', 'lint'], opts), { kind: 'memory-lint' });
    assert.deepEqual(parseKitArgv(['scan'], opts), { kind: 'audit' });
  });

  it('parses model resolve and requires skill or phase', () => {
    assert.equal(parseKitArgv(['model'], opts).kind, 'usage');
    assert.equal(parseKitArgv(['model', 'resolve'], opts).kind, 'usage');
    assert.deepEqual(parseKitArgv(['model', 'resolve', '--skill', 'agent-tdd', '--spec-complete', '--host', 'cursor'], opts), {
      kind: 'model-resolve',
      skill: 'agent-tdd',
      phase: undefined,
      host: 'cursor',
      specComplete: true,
      blocked: false
    });
  });

  it('parses export-rules dir and --check', () => {
    assert.deepEqual(parseKitArgv(['export-rules'], opts), { kind: 'export-rules', dir: '/kit', check: false });
    assert.deepEqual(parseKitArgv(['export-rules', '--check', './app'], opts), {
      kind: 'export-rules',
      dir: path.resolve('/work', './app'),
      check: true
    });
  });

  it('parses mcp profile, --install, --project, --host, and -o', () => {
    assert.deepEqual(parseKitArgv(['mcp', 'ops', '--install', '-o', 'out.json'], opts), {
      kind: 'mcp',
      profile: 'ops',
      install: true,
      project: false,
      outputFile: 'out.json',
      hosts: ['cursor', 'claude', 'copilot', 'antigravity']
    });
    assert.deepEqual(parseKitArgv(['mcp', '--install', '--host', 'claude'], opts), {
      kind: 'mcp',
      profile: 'default',
      install: true,
      project: false,
      outputFile: undefined,
      hosts: ['claude']
    });
    assert.deepEqual(parseKitArgv(['mcp', 'default', '--project', '--host', 'copilot,agy'], opts), {
      kind: 'mcp',
      profile: 'default',
      install: false,
      project: true,
      outputFile: undefined,
      hosts: ['copilot', 'antigravity']
    });
  });

  it('parses align directory, --write, and --owned --scan', () => {
    assert.deepEqual(parseKitArgv(['align'], opts), {
      kind: 'align',
      targetDir: path.resolve('/work', '.'),
      write: false,
      owned: false,
      scanDir: undefined,
      login: undefined
    });
    assert.deepEqual(parseKitArgv(['align', './app', '--write'], opts), {
      kind: 'align',
      targetDir: path.resolve('/work', './app'),
      write: true,
      owned: false,
      scanDir: undefined,
      login: undefined
    });
    assert.deepEqual(parseKitArgv(['align', '--owned', '--scan', '../dev', '--login', 'mzworthington'], opts), {
      kind: 'align',
      targetDir: path.resolve('/work', '.'),
      write: false,
      owned: true,
      scanDir: path.resolve('/work', '../dev'),
      login: 'mzworthington'
    });
  });

  it('parses version and --check', () => {
    assert.deepEqual(parseKitArgv(['version'], opts), { kind: 'version', check: false });
    assert.deepEqual(parseKitArgv(['version', '--check'], opts), { kind: 'version', check: true });
  });

  it('parses doctor check-first flags and defaults cwd', () => {
    assert.deepEqual(parseKitArgv(['doctor'], opts), {
      kind: 'doctor',
      targetDir: path.resolve('/work', '.'),
      write: false,
      owned: false,
      scanDir: undefined,
      repoClass: undefined,
      installHook: false,
      login: undefined
    });
    assert.deepEqual(
      parseKitArgv(
        ['doctor', './app', '--write', '--owned', '--scan', '../dev', '--class', 'product', '--hook', '--login', 'mzworthington'],
        opts
      ),
      {
        kind: 'doctor',
        targetDir: path.resolve('/work', './app'),
        write: true,
        owned: true,
        scanDir: path.resolve('/work', '../dev'),
        repoClass: 'product',
        installHook: true,
        login: 'mzworthington'
      }
    );
  });

  it('returns usage for an unknown doctor --class', () => {
    assert.equal(parseKitArgv(['doctor', '--class', 'nope'], opts).kind, 'usage');
  });

  it('parses commit-msg from --message or a file path', () => {
    assert.deepEqual(parseKitArgv(['commit-msg', '--message', 'feat(cli): add hook'], opts), {
      kind: 'commit-msg',
      message: 'feat(cli): add hook',
      file: undefined
    });
    assert.deepEqual(parseKitArgv(['commit-msg', '.git/COMMIT_EDITMSG'], opts), {
      kind: 'commit-msg',
      message: undefined,
      file: path.resolve('/work', '.git/COMMIT_EDITMSG')
    });
    assert.equal(parseKitArgv(['commit-msg'], opts).kind, 'usage');
    assert.equal(parseKitArgv(['commit-msg', '--message'], opts).kind, 'usage');
  });

  it('parses completion zsh or bash and rejects other shells', () => {
    assert.deepEqual(parseKitArgv(['completion', 'zsh'], opts), { kind: 'completion', shell: 'zsh' });
    assert.deepEqual(parseKitArgv(['completion', 'bash'], opts), { kind: 'completion', shell: 'bash' });
    assert.equal(parseKitArgv(['completion'], opts).kind, 'usage');
    assert.equal(parseKitArgv(['completion', 'fish'], opts).kind, 'usage');
  });

  it('parses live complete words and completion install', () => {
    assert.deepEqual(parseKitArgv(['__complete', '--', 'wk', 'eval', 'r'], opts), {
      kind: 'complete',
      words: ['wk', 'eval', 'r']
    });
    assert.deepEqual(parseKitArgv(['completion', 'install'], opts), {
      kind: 'completion-install',
      shell: undefined
    });
    assert.deepEqual(parseKitArgv(['completion', 'install', 'zsh'], opts), {
      kind: 'completion-install',
      shell: 'zsh'
    });
    assert.equal(parseKitArgv(['completion', 'install', 'fish'], opts).kind, 'usage');
  });
});
