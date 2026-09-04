import fs from 'node:fs';
import { generateOntologyIndex, ontologyCachePath, writeSiteOntologyIndex } from './generate.js';
import { loadOntologySchema } from './schema.js';
import {
  indexCoversSchemaTypes,
  staleOntologyTypeUnionMessage,
  type OntologyIndex,
  type OntologySchema
} from './types.js';

export interface OntologyCheckResult {
  ok: boolean;
  missingEndpoints: Array<{ from: string; relation: string; to: string }>;
  unknownSkillMcp: Array<{ skill: string; mcp: string }>;
  unknownDependsOn: Array<{ skill: string; dep: string }>;
  unknownSubagentSkill: Array<{ subagent: string; skill: string }>;
  staleTypeUnion: string[];
  messages: string[];
}

/**
 * Validate a freshly generated ontology index (no committed snapshot / drift check).
 * Fails on broken skill mcp: / depends-on refs, and on a stale sync/ type union.
 */
function emptyCheck(messages: string[]): OntologyCheckResult {
  return {
    ok: false,
    missingEndpoints: [],
    unknownSkillMcp: [],
    unknownDependsOn: [],
    unknownSubagentSkill: [],
    staleTypeUnion: [],
    messages
  };
}

function readCachedTypeUnion(kitRoot: string, schema: OntologySchema): string[] {
  const cachePath = ontologyCachePath(kitRoot);
  if (!fs.existsSync(cachePath)) return [];
  try {
    const raw = fs.readFileSync(cachePath, 'utf8');
    const cached = JSON.parse(raw) as OntologyIndex;
    return indexCoversSchemaTypes(cached, schema.types).missing;
  } catch {
    return [...schema.types];
  }
}

export function checkOntology(kitRoot: string): OntologyCheckResult {
  const messages: string[] = [];
  let index: OntologyIndex;
  let schema: OntologySchema;
  try {
    schema = loadOntologySchema(kitRoot);
    index = generateOntologyIndex(kitRoot);
  } catch (err) {
    return emptyCheck([err instanceof Error ? err.message : String(err)]);
  }

  const ids = new Set(index.entities.map((e) => e.id));
  const missingEndpoints: OntologyCheckResult['missingEndpoints'] = [];
  for (const e of index.edges) {
    if (!ids.has(e.from) || !ids.has(e.to)) {
      missingEndpoints.push({ from: e.from, relation: e.relation, to: e.to });
    }
  }

  const unknownSkillMcp: OntologyCheckResult['unknownSkillMcp'] = [];
  const unknownDependsOn: OntologyCheckResult['unknownDependsOn'] = [];
  const unknownSubagentSkill: OntologyCheckResult['unknownSubagentSkill'] = [];
  for (const ent of index.entities) {
    if (ent.type === 'Subagent') {
      const skill = typeof ent.attrs?.skill === 'string' ? ent.attrs.skill : ent.name;
      if (!ids.has(`skill:${skill}`)) {
        unknownSubagentSkill.push({ subagent: ent.name, skill });
      }
      continue;
    }
    if (ent.type !== 'Skill') continue;
    const mcp = Array.isArray(ent.attrs?.mcp) ? (ent.attrs!.mcp as string[]) : [];
    for (const m of mcp) {
      if (!ids.has(`mcp:${m}`)) {
        unknownSkillMcp.push({ skill: ent.name, mcp: m });
      }
    }
    const deps = Array.isArray(ent.attrs?.dependsOn) ? (ent.attrs!.dependsOn as string[]) : [];
    for (const d of deps) {
      if (!ids.has(`skill:${d}`)) {
        unknownDependsOn.push({ skill: ent.name, dep: d });
      }
    }
  }

  for (const m of missingEndpoints) {
    messages.push(`Missing edge endpoint: ${m.from} -[${m.relation}]-> ${m.to}`);
  }
  for (const m of unknownSkillMcp) {
    messages.push(`Skill ${m.skill} references unknown mcp:${m.mcp}`);
  }
  for (const m of unknownDependsOn) {
    messages.push(`Skill ${m.skill} depends-on unknown skill:${m.dep}`);
  }
  for (const m of unknownSubagentSkill) {
    messages.push(`Subagent ${m.subagent} adapts unknown skill:${m.skill}`);
  }

  const staleTypeUnion = readCachedTypeUnion(kitRoot, schema);
  if (staleTypeUnion.length > 0) {
    messages.push(staleOntologyTypeUnionMessage(staleTypeUnion));
  }

  const ok =
    missingEndpoints.length === 0 &&
    unknownSkillMcp.length === 0 &&
    unknownDependsOn.length === 0 &&
    unknownSubagentSkill.length === 0 &&
    staleTypeUnion.length === 0;

  return {
    ok,
    missingEndpoints,
    unknownSkillMcp,
    unknownDependsOn,
    unknownSubagentSkill,
    staleTypeUnion,
    messages
  };
}

/** Optional debug dump to sync/ and web/public/assets/ (both gitignored). */
export function regenerateOntologyIndex(kitRoot: string): { path: string; sitePath: string; changed: boolean } {
  const { cachePath, sitePath } = writeSiteOntologyIndex(kitRoot);
  return { path: cachePath, sitePath, changed: true };
}
