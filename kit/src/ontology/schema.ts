import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import {
  KIT_ENTITY_TYPES,
  MEMORY_ENTITY_TYPES,
  RELATION_NAMES,
  type KitEntityType,
  type MemoryEntityType,
  type OntologySchema,
  type RelationName
} from './types.js';

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

export function loadOntologySchema(kitRoot: string): OntologySchema {
  const schemaPath = path.join(kitRoot, 'ontology', 'schema.yaml');
  const raw = fs.readFileSync(schemaPath, 'utf8');
  const data = parseYaml(raw) as Record<string, unknown>;

  const types = asStringArray(data.types) as KitEntityType[];
  for (const t of types) {
    if (!KIT_ENTITY_TYPES.includes(t)) {
      throw new Error(`Unknown kit entity type in schema: ${t}`);
    }
  }

  const memoryEntityTypes = asStringArray(data.memoryEntityTypes) as MemoryEntityType[];
  for (const t of memoryEntityTypes) {
    if (!MEMORY_ENTITY_TYPES.includes(t)) {
      throw new Error(`Unknown memory entity type in schema: ${t}`);
    }
  }

  const relationsRaw = Array.isArray(data.relations) ? data.relations : [];
  const relations: OntologySchema['relations'] = [];
  for (const r of relationsRaw) {
    if (!r || typeof r !== 'object') continue;
    const rec = r as Record<string, unknown>;
    const name = String(rec.name ?? '') as RelationName;
    if (!RELATION_NAMES.includes(name)) {
      throw new Error(`Unknown relation in schema: ${name}`);
    }
    relations.push({
      name,
      from: rec.from as KitEntityType | KitEntityType[],
      to: rec.to as KitEntityType | KitEntityType[]
    });
  }

  return {
    version: typeof data.version === 'number' ? data.version : 1,
    types,
    memoryEntityTypes,
    relations,
    phaseOrder: asStringArray(data.phaseOrder)
  };
}

export function schemaPath(kitRoot: string): string {
  return path.join(kitRoot, 'ontology', 'schema.yaml');
}

export function indexPath(kitRoot: string): string {
  return path.join(kitRoot, 'ontology', 'index.json');
}
