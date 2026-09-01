/** Kit ontology metamodel - pure types (no I/O). */

export const KIT_ENTITY_TYPES = [
  'Phase',
  'Skill',
  'SOP',
  'Handover',
  'EvalSuite',
  'McpServer',
  'PhilosophySection',
  'Doc'
] as const;

export type KitEntityType = (typeof KIT_ENTITY_TYPES)[number];

export const MEMORY_ENTITY_TYPES = [
  'GlossaryTerm',
  'Slo',
  'Preference',
  'ProjectFact'
] as const;

export type MemoryEntityType = (typeof MEMORY_ENTITY_TYPES)[number];

export const RELATION_NAMES = [
  'loads',
  'uses',
  'depends-on',
  'orders',
  'for',
  'gates',
  'implements',
  'references'
] as const;

export type RelationName = (typeof RELATION_NAMES)[number];

export interface OntologySchema {
  version: number;
  types: KitEntityType[];
  memoryEntityTypes: MemoryEntityType[];
  relations: Array<{
    name: RelationName;
    from: KitEntityType | KitEntityType[];
    to: KitEntityType | KitEntityType[];
  }>;
  phaseOrder: string[];
}

export interface OntologyEntity {
  id: string;
  type: KitEntityType;
  name: string;
  path?: string;
  attrs?: Record<string, unknown>;
}

export interface OntologyEdge {
  from: string;
  relation: RelationName;
  to: string;
}

export interface OntologyIndex {
  version: number;
  generatedFrom: string;
  entities: OntologyEntity[];
  edges: OntologyEdge[];
}

export function entityId(type: KitEntityType, name: string): string {
  const prefix: Record<KitEntityType, string> = {
    Phase: 'phase',
    Skill: 'skill',
    SOP: 'sop',
    Handover: 'handover',
    EvalSuite: 'eval',
    McpServer: 'mcp',
    PhilosophySection: 'philosophy',
    Doc: 'doc'
  };
  return `${prefix[type]}:${name}`;
}

export function parseEntityId(id: string): { prefix: string; name: string } | null {
  const i = id.indexOf(':');
  if (i <= 0) return null;
  return { prefix: id.slice(0, i), name: id.slice(i + 1) };
}
