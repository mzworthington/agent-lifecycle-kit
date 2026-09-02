import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { judgeBackendForStyle, resolveEvalRun } from './eval-style.js';

describe('resolveEvalRun', () => {
  it('defaults to local for scripted/local models even when a key is set', () => {
    const run = resolveEvalRun({ model: 'scripted', apiKey: 'sk-test' });
    assert.equal(run.style, 'local');
    assert.equal(judgeBackendForStyle(run.style), 'heuristic');
  });

  it('infers http from a provider model plus key or base URL', () => {
    assert.equal(resolveEvalRun({ model: 'gpt-4o-mini', apiKey: 'sk' }).style, 'http');
    assert.equal(
      resolveEvalRun({ model: 'llama3.1', baseUrl: 'http://localhost:11434/v1' }).style,
      'http'
    );
    assert.equal(judgeBackendForStyle('http'), 'http');
  });

  it('keeps gemini without a key on local (no accidental HTTP)', () => {
    assert.equal(resolveEvalRun({ model: 'gemini-2.5-flash' }).style, 'local');
    assert.equal(resolveEvalRun({ model: 'gemini-2.5-flash', apiKey: 'AIza' }).style, 'http');
  });

  it('uses --style for both agent and judge', () => {
    assert.equal(resolveEvalRun({ style: 'local', model: 'scripted' }).style, 'local');
    assert.equal(
      resolveEvalRun({ style: 'http', model: 'gpt-4o-mini', apiKey: 'sk' }).style,
      'http'
    );
    const cli = resolveEvalRun({
      style: 'cli',
      model: 'cursor-grok-4.6-medium',
      cli: 'cursor-agent'
    });
    assert.equal(cli.style, 'cli');
    assert.equal(cli.cli, 'cursor-agent');
    assert.equal(judgeBackendForStyle('cli'), 'cli');
  });

  it('treats --cli without --style as cli', () => {
    const run = resolveEvalRun({ model: 'cursor-grok-4.6-medium', cli: 'claude' });
    assert.equal(run.style, 'cli');
    assert.equal(run.cli, 'claude');
  });

  it('requires --cli and a real model for the cli style', () => {
    assert.throws(
      () => resolveEvalRun({ style: 'cli', model: 'cursor-grok-4.6-medium' }),
      /requires --cli/
    );
    assert.throws(() => resolveEvalRun({ style: 'cli', model: 'scripted', cli: 'claude' }), /requires --model/);
    assert.throws(() => resolveEvalRun({ style: 'http', model: 'local' }), /requires --model/);
    assert.throws(
      () => resolveEvalRun({ style: 'local', model: 'scripted', cli: 'claude' }),
      /only valid with --style cli/
    );
  });
});
