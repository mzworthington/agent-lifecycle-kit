import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { KIT_SKILL_DIR_PREFIX } from './verify_skills_layout.js';

export const SUBAGENT_ALLOWLIST_REL = 'skills/subagents.yaml';
export const SUBAGENT_DOCS_REL = 'docs/subagents.md';
export const STAY_SKILL_PREFIXES = ['lang-', 'framework-', 'profile-'] as const;

export type SubagentRuntime = 'subagent' | 'skill' | 'parent';
export type SubagentBucket = 'isolation' | 'audit' | 'sequential';

export interface SubagentRoleEntry {
  runtime: SubagentRuntime;
  bucket?: SubagentBucket;
  readonly?: boolean;
}

export interface SubagentAllowlistCatalog {
  expandKill: string;
  staySkillPrefixes: string[];
  tdd: { skill: string; gears: 'same-session'; escapeHatch: string };
  pilot: {
    isolation: string[];
    audit: string[];
    sequential: string[];
    parent: string[];
  };
  roles: Record<string, SubagentRoleEntry>;
}

export interface SubagentAllowlistResult {
  ok: boolean;
  errors: string[];
  catalog: SubagentAllowlistCatalog | null;
  runtimeFor: (skill: string) => SubagentRuntime | null;
}

const PILOT_BUCKETS = ['isolation', 'audit', 'sequential'] as const;

function listSkillDirs(repoDir: string): string[] {
  const skillsDir = path.join(repoDir, 'skills');
  if (!fs.existsSync(skillsDir)) return [];
  return fs
    .readdirSync(skillsDir)
    .filter((base) => KIT_SKILL_DIR_PREFIX.test(base))
    .filter((base) => fs.existsSync(path.join(skillsDir, base, 'SKILL.md')))
    .sort();
}

function asStringArray(raw: unknown, label: string): string[] {
  if (!Array.isArray(raw) || raw.some((item) => typeof item !== 'string')) {
    throw new Error(`${label} must be a string array`);
  }
  return raw as string[];
}

export function loadSubagentAllowlist(repoDir: string): SubagentAllowlistCatalog {
  const yamlPath = path.join(repoDir, SUBAGENT_ALLOWLIST_REL);
  if (!fs.existsSync(yamlPath)) {
    throw new Error(`Missing ${SUBAGENT_ALLOWLIST_REL}`);
  }
  return parseCatalog(parseYaml(fs.readFileSync(yamlPath, 'utf8')));
}

function parseCatalog(raw: unknown): SubagentAllowlistCatalog {
  if (!raw || typeof raw !== 'object') {
    throw new Error('subagents.yaml must be a mapping');
  }
  const doc = raw as Record<string, unknown>;
  if (typeof doc.expandKill !== 'string' || doc.expandKill.trim() === '') {
    throw new Error('expandKill must be a non-empty string');
  }
  const staySkillPrefixes = asStringArray(doc.staySkillPrefixes, 'staySkillPrefixes');
  const tddRaw = doc.tdd;
  if (!tddRaw || typeof tddRaw !== 'object') {
    throw new Error('tdd must be a mapping');
  }
  const tdd = tddRaw as Record<string, unknown>;
  if (typeof tdd.skill !== 'string' || typeof tdd.escapeHatch !== 'string') {
    throw new Error('tdd.skill and tdd.escapeHatch must be strings');
  }
  if (tdd.gears !== 'same-session') {
    throw new Error('tdd.gears must be same-session');
  }
  const pilotRaw = doc.pilot;
  if (!pilotRaw || typeof pilotRaw !== 'object') {
    throw new Error('pilot must be a mapping');
  }
  const pilotIn = pilotRaw as Record<string, unknown>;
  const pilot = {
    isolation: asStringArray(pilotIn.isolation, 'pilot.isolation'),
    audit: asStringArray(pilotIn.audit, 'pilot.audit'),
    sequential: asStringArray(pilotIn.sequential, 'pilot.sequential'),
    parent: asStringArray(pilotIn.parent, 'pilot.parent')
  };
  const rolesRaw = doc.roles;
  if (!rolesRaw || typeof rolesRaw !== 'object') {
    throw new Error('roles must be a mapping');
  }
  const roles: Record<string, SubagentRoleEntry> = {};
  for (const [name, value] of Object.entries(rolesRaw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') {
      throw new Error(`roles.${name} must be a mapping`);
    }
    const entry = value as Record<string, unknown>;
    if (entry.runtime !== 'subagent' && entry.runtime !== 'skill' && entry.runtime !== 'parent') {
      throw new Error(`roles.${name}.runtime must be subagent, skill, or parent`);
    }
    const parsed: SubagentRoleEntry = { runtime: entry.runtime };
    if (entry.bucket !== undefined) {
      if (!PILOT_BUCKETS.includes(entry.bucket as (typeof PILOT_BUCKETS)[number])) {
        throw new Error(`roles.${name}.bucket must be isolation, audit, or sequential`);
      }
      parsed.bucket = entry.bucket as SubagentBucket;
    }
    if (entry.readonly !== undefined) {
      if (typeof entry.readonly !== 'boolean') {
        throw new Error(`roles.${name}.readonly must be a boolean`);
      }
      parsed.readonly = entry.readonly;
    }
    roles[name] = parsed;
  }
  return {
    expandKill: doc.expandKill,
    staySkillPrefixes,
    tdd: {
      skill: tdd.skill,
      gears: 'same-session',
      escapeHatch: tdd.escapeHatch
    },
    pilot,
    roles
  };
}

function prefixStay(name: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => name.startsWith(prefix));
}

export function listGenerateSubagents(catalog: SubagentAllowlistCatalog | null): string[] {
  if (!catalog) return [];
  return Object.entries(catalog.roles)
    .filter(([, entry]) => entry.runtime === 'subagent')
    .map(([name]) => name);
}

export function verifySubagentAllowlist(repoDir: string): SubagentAllowlistResult {
  const errors: string[] = [];
  const yamlPath = path.join(repoDir, SUBAGENT_ALLOWLIST_REL);
  const docsPath = path.join(repoDir, SUBAGENT_DOCS_REL);
  let catalog: SubagentAllowlistCatalog | null = null;

  const runtimeFor = (skill: string): SubagentRuntime | null => {
    if (catalog && prefixStay(skill, catalog.staySkillPrefixes)) return 'skill';
    return catalog?.roles[skill]?.runtime ?? null;
  };

  if (!fs.existsSync(yamlPath)) {
    return { ok: false, errors: [`Missing ${SUBAGENT_ALLOWLIST_REL}`], catalog: null, runtimeFor };
  }

  try {
    catalog = parseCatalog(parseYaml(fs.readFileSync(yamlPath, 'utf8')));
  } catch (err) {
    return {
      ok: false,
      errors: [err instanceof Error ? err.message : String(err)],
      catalog: null,
      runtimeFor
    };
  }

  if (!/skill picker/i.test(catalog.expandKill)) {
    errors.push('expandKill must name the skill picker freeze');
  }

  for (const prefix of STAY_SKILL_PREFIXES) {
    if (!catalog.staySkillPrefixes.includes(prefix)) {
      errors.push(`staySkillPrefixes must include ${prefix}`);
    }
  }

  const skills = listSkillDirs(repoDir);
  for (const name of skills) {
    if (prefixStay(name, catalog.staySkillPrefixes)) {
      const listed = catalog.roles[name];
      if (listed && listed.runtime !== 'skill') {
        errors.push(`${name} is a stack profile and must stay a skill, not ${listed.runtime}`);
      }
      continue;
    }
    if (!catalog.roles[name]) {
      errors.push(`Unclassified kit skill: ${name}`);
    }
  }

  const tdd = catalog.roles[catalog.tdd.skill];
  if (tdd?.runtime !== 'subagent' || tdd.bucket !== 'sequential') {
    errors.push(`${catalog.tdd.skill} must be a sequential subagent with gears same-session`);
  }
  const hatch = catalog.roles[catalog.tdd.escapeHatch];
  if (hatch?.runtime !== 'skill') {
    errors.push(`${catalog.tdd.escapeHatch} must stay a skill (TDD escape hatch, not a second TDD agent)`);
  }

  const expectedSub = [...catalog.pilot.isolation, ...catalog.pilot.audit, ...catalog.pilot.sequential].sort();
  const actualSub = listGenerateSubagents(catalog).sort();
  if (expectedSub.join(',') !== actualSub.join(',')) {
    errors.push(
      `pilot isolation+audit+sequential must match roles with runtime subagent (expected ${expectedSub.join(', ')})`
    );
  }

  for (const name of catalog.pilot.isolation) {
    const entry = catalog.roles[name];
    if (entry?.runtime !== 'subagent' || entry.bucket !== 'isolation') {
      errors.push(`${name} must be isolation subagent`);
    }
  }
  for (const name of catalog.pilot.audit) {
    const entry = catalog.roles[name];
    if (entry?.runtime !== 'subagent' || entry.bucket !== 'audit' || entry.readonly !== true) {
      errors.push(`${name} must be a readonly audit subagent`);
    }
    const skillMdPath = path.join(repoDir, 'skills', name, 'SKILL.md');
    if (fs.existsSync(skillMdPath)) {
      const skillMd = fs.readFileSync(skillMdPath, 'utf8');
      const fm = skillMd.match(/^---\s*\n([\s\S]*?)\n---/);
      if (!fm || !/^readonly:\s*true\s*$/m.test(fm[1])) {
        errors.push(`${name} SKILL.md must set readonly: true`);
      }
    }
  }
  for (const name of catalog.pilot.sequential) {
    const entry = catalog.roles[name];
    if (entry?.runtime !== 'subagent' || entry.bucket !== 'sequential') {
      errors.push(`${name} must be a sequential subagent`);
    }
  }
  if (catalog.pilot.parent.join(',') !== 'agent-orchestrator') {
    errors.push('pilot.parent must be agent-orchestrator only');
  }
  if (catalog.roles['agent-orchestrator']?.runtime !== 'parent') {
    errors.push('agent-orchestrator must be runtime parent, not a generated specialist');
  }

  if (!fs.existsSync(docsPath)) {
    errors.push(`Missing ${SUBAGENT_DOCS_REL}`);
  } else {
    const docs = fs.readFileSync(docsPath, 'utf8');
    for (const needle of ['isolation', 'audit', 'sequential', 'parent', 'skill picker']) {
      if (!docs.toLowerCase().includes(needle)) {
        errors.push(`${SUBAGENT_DOCS_REL} must mention ${needle}`);
      }
    }
    if (!/gear 1/i.test(docs) || !docs.includes('agent-adapter')) {
      errors.push(`${SUBAGENT_DOCS_REL} must keep TDD gear 1+2 in one agent and name agent-adapter`);
    }
  }

  return { ok: errors.length === 0, errors, catalog, runtimeFor };
}

export function printSubagentAllowlistResult(result: SubagentAllowlistResult): void {
  if (!result.ok) {
    for (const msg of result.errors) {
      console.error(`ERROR: ${msg}`);
    }
    console.error('');
    console.error('Subagent allowlist check FAILED. See skills/subagents.yaml and docs/subagents.md.');
    return;
  }
  const names = listGenerateSubagents(result.catalog);
  console.log(`OK: subagent allowlist (${names.length} generate stubs, orchestrator parent, profiles stay skills)`);
}
