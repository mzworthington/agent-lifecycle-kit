import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { loadOntologySchema } from './schema.js';
import {
  entityId,
  type OntologyEdge,
  type OntologyEntity,
  type OntologyIndex,
  type RelationName
} from './types.js';

function safeRead(filePath: string): string | null {
  try {
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return null;
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function parseFrontmatter(content: string): Record<string, unknown> | null {
  if (!content.startsWith('---')) return null;
  const end = content.indexOf('\n---', 3);
  if (end < 0) return null;
  const raw = content.slice(3, end).trim();
  try {
    const data = parseYaml(raw);
    return data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

function listPhilosophySections(kitRoot: string): Array<{ id: string; title: string }> {
  const raw = safeRead(path.join(kitRoot, 'CODING_PHILOSOPHY.md'));
  if (!raw) return [];
  const sections: Array<{ id: string; title: string }> = [];
  const parts = raw.split(/^## /m);
  for (let i = 1; i < parts.length; i++) {
    const block = parts[i];
    const nl = block.indexOf('\n');
    const titleLine = (nl >= 0 ? block.slice(0, nl) : block).trim();
    const idMatch = titleLine.match(/^(\d+)\.\s*(.+)$/);
    sections.push({
      id: idMatch ? idMatch[1] : String(i),
      title: idMatch ? idMatch[2] : titleLine
    });
  }
  return sections;
}

function collectMarkdownTargets(text: string): string[] {
  const targets: string[] = [];
  const linkRe = /\[[^\]]*\]\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(text)) !== null) {
    targets.push(m[1].split('#')[0].trim());
  }
  return targets;
}

function addEdge(
  edges: OntologyEdge[],
  seen: Set<string>,
  from: string,
  relation: RelationName,
  to: string
): void {
  const key = `${from}|${relation}|${to}`;
  if (seen.has(key)) return;
  seen.add(key);
  edges.push({ from, relation, to });
}

export function generateOntologyIndex(kitRoot: string): OntologyIndex {
  const schema = loadOntologySchema(kitRoot);
  const entities: OntologyEntity[] = [];
  const edges: OntologyEdge[] = [];
  const seenEdges = new Set<string>();
  const entityIds = new Set<string>();

  const pushEntity = (entity: OntologyEntity) => {
    if (entityIds.has(entity.id)) return;
    entityIds.add(entity.id);
    entities.push(entity);
  };

  // Phases
  for (let i = 0; i < schema.phaseOrder.length; i++) {
    const name = schema.phaseOrder[i];
    pushEntity({
      id: entityId('Phase', name),
      type: 'Phase',
      name,
      attrs: { order: i }
    });
    if (i > 0) {
      addEdge(
        edges,
        seenEdges,
        entityId('Phase', schema.phaseOrder[i - 1]),
        'orders',
        entityId('Phase', name)
      );
    }
  }

  // Philosophy
  for (const s of listPhilosophySections(kitRoot)) {
    pushEntity({
      id: entityId('PhilosophySection', s.id),
      type: 'PhilosophySection',
      name: s.id,
      path: 'CODING_PHILOSOPHY.md',
      attrs: { title: s.title }
    });
  }

  // Docs
  const docsDir = path.join(kitRoot, 'docs');
  if (fs.existsSync(docsDir)) {
    for (const f of fs.readdirSync(docsDir).sort()) {
      if (!f.endsWith('.md')) continue;
      const stem = f.replace(/\.md$/, '');
      pushEntity({
        id: entityId('Doc', stem),
        type: 'Doc',
        name: stem,
        path: path.join('docs', f)
      });
    }
  }

  // SOPs
  const sopsDir = path.join(kitRoot, 'SOPs');
  if (fs.existsSync(sopsDir)) {
    for (const f of fs.readdirSync(sopsDir).sort()) {
      if (!f.endsWith('.md')) continue;
      const stem = f.replace(/\.md$/, '');
      const rel = path.join('SOPs', f);
      const body = safeRead(path.join(kitRoot, rel)) ?? '';
      pushEntity({
        id: entityId('SOP', stem),
        type: 'SOP',
        name: stem,
        path: rel
      });

      const philosophyIds = new Set(listPhilosophySections(kitRoot).map((s) => s.id));
      for (const target of collectMarkdownTargets(body)) {
        const norm = target.replace(/^\.\.\//, '').replace(/^\.\//, '');
        const docsMatch = norm.match(/(?:^|\/)docs\/([^/]+?)(?:\.md)?$/);
        if (docsMatch) {
          addEdge(
            edges,
            seenEdges,
            entityId('SOP', stem),
            'references',
            entityId('Doc', docsMatch[1].replace(/\.md$/, ''))
          );
        }
      }
      for (const sm of body.matchAll(/§\s*(\d+)/g)) {
        if (!philosophyIds.has(sm[1])) continue;
        addEdge(
          edges,
          seenEdges,
          entityId('SOP', stem),
          'implements',
          entityId('PhilosophySection', sm[1])
        );
      }
    }
  }

  // MCP servers from catalog
  const catalogPath = path.join(kitRoot, 'mcps', 'catalog.json');
  const catalogRaw = safeRead(catalogPath);
  if (catalogRaw) {
    try {
      const catalog = JSON.parse(catalogRaw) as { servers?: Array<{ id: string; name?: string }> };
      for (const s of catalog.servers ?? []) {
        pushEntity({
          id: entityId('McpServer', s.id),
          type: 'McpServer',
          name: s.id,
          path: path.join('mcps', 'servers', s.id, 'server.json'),
          attrs: { displayName: s.name }
        });
      }
    } catch {
      // ignore malformed catalog
    }
  }

  // Skills
  const skillsDir = path.join(kitRoot, 'skills');
  if (fs.existsSync(skillsDir)) {
    for (const name of fs.readdirSync(skillsDir).sort()) {
      const skillPath = path.join(skillsDir, name, 'SKILL.md');
      const body = safeRead(skillPath);
      if (!body) continue;
      const fm = parseFrontmatter(body) ?? {};
      const phase = typeof fm.phase === 'string' ? fm.phase : undefined;
      const dependsOn = asStringArray(fm['depends-on']);
      const mcp = asStringArray(fm.mcp);
      const rel = path.join('skills', name, 'SKILL.md');
      pushEntity({
        id: entityId('Skill', name),
        type: 'Skill',
        name,
        path: rel,
        attrs: {
          kind: fm.kind,
          phase,
          triggers: asStringArray(fm.triggers),
          dependsOn,
          mcp
        }
      });

      for (const dep of dependsOn) {
        addEdge(edges, seenEdges, entityId('Skill', name), 'depends-on', entityId('Skill', dep));
      }
      for (const m of mcp) {
        addEdge(edges, seenEdges, entityId('Skill', name), 'uses', entityId('McpServer', m));
      }
      for (const target of collectMarkdownTargets(body)) {
        const sopMatch = target.match(/SOPs\/([^/#]+?)(?:\.md)?(?:#|$)/);
        if (sopMatch) {
          addEdge(
            edges,
            seenEdges,
            entityId('Skill', name),
            'loads',
            entityId('SOP', sopMatch[1])
          );
        }
        const docsMatch = target.match(/(?:^|\/)docs\/([^/#]+?)(?:\.md)?(?:#|$)/);
        if (docsMatch) {
          addEdge(
            edges,
            seenEdges,
            entityId('Skill', name),
            'references',
            entityId('Doc', docsMatch[1])
          );
        }
      }
    }
  }

  // Eval suites
  const eddDir = path.join(kitRoot, 'evals', 'edd');
  if (fs.existsSync(eddDir)) {
    for (const f of fs.readdirSync(eddDir).sort()) {
      if (!f.endsWith('.yaml') && !f.endsWith('.yml')) continue;
      const stem = f.replace(/\.ya?ml$/, '');
      const rel = path.join('evals', 'edd', f);
      pushEntity({
        id: entityId('EvalSuite', stem),
        type: 'EvalSuite',
        name: stem,
        path: rel
      });
      // Heuristic gates: kit_knowledge → mcp:kit-knowledge; architecture_* → skills; memory → mcp:memory
      if (stem.includes('kit_knowledge') || stem.includes('kit-knowledge')) {
        addEdge(
          edges,
          seenEdges,
          entityId('EvalSuite', stem),
          'gates',
          entityId('McpServer', 'kit-knowledge')
        );
      }
      if (stem.includes('memory')) {
        addEdge(
          edges,
          seenEdges,
          entityId('EvalSuite', stem),
          'gates',
          entityId('McpServer', 'memory')
        );
      }
      if (stem.includes('cloudflare')) {
        addEdge(
          edges,
          seenEdges,
          entityId('EvalSuite', stem),
          'gates',
          entityId('Skill', 'agent-cloudflare-ops')
        );
      }
      if (stem.startsWith('architecture')) {
        addEdge(
          edges,
          seenEdges,
          entityId('EvalSuite', stem),
          'gates',
          entityId('Skill', 'agent-arch-drift')
        );
      }
    }
  }

  // Skill-local evals
  if (fs.existsSync(skillsDir)) {
    for (const name of fs.readdirSync(skillsDir).sort()) {
      const evalPath = path.join(skillsDir, name, 'evals', 'eval.json');
      if (!fs.existsSync(evalPath)) continue;
      const suiteName = `skill-${name}`;
      pushEntity({
        id: entityId('EvalSuite', suiteName),
        type: 'EvalSuite',
        name: suiteName,
        path: path.join('skills', name, 'evals', 'eval.json')
      });
      addEdge(
        edges,
        seenEdges,
        entityId('EvalSuite', suiteName),
        'gates',
        entityId('Skill', name)
      );
    }
  }

  // Handovers under kit handover/ and optional ~/.agents not scanned at generate time for portability —
  // index kit-local handover/<project>/ only.
  const handoverRoot = path.join(kitRoot, 'handover');
  if (fs.existsSync(handoverRoot)) {
    for (const project of fs.readdirSync(handoverRoot).sort()) {
      const dir = path.join(handoverRoot, project);
      if (!fs.statSync(dir).isDirectory()) continue;
      for (const f of fs.readdirSync(dir).sort()) {
        if (!f.startsWith('handover_') || !f.endsWith('.md')) continue;
        const phase = f.replace(/^handover_/, '').replace(/\.md$/, '');
        const idName = `${project}/${phase}`;
        pushEntity({
          id: entityId('Handover', idName),
          type: 'Handover',
          name: idName,
          path: path.join('handover', project, f),
          attrs: { project, phase }
        });
        if (schema.phaseOrder.includes(phase) || phase === 'grilling') {
          addEdge(
            edges,
            seenEdges,
            entityId('Handover', idName),
            'for',
            entityId('Phase', phase === 'grilling' ? 'grilling' : phase)
          );
        }
      }
    }
  }

  // Drop edges whose endpoints are missing (dangling skill depends-on still emitted above —
  // referential check will fail them intentionally).
  const keptEdges = edges.filter((e) => entityIds.has(e.from) && entityIds.has(e.to));
  edges.length = 0;
  edges.push(...keptEdges);

  entities.sort((a, b) => a.id.localeCompare(b.id));
  edges.sort((a, b) =>
    a.from.localeCompare(b.from) || a.relation.localeCompare(b.relation) || a.to.localeCompare(b.to)
  );

  return {
    version: schema.version,
    generatedFrom: 'ontology/schema.yaml',
    entities,
    edges
  };
}

export function serializeOntologyIndex(index: OntologyIndex): string {
  return `${JSON.stringify(index, null, 2)}\n`;
}

export function writeOntologyIndex(kitRoot: string, index: OntologyIndex = generateOntologyIndex(kitRoot)): string {
  const out = path.join(kitRoot, 'ontology', 'index.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, serializeOntologyIndex(index), 'utf8');
  return out;
}

export function loadOntologyIndex(kitRoot: string): OntologyIndex | null {
  const p = path.join(kitRoot, 'ontology', 'index.json');
  const raw = safeRead(p);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OntologyIndex;
  } catch {
    return null;
  }
}

export function getEntity(index: OntologyIndex, id: string): OntologyEntity | null {
  const needle = id.trim();
  return (
    index.entities.find((e) => e.id === needle || e.id === needle || e.name === needle) ??
    index.entities.find((e) => e.id.endsWith(`:${needle}`)) ??
    null
  );
}

export function getRelated(
  index: OntologyIndex,
  id: string,
  relation?: RelationName
): Array<OntologyEdge & { entity?: OntologyEntity }> {
  const entity = getEntity(index, id);
  if (!entity) return [];
  return index.edges
    .filter((e) => e.from === entity.id && (relation ? e.relation === relation : true))
    .map((e) => ({
      ...e,
      entity: index.entities.find((ent) => ent.id === e.to)
    }));
}
