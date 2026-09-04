import fs from 'node:fs';
import path from 'node:path';
import { generateOntologyIndex, staleOntologyCacheTypes, writeSiteOntologyIndex } from './generate.js';
import { loadOntologySchema } from './schema.js';
import type { OntologyIndex } from './types.js';

export interface OntologyCheckResult {
  ok: boolean;
  missingEndpoints: Array<{ from: string; relation: string; to: string }>;
  unknownSkillMcp: Array<{ skill: string; mcp: string }>;
  unknownDependsOn: Array<{ skill: string; dep: string }>;
  unknownSubagentSkill: Array<{ subagent: string; skill: string }>;
  messages: string[];
}

/**
 * Validate a freshly generated ontology index (no committed snapshot / drift check).
 * Fails on broken skill mcp: / depends-on refs.
 */
export function checkOntology(kitRoot: string): OntologyCheckResult {
  const messages: string[] = [];
  let index: OntologyIndex;
  try {
    loadOntologySchema(kitRoot);
    index = generateOntologyIndex(kitRoot);
  } catch (err) {
    return {
      ok: false,
      missingEndpoints: [],
      unknownSkillMcp: [],
      unknownDependsOn: [],
      unknownSubagentSkill: [],
      messages: [err instanceof Error ? err.message : String(err)]
    };
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

  const cachePath = path.join(kitRoot, 'sync', 'ontology-index.json');
  if (fs.existsSync(cachePath)) {
    try {
      const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8')) as OntologyIndex;
      for (const t of staleOntologyCacheTypes(kitRoot, cached)) {
        messages.push(
          `Stale ontology cache is missing type ${t}. Delete sync/ontology-index.json and restart kit-knowledge so get_entity(subagent:agent-tdd) resolves.`
        );
      }
    } catch {
      messages.push(
        'Stale ontology cache at sync/ontology-index.json is unreadable. Delete it and restart kit-knowledge.'
      );
    }
  }

  const ok =
    missingEndpoints.length === 0 &&
    unknownSkillMcp.length === 0 &&
    unknownDependsOn.length === 0 &&
    unknownSubagentSkill.length === 0 &&
    !messages.some((m) => m.includes('Stale ontology cache'));

  return {
    ok,
    missingEndpoints,
    unknownSkillMcp,
    unknownDependsOn,
    unknownSubagentSkill,
    messages
  };
}

/** Optional debug dump to sync/ and web/public/assets/ (both gitignored). */
export function regenerateOntologyIndex(kitRoot: string): { path: string; sitePath: string; changed: boolean } {
  const { cachePath, sitePath } = writeSiteOntologyIndex(kitRoot);
  return { path: cachePath, sitePath, changed: true };
}
