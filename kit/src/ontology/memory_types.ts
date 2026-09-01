import type { MemoryEntityType } from './types.js';
import { MEMORY_ENTITY_TYPES } from './types.js';

export interface MemoryEntityInput {
  name: string;
  entityType: string;
  observations?: string[];
}

export interface MemoryTypeValidation {
  ok: boolean;
  rejected: Array<{ name: string; entityType: string; reason: string }>;
  allowed: MemoryEntityType[];
}

/** Reject create/update writes whose entityType is not in the ontology allowlist. */
export function validateMemoryEntityWrites(
  entities: MemoryEntityInput[],
  allowlist: readonly string[] = MEMORY_ENTITY_TYPES
): MemoryTypeValidation {
  const allowed = new Set(allowlist);
  const rejected: MemoryTypeValidation['rejected'] = [];
  for (const e of entities) {
    const entityType = String(e.entityType ?? '').trim();
    if (!allowed.has(entityType)) {
      rejected.push({
        name: e.name,
        entityType,
        reason: `entityType "${entityType}" is not in allowlist [${[...allowed].join(', ')}]`
      });
    }
  }
  return {
    ok: rejected.length === 0,
    rejected,
    allowed: [...allowed] as MemoryEntityType[]
  };
}

export function isAllowedMemoryEntityType(
  entityType: string,
  allowlist: readonly string[] = MEMORY_ENTITY_TYPES
): boolean {
  return allowlist.includes(entityType);
}
