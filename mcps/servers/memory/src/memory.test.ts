import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { KnowledgeGraphManager } from './graph.ts';
import { callTool } from './server.ts';

const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

describe('typed memory create_entities', () => {
  it('rejects unknown entity types and accepts allowlisted ones', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-memory-'));
    const file = path.join(tmp, 'mcp-memory.jsonl');
    try {
      const mgr = new KnowledgeGraphManager(file);

      const rejected = await callTool(
        'create_entities',
        {
          entities: [
            { name: 'bad', entityType: 'Alien', observations: ['x'] }
          ]
        },
        mgr,
        kitRoot
      );
      assert.equal(rejected.isError, true);
      assert.match(rejected.content[0].text, /Rejected/);
      assert.deepEqual(await mgr.readGraph(), { entities: [], relations: [] });

      const ok = await callTool(
        'create_entities',
        {
          entities: [
            {
              name: 'EDD',
              entityType: 'GlossaryTerm',
              observations: ['Eval-Driven Development']
            }
          ]
        },
        mgr,
        kitRoot
      );
      assert.equal(ok.isError, undefined);
      const graph = await mgr.readGraph();
      assert.equal(graph.entities.length, 1);
      assert.equal(graph.entities[0].entityType, 'GlossaryTerm');

      // Legacy unknown types remain readable if already on disk
      fs.writeFileSync(
        file,
        JSON.stringify({
          type: 'entity',
          name: 'legacy',
          entityType: 'OldLabel',
          observations: ['kept']
        }) +
          '\n' +
          JSON.stringify({
            type: 'entity',
            name: 'EDD',
            entityType: 'GlossaryTerm',
            observations: ['Eval-Driven Development']
          })
      );
      const read = await mgr.readGraph();
      assert.ok(read.entities.some((e) => e.entityType === 'OldLabel'));
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
