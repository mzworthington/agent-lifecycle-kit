import fs from 'node:fs';
import { isAllowedMemoryEntityType } from './memory_types.js';
import { loadOntologySchema } from './schema.js';

export interface MemoryLintResult {
  ok: boolean;
  path: string;
  totalEntities: number;
  legacyUnknown: Array<{ name: string; entityType: string }>;
  messages: string[];
}

interface GraphEntity {
  type?: string;
  name?: string;
  entityType?: string;
}

/** List entities in MEMORY_FILE_PATH whose types are outside the ontology allowlist (legacy OK to read). */
export function lintMemoryGraph(kitRoot: string, memoryFilePath: string): MemoryLintResult {
  const schema = loadOntologySchema(kitRoot);
  const allow = schema.memoryEntityTypes;
  const messages: string[] = [];
  const legacyUnknown: MemoryLintResult['legacyUnknown'] = [];

  if (!fs.existsSync(memoryFilePath)) {
    return {
      ok: true,
      path: memoryFilePath,
      totalEntities: 0,
      legacyUnknown: [],
      messages: [`No memory file at ${memoryFilePath}`]
    };
  }

  const raw = fs.readFileSync(memoryFilePath, 'utf8');
  const lines = raw.split('\n').filter((l) => l.trim());
  let totalEntities = 0;
  for (const line of lines) {
    let item: GraphEntity;
    try {
      item = JSON.parse(line) as GraphEntity;
    } catch {
      messages.push(`Skipping invalid JSONL line`);
      continue;
    }
    if (item.type !== 'entity') continue;
    totalEntities += 1;
    const entityType = String(item.entityType ?? '');
    const name = String(item.name ?? '');
    if (!isAllowedMemoryEntityType(entityType, allow)) {
      legacyUnknown.push({ name, entityType });
    }
  }

  if (legacyUnknown.length > 0) {
    messages.push(
      `Found ${legacyUnknown.length} legacy entit(y/ies) with types outside allowlist (readable, but new writes must use: ${allow.join(', ')})`
    );
  } else {
    messages.push('All entity types are within the allowlist');
  }

  return {
    ok: true, // lint never hard-fails kit check
    path: memoryFilePath,
    totalEntities,
    legacyUnknown,
    messages
  };
}
