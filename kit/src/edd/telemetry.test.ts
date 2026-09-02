import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_TOKEN_USD_PER_1K,
  buildSuiteReport,
  tokenUsdPer1k
} from './telemetry.js';

describe('token USD estimate', () => {
  it('defaults to 0.003 per 1k when the env is unset', () => {
    assert.equal(tokenUsdPer1k({}), DEFAULT_TOKEN_USD_PER_1K);
    assert.equal(tokenUsdPer1k({ KIT_EVAL_TOKEN_USD_PER_1K: '' }), DEFAULT_TOKEN_USD_PER_1K);
  });

  it('honors KIT_EVAL_TOKEN_USD_PER_1K including 0 to disable', () => {
    assert.equal(tokenUsdPer1k({ KIT_EVAL_TOKEN_USD_PER_1K: '0.01' }), 0.01);
    assert.equal(tokenUsdPer1k({ KIT_EVAL_TOKEN_USD_PER_1K: '0' }), 0);
  });

  it('attaches USD on live models without requiring the env', () => {
    const prev = process.env.KIT_EVAL_TOKEN_USD_PER_1K;
    delete process.env.KIT_EVAL_TOKEN_USD_PER_1K;
    try {
      const live = buildSuiteReport({
        suite: 'Routing',
        suitePath: '/tmp/s.yaml',
        model: 'cursor-grok-4.6-medium',
        startedAt: '2026-09-02T00:00:00.000Z',
        results: [
          {
            id: 'route-01',
            prompt: 'x',
            passed: true,
            latencyMs: 10,
            tokens: 1000,
            failures: []
          }
        ]
      });
      assert.equal(live.estimatedCostUsd, DEFAULT_TOKEN_USD_PER_1K);
      const local = buildSuiteReport({
        suite: 'Routing',
        suitePath: '/tmp/s.yaml',
        model: 'scripted',
        startedAt: '2026-09-02T00:00:00.000Z',
        results: [
          {
            id: 'route-01',
            prompt: 'x',
            passed: true,
            latencyMs: 10,
            tokens: 1000,
            failures: []
          }
        ]
      });
      assert.equal(local.estimatedCostUsd, undefined);
    } finally {
      if (prev === undefined) delete process.env.KIT_EVAL_TOKEN_USD_PER_1K;
      else process.env.KIT_EVAL_TOKEN_USD_PER_1K = prev;
    }
  });
});
