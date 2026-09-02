import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ProviderHttpError,
  isRetryableProviderFailure,
  withProviderRetry
} from './provider-retry.js';

describe('provider retry', () => {
  it('retries 503 then returns the successful attempt', async () => {
    let calls = 0;
    const sleeps: number[] = [];
    const value = await withProviderRetry(
      async () => {
        calls += 1;
        if (calls < 3) throw new ProviderHttpError('Judge', 503, 'hot');
        return 'ok';
      },
      {
        attempts: 3,
        sleep: async (ms) => {
          sleeps.push(ms);
        }
      }
    );
    assert.equal(value, 'ok');
    assert.equal(calls, 3);
    assert.deepEqual(sleeps, [500, 1000]);
  });

  it('does not retry 404', async () => {
    let calls = 0;
    await assert.rejects(
      () =>
        withProviderRetry(
          async () => {
            calls += 1;
            throw new ProviderHttpError('LLM', 404, '');
          },
          { attempts: 5, sleep: async () => undefined }
        ),
      (err: unknown) => err instanceof ProviderHttpError && err.status === 404
    );
    assert.equal(calls, 1);
  });

  it('treats fetch failed TypeError as retryable', () => {
    assert.equal(isRetryableProviderFailure(new TypeError('fetch failed')), true);
    assert.equal(isRetryableProviderFailure(new Error('nope')), false);
  });
});
