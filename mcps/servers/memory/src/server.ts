#!/usr/bin/env node
/**
 * Typed memory MCP - same JSONL graph format as @modelcontextprotocol/server-memory,
 * with create_entities rejected when entityType is outside the kit ontology allowlist.
 * Catalog id remains `memory`.
 */

import { createInterface } from 'node:readline';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  loadOntologySchema,
  validateMemoryEntityWrites
} from '../../../../kit/src/ontology/index.js';
import { KnowledgeGraphManager, type Entity, type Relation } from './graph.js';

const PROTOCOL_VERSION = '2024-11-05';
const SERVER_INFO = { name: 'memory', version: '1.0.0' };

function resolveKitRoot(): string {
  if (process.env.KIT_ROOT?.trim()) return path.resolve(process.env.KIT_ROOT);
  const agents = path.join(os.homedir(), '.agents');
  if (fs.existsSync(path.join(agents, 'AGENTS.md'))) return agents;
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
}

function memoryFilePath(): string {
  if (process.env.MEMORY_FILE_PATH?.trim()) {
    return path.isAbsolute(process.env.MEMORY_FILE_PATH)
      ? process.env.MEMORY_FILE_PATH
      : path.resolve(process.env.MEMORY_FILE_PATH);
  }
  return path.join(os.homedir(), '.agents', 'sync', 'mcp-memory.jsonl');
}

function buildTools(allowlist: string[]) {
  const allowed = allowlist.join(', ');
  return [
  {
    name: 'create_entities',
    description:
      `Create entities in the knowledge graph. entityType must be one of: ${allowed} (from ontology/schema.yaml).`,
    inputSchema: {
      type: 'object',
      properties: {
        entities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              entityType: { type: 'string' },
              observations: { type: 'array', items: { type: 'string' } }
            },
            required: ['name', 'entityType', 'observations']
          }
        }
      },
      required: ['entities']
    }
  },
  {
    name: 'create_relations',
    description: 'Create relations between entities (active voice).',
    inputSchema: {
      type: 'object',
      properties: {
        relations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              from: { type: 'string' },
              to: { type: 'string' },
              relationType: { type: 'string' }
            },
            required: ['from', 'to', 'relationType']
          }
        }
      },
      required: ['relations']
    }
  },
  {
    name: 'add_observations',
    description: 'Add observations to existing entities (including legacy types).',
    inputSchema: {
      type: 'object',
      properties: {
        observations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              entityName: { type: 'string' },
              contents: { type: 'array', items: { type: 'string' } }
            },
            required: ['entityName', 'contents']
          }
        }
      },
      required: ['observations']
    }
  },
  {
    name: 'delete_entities',
    description: 'Delete entities and their relations.',
    inputSchema: {
      type: 'object',
      properties: { entityNames: { type: 'array', items: { type: 'string' } } },
      required: ['entityNames']
    }
  },
  {
    name: 'delete_observations',
    description: 'Delete specific observations from entities.',
    inputSchema: {
      type: 'object',
      properties: {
        deletions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              entityName: { type: 'string' },
              observations: { type: 'array', items: { type: 'string' } }
            },
            required: ['entityName', 'observations']
          }
        }
      },
      required: ['deletions']
    }
  },
  {
    name: 'delete_relations',
    description: 'Delete relations from the graph.',
    inputSchema: {
      type: 'object',
      properties: {
        relations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              from: { type: 'string' },
              to: { type: 'string' },
              relationType: { type: 'string' }
            },
            required: ['from', 'to', 'relationType']
          }
        }
      },
      required: ['relations']
    }
  },
  {
    name: 'read_graph',
    description: 'Read the entire knowledge graph (including legacy entity types).',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'search_nodes',
    description: 'Search nodes by query string.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query']
    }
  },
  {
    name: 'open_nodes',
    description: 'Open specific nodes by name.',
    inputSchema: {
      type: 'object',
      properties: { names: { type: 'array', items: { type: 'string' } } },
      required: ['names']
    }
  }
] as const;
}

function ok(id: unknown, result: unknown) {
  return { jsonrpc: '2.0', id, result };
}

function fail(id: unknown, code: number, message: string) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

function textContent(text: string, isError = false) {
  return { content: [{ type: 'text', text }], ...(isError ? { isError: true } : {}) };
}

export async function callTool(
  name: string,
  args: Record<string, unknown>,
  mgr: KnowledgeGraphManager,
  kitRoot: string
) {
  const schema = loadOntologySchema(kitRoot);
  switch (name) {
    case 'create_entities': {
      const entities = (args.entities as Entity[]) ?? [];
      const validation = validateMemoryEntityWrites(entities, schema.memoryEntityTypes);
      if (!validation.ok) {
        return textContent(
          `Rejected: unknown entityType(s). ${validation.rejected
            .map((r) => `${r.name}=${r.entityType}`)
            .join('; ')}. Allowed: ${validation.allowed.join(', ')}`,
          true
        );
      }
      const created = await mgr.createEntities(
        entities.map((e) => ({
          name: e.name,
          entityType: e.entityType,
          observations: e.observations ?? []
        }))
      );
      return textContent(JSON.stringify(created, null, 2));
    }
    case 'create_relations': {
      const relations = (args.relations as Relation[]) ?? [];
      const created = await mgr.createRelations(relations);
      return textContent(JSON.stringify(created, null, 2));
    }
    case 'add_observations': {
      const observations =
        (args.observations as Array<{ entityName: string; contents: string[] }>) ?? [];
      const result = await mgr.addObservations(observations);
      return textContent(JSON.stringify(result, null, 2));
    }
    case 'delete_entities': {
      await mgr.deleteEntities((args.entityNames as string[]) ?? []);
      return textContent('Entities deleted');
    }
    case 'delete_observations': {
      await mgr.deleteObservations(
        (args.deletions as Array<{ entityName: string; observations: string[] }>) ?? []
      );
      return textContent('Observations deleted');
    }
    case 'delete_relations': {
      await mgr.deleteRelations((args.relations as Relation[]) ?? []);
      return textContent('Relations deleted');
    }
    case 'read_graph':
      return textContent(JSON.stringify(await mgr.readGraph(), null, 2));
    case 'search_nodes':
      return textContent(JSON.stringify(await mgr.searchNodes(String(args.query ?? '')), null, 2));
    case 'open_nodes':
      return textContent(
        JSON.stringify(await mgr.openNodes((args.names as string[]) ?? []), null, 2)
      );
    default:
      return textContent(`Unknown tool: ${name}`, true);
  }
}

async function handle(
  msg: Record<string, unknown>,
  mgr: KnowledgeGraphManager,
  kitRoot: string
): Promise<Record<string, unknown> | null> {
  const method = msg.method as string | undefined;
  const id = msg.id;
  const params = (msg.params ?? {}) as Record<string, unknown>;

  if (id === undefined && method?.startsWith('notifications/')) {
    return null;
  }

  switch (method) {
    case 'initialize':
      return ok(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO
      });
    case 'ping':
      return ok(id, {});
    case 'tools/list': {
      const allow = loadOntologySchema(kitRoot).memoryEntityTypes;
      return ok(id, { tools: buildTools(allow) });
    }    case 'tools/call': {
      const toolName = String(params.name ?? '');
      const args = (params.arguments ?? {}) as Record<string, unknown>;
      try {
        return ok(id, await callTool(toolName, args, mgr, kitRoot));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return ok(id, textContent(`Tool error: ${message}`, true));
      }
    }
    default:
      if (id === undefined) return null;
      return fail(id, -32601, `Method not found: ${method}`);
  }
}

async function main() {
  const kitRoot = resolveKitRoot();
  const mgr = new KnowledgeGraphManager(memoryFilePath());
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      process.stderr.write('memory: invalid JSON line\n');
      continue;
    }
    const response = await handle(msg, mgr, kitRoot);
    if (response) {
      process.stdout.write(JSON.stringify(response) + '\n');
    }
  }
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  main().catch((err) => {
    process.stderr.write(`memory fatal: ${err}\n`);
    process.exit(1);
  });
}
