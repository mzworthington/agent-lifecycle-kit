import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EDD_CI_SUITES, runKitCheck, type KitCheckDeps } from './quality_gate.js';
import type { ContextBudgetResult } from './measure_context_budget.js';

const okBudget: ContextBudgetResult = {
  ok: true,
  alwaysOnChars: 10,
  targetChars: 8000,
  breakdown: {
    agents: 10,
    handshake: 0,
    cursorRules: 0,
    claude: 0,
    philosophy: 0,
    skillDescriptions: 0
  }
};

function passingDeps(overrides: KitCheckDeps = {}): KitCheckDeps {
  return {
    scan: () => ({ ok: true, errorCount: 0, warningCount: 0 }),
    validate: () => ({ ok: true, errors: 0, totalSuites: 0, totalTests: 0 }),
    verifyLayout: () => ({ ok: true, invalid: [] }),
    printLayout: () => undefined,
    exportRules: () => true,
    evals: () => true,
    edd: async () => 0,
    budget: () => okBudget,
    printBudget: () => undefined,
    ...overrides
  };
}

describe('EDD_CI_SUITES', () => {
  it('gates architecture routing, kit-knowledge, safety, and recovery suites', () => {
    assert.deepEqual([...EDD_CI_SUITES], [
      'evals/edd/architecture_routing.yaml',
      'evals/edd/kit_knowledge.yaml',
      'evals/edd/cloudflare_ops.yaml',
      'evals/edd/safety.yaml',
      'evals/edd/architecture_self_correction.yaml',
      'evals/edd/architecture_terminal.yaml'
    ]);
  });
});

describe('runKitCheck', () => {
  it('returns 0 when every step passes and runs both EDD suites', async () => {
    const suites: string[] = [];
    const code = await runKitCheck('/kit', passingDeps({
      edd: async (opts) => {
        const suite = opts.args[opts.args.indexOf('--suite') + 1];
        if (suite) suites.push(suite);
        return 0;
      }
    }));
    assert.equal(code, 0);
    assert.deepEqual(suites, [...EDD_CI_SUITES]);
  });

  it('stops at the first failing step', async () => {
    assert.equal(await runKitCheck('/kit', passingDeps({ scan: () => ({ ok: false, errorCount: 1, warningCount: 0 }) })), 1);
    assert.equal(
      await runKitCheck('/kit', passingDeps({ validate: () => ({ ok: false, errors: 1, totalSuites: 1, totalTests: 0 }) })),
      1
    );
    assert.equal(
      await runKitCheck('/kit', passingDeps({ verifyLayout: () => ({ ok: false, invalid: ['cloudflare'] }) })),
      1
    );
    assert.equal(await runKitCheck('/kit', passingDeps({ exportRules: () => false })), 1);
    assert.equal(await runKitCheck('/kit', passingDeps({ evals: () => false })), 1);
    assert.equal(await runKitCheck('/kit', passingDeps({ edd: async () => 1 })), 1);
    assert.equal(await runKitCheck('/kit', passingDeps({ budget: () => ({ ...okBudget, ok: false }) })), 1);
  });
});
