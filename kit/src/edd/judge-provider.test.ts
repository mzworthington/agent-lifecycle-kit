import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { runLlmJudge, runCriteriaJudge } from './run-judges.js';
import {
  createCliJudgeCompletion,
  parseJudgeCliStdout,
  resolveJudgeApiKey,
  resolveJudgeBackend,
  resolveJudgeCompletion,
  type ExecFileFn
} from './judge-provider.js';

describe('parseJudgeCliStdout', () => {
  it('returns a raw judge object', () => {
    assert.deepEqual(parseJudgeCliStdout('{"score":"PASS","reasoning":"ok"}'), {
      score: 'PASS',
      reasoning: 'ok'
    });
  });

  it('unwraps Claude Code / Cursor result envelopes', () => {
    const envelope = JSON.stringify({
      type: 'result',
      result: '{"score":"FAIL","reasoning":"invented"}'
    });
    assert.deepEqual(parseJudgeCliStdout(envelope), {
      score: 'FAIL',
      reasoning: 'invented'
    });
  });

  it('extracts JSON embedded in prose', () => {
    assert.equal(parseJudgeCliStdout('Here you go:\n{"score":"PASS","reasoning":"fine"}\n').score, 'PASS');
  });
});

describe('resolveJudgeBackend', () => {
  it('defaults scripted models to heuristic even with an API key', () => {
    assert.equal(resolveJudgeBackend({ model: 'scripted', apiKey: 'sk-test' }), 'heuristic');
  });

  it('selects http for live models with a key or base URL', () => {
    assert.equal(resolveJudgeBackend({ model: 'gpt-4o-mini', apiKey: 'sk-test' }), 'http');
    assert.equal(
      resolveJudgeBackend({ model: 'llama3.1', baseUrl: 'http://localhost:11434/v1' }),
      'http'
    );
  });

  it('honors explicit cli / http / heuristic', () => {
    assert.equal(resolveJudgeBackend({ model: 'scripted', judge: 'cli' }), 'cli');
    assert.equal(resolveJudgeBackend({ model: 'scripted', judge: 'http', baseUrl: 'http://x' }), 'http');
    assert.equal(resolveJudgeBackend({ model: 'gpt-4o-mini', apiKey: 'k', judge: 'heuristic' }), 'heuristic');
  });
});

describe('resolveJudgeCompletion / apiKey', () => {
  it('returns undefined for heuristic and HTTP adapter for http', () => {
    assert.equal(resolveJudgeCompletion({ model: 'scripted' }), undefined);
    assert.ok(resolveJudgeCompletion({ model: 'llama3.1', baseUrl: 'http://localhost:11434/v1' }));
  });

  it('fills a dummy api key for local HTTP and CLI', () => {
    assert.equal(resolveJudgeApiKey(undefined, 'http://localhost:11434/v1', 'http'), 'local');
    assert.equal(resolveJudgeApiKey(undefined, undefined, 'cli'), 'cli');
    assert.equal(resolveJudgeApiKey('sk-real', undefined, 'http'), 'sk-real');
  });
});

describe('createCliJudgeCompletion', () => {
  it('shells out with preset args and parses stdout', async () => {
    const calls: Array<{ file: string; args: string[] }> = [];
    const execFile: ExecFileFn = async (file, args) => {
      calls.push({ file, args });
      return {
        stdout: JSON.stringify({ result: '{"score":"PASS","reasoning":"from-cli"}' }),
        stderr: ''
      };
    };
    const complete = createCliJudgeCompletion({ cli: 'claude', execFile });
    const parsed = await complete({
      model: 'scripted',
      prompt: 'grade this',
      apiKey: 'cli'
    });
    assert.deepEqual(parsed, { score: 'PASS', reasoning: 'from-cli' });
    assert.equal(calls[0]?.file, 'claude');
    assert.deepEqual(calls[0]?.args.slice(0, 4), ['-p', 'grade this', '--output-format', 'json']);
  });

  it('adds --trust for cursor-agent', async () => {
    const calls: Array<{ file: string; args: string[] }> = [];
    const execFile: ExecFileFn = async (file, args) => {
      calls.push({ file, args });
      return { stdout: '{"score":"PASS","reasoning":"ok"}', stderr: '' };
    };
    await createCliJudgeCompletion({ cli: 'cursor-agent', execFile })({
      model: 'composer',
      prompt: 'x',
      apiKey: 'cli'
    });
    assert.equal(calls[0]?.file, 'cursor-agent');
    assert.ok(calls[0]?.args.includes('--trust'));
    assert.ok(calls[0]?.args.includes('--model'));
    assert.ok(calls[0]?.args.includes('composer'));
  });
});

describe('runLlmJudge backends', () => {
  it('uses injected complete instead of the heuristic', async () => {
    const verdict = await runLlmJudge({
      prompt: 'Summarize',
      toolOutput: { component: 'payment-api' },
      agentResponse: 'payment-api talks to the legacy-monolith',
      model: 'scripted',
      complete: async () => ({ score: 'PASS', reasoning: 'trusted-complete' })
    });
    assert.equal(verdict.score, 'PASS');
    assert.equal(verdict.reasoning, 'trusted-complete');
    assert.equal(verdict.hallucinated, false);
  });

  it('keeps heuristic for scripted without complete', async () => {
    const verdict = await runLlmJudge({
      prompt: 'Summarize',
      toolOutput: { component: 'payment-api' },
      agentResponse: 'payment-api talks to the legacy-monolith',
      model: 'scripted'
    });
    assert.equal(verdict.score, 'FAIL');
    assert.equal(verdict.hallucinated, true);
  });

  it('uses CLI backend when requested', async () => {
    const complete = createCliJudgeCompletion({
      cli: 'claude',
      execFile: async () => ({
        stdout: JSON.stringify({
          results: [{ pass: true, reason: 'ok' }],
          score: 1
        }),
        stderr: ''
      })
    });
    const verdict = await runCriteriaJudge({
      prompt: 'q',
      toolOutput: {},
      agentResponse: 'a',
      criteria: ['Be accurate'],
      model: 'scripted',
      backend: 'cli',
      complete
    });
    assert.equal(verdict.passed, true);
    assert.equal(verdict.score, 1);
  });
});
