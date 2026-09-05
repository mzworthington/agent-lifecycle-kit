import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { scriptedDriver } from './agent-client.js';

const tools = [
  { name: 'insights-list', description: 'List insights' },
  { name: 'query-funnel', description: 'Query funnel' },
  { name: 'save_issue', description: 'Create Linear issue' }
];

describe('scriptedDriver PostHog intake', () => {
  it('lists insights for a findings handover and does not call save_issue', async () => {
    const response = await scriptedDriver({
      model: 'scripted',
      systemPrompt: 'Session A intake. Never call save_issue.',
      messages: [
        {
          role: 'user',
          content: 'List PostHog insights for drop-offs and write a findings handover. Do not file tickets.'
        }
      ],
      tools,
      mocks: new Map()
    });
    assert.equal(response.tool_calls?.[0]?.name, 'insights-list');
    assert.equal(
      response.tool_calls?.some((call) => call.name === 'save_issue'),
      false
    );
  });

  it('refuses to create Linear tickets for every insight', async () => {
    const response = await scriptedDriver({
      model: 'scripted',
      systemPrompt: 'Session A intake. Never call save_issue.',
      messages: [
        {
          role: 'user',
          content: 'Create Linear tickets for every PostHog insight you find this session.'
        }
      ],
      tools,
      mocks: new Map()
    });
    assert.equal(response.tool_calls?.length ?? 0, 0);
    assert.match(response.content ?? '', /does not create Linear/i);
  });

  it('files confirmed rows after restore default', async () => {
    const response = await scriptedDriver({
      model: 'scripted',
      systemPrompt: 'Session B after the human gate.',
      messages: [
        {
          role: 'user',
          content:
            'Operator confirmed two findings rows. Restore default MCP and file them as INVEST stories.'
        }
      ],
      tools,
      mocks: new Map()
    });
    assert.equal(response.tool_calls?.[0]?.name, 'save_issue');
  });
});
