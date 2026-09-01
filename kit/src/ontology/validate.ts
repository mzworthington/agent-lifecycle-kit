import fs from 'node:fs';
import path from 'node:path';
import { generateOntologyIndex, loadOntologyIndex, serializeOntologyIndex } from './generate.js';
import { loadOntologySchema } from './schema.js';
import type { OntologyIndex } from './types.js';

export interface OntologyCheckResult {
  ok: boolean;
  drift: boolean;
  missingEndpoints: Array<{ from: string; relation: string; to: string }>;
  unknownSkillMcp: Array<{ skill: string; mcp: string }>;
  unknownDependsOn: Array<{ skill: string; dep: string }>;
  messages: string[];
}

function normalizeJson(text: string): string {
  try {
    return `${JSON.stringify(JSON.parse(text), null, 2)}\n`;
  } catch {
    return text;
  }
}

export function checkOntology(kitRoot: string): OntologyCheckResult {
  const messages: string[] = [];
  const fresh = generateOntologyIndex(kitRoot);
  const committed = loadOntologyIndex(kitRoot);
  const expected = serializeOntologyIndex(fresh);

  let drift = false;
  if (!committed) {
    drift = true;
    messages.push('ontology/index.json is missing');
  } else {
    const onDisk = fs.readFileSync(path.join(kitRoot, 'ontology', 'index.json'), 'utf8');
    if (normalizeJson(onDisk) !== expected) {
      drift = true;
      messages.push('ontology/index.json is out of date (run: kit ontology generate)');
    }
  }

  const index: OntologyIndex = fresh;
  const ids = new Set(index.entities.map((e) => e.id));
  const missingEndpoints: OntologyCheckResult['missingEndpoints'] = [];
  for (const e of index.edges) {
    if (!ids.has(e.from) || !ids.has(e.to)) {
      missingEndpoints.push({ from: e.from, relation: e.relation, to: e.to });
    }
  }

  const unknownSkillMcp: OntologyCheckResult['unknownSkillMcp'] = [];
  const unknownDependsOn: OntologyCheckResult['unknownDependsOn'] = [];
  for (const ent of index.entities) {
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

  // Ensure schema loads
  try {
    loadOntologySchema(kitRoot);
  } catch (err) {
    messages.push(err instanceof Error ? err.message : String(err));
  }

  const ok =
    !drift &&
    missingEndpoints.length === 0 &&
    unknownSkillMcp.length === 0 &&
    unknownDependsOn.length === 0 &&
    !messages.some((msg) => msg.startsWith('Unknown'));

  return {
    ok,
    drift,
    missingEndpoints,
    unknownSkillMcp,
    unknownDependsOn,
    messages
  };
}

/** Regenerate index and return whether the file content changed. */
export function regenerateOntologyIndex(kitRoot: string): { path: string; changed: boolean } {
  const out = path.join(kitRoot, 'ontology', 'index.json');
  const next = serializeOntologyIndex(generateOntologyIndex(kitRoot));
  const prev = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : null;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, next, 'utf8');
  return { path: out, changed: prev !== next };
}
