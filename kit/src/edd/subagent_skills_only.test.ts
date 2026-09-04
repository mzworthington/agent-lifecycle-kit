import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { scriptedDriver } from './agent-client.js';

const tools = [{ name: 'launch_specialist', description: 'Launch' }];

describe('scriptedDriver skills-only', () => {
  it('does not launch a specialist when the system prompt is skills-only mode', async () => {
    const response = await scriptedDriver({
      model: 'scripted',
      systemPrompt: 'SKILLS-ONLY MODE.\nStay in the parent.',
      messages: [{ role: 'user', content: 'Review the PR as an independent audit.' }],
      tools,
      mocks: new Map()
    });
    assert.equal(response.tool_calls?.length ?? 0, 0);
    assert.match(response.content ?? '', /skills-only/i);
  });

  it('launches review when skills-only mode is off', async () => {
    const response = await scriptedDriver({
      model: 'scripted',
      systemPrompt: 'When the job matches the allowlist, call launch_specialist.',
      messages: [{ role: 'user', content: 'Review the PR as an independent audit.' }],
      tools,
      mocks: new Map()
    });
    assert.equal(response.tool_calls?.[0]?.name, 'launch_specialist');
  });
});
