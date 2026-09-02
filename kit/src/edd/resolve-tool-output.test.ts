import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveToolOutput } from './resolve-tool-output.js';

describe('resolveToolOutput', () => {
  it('prefers the suite mock the agent actually received over case tool_output', () => {
    const mock = {
      status: 'success',
      component: 'payment-api',
      containers: ['payment-api', 'payment-db'],
      relationships: ['payment-api -> payment-db']
    };
    const resolved = resolveToolOutput(
      {
        id: 'route-01',
        prompt: 'C4 for payment',
        tool_output: { status: 'success', component: 'payment-api', containers: ['payment-api', 'payment-db'] }
      },
      {
        name: 'Routing',
        dataset: 'x.jsonl',
        metrics: [{ type: 'tool_selection' }],
        mocks: [{ tool: 'read_architecture_yaml', response: mock }]
      },
      'read_architecture_yaml'
    );
    assert.deepEqual(resolved, mock);
  });

  it('falls back to case tool_output when the suite has no mock for that tool', () => {
    const toolOutput = { component: 'payment-api' };
    const resolved = resolveToolOutput(
      { id: 'crit-01', prompt: 'Summarize', tool_output: toolOutput },
      { name: 'Criteria', dataset: 'x.jsonl', metrics: [{ type: 'criteria_judge' }] },
      'read_architecture_yaml'
    );
    assert.deepEqual(resolved, toolOutput);
  });
});
