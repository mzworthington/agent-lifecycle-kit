import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

export const SUBAGENTS_REL = 'skills/subagents.yaml';

/** Frozen iteration-0 generate-agent set. Expanding this is a kill, not a default. */
export const PILOT_GENERATE_AGENT = [
  'agent-debug',
  'agent-xfn',
  'agent-review',
  'agent-security',
  'agent-arch-drift',
  'agent-spec',
  'agent-tdd'
] as const;

export type SubagentDisposition = 'generate-agent' | 'parent-only' | 'stay-skill';

export interface SubagentBand {
  id: string;
  disposition: SubagentDisposition;
  skills: string[];
}

export interface SubagentTddContract {
  skill: string;
  gears: number[];
  sameAgent: boolean;
  escapeHatch: string;
}

export interface SubagentAllowlist {
  version: number;
  iteration: number;
  kill: { freezeIf: string };
  bands: SubagentBand[];
  staySkillPrefixes: string[];
  tdd: SubagentTddContract;
  generateAgent: string[];
  parentOnly: string[];
  bandSkills: (id: string) => string[];
}

export interface SubagentAllowlistResult {
  ok: boolean;
  errors: string[];
}

function asStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`${label} must be a list of strings`);
  }
  return value as string[];
}

function asNumberArray(value: unknown, label: string): number[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'number')) {
    throw new Error(`${label} must be a list of numbers`);
  }
  return value as number[];
}

function isDisposition(value: unknown): value is SubagentDisposition {
  return value === 'generate-agent' || value === 'parent-only' || value === 'stay-skill';
}

export function loadSubagentAllowlist(kitRoot: string): SubagentAllowlist {
  const filePath = path.join(kitRoot, SUBAGENTS_REL);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${SUBAGENTS_REL}`);
  }
  const raw = parseYaml(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown> | null;
  if (!raw || typeof raw !== 'object') {
    throw new Error(`${SUBAGENTS_REL} must be a mapping`);
  }
  if (typeof raw.version !== 'number') {
    throw new Error(`${SUBAGENTS_REL} version must be a number`);
  }
  if (typeof raw.iteration !== 'number') {
    throw new Error(`${SUBAGENTS_REL} iteration must be a number`);
  }
  const killRaw = raw.kill;
  if (!killRaw || typeof killRaw !== 'object' || typeof (killRaw as { freezeIf?: unknown }).freezeIf !== 'string') {
    throw new Error(`${SUBAGENTS_REL} kill.freezeIf must be a string`);
  }
  const bandsRaw = raw.bands;
  if (!Array.isArray(bandsRaw)) {
    throw new Error(`${SUBAGENTS_REL} bands must be a list`);
  }
  const bands: SubagentBand[] = bandsRaw.map((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      throw new Error(`${SUBAGENTS_REL} bands[${index}] must be a mapping`);
    }
    const rec = entry as Record<string, unknown>;
    if (typeof rec.id !== 'string' || !rec.id) {
      throw new Error(`${SUBAGENTS_REL} bands[${index}].id must be a string`);
    }
    if (!isDisposition(rec.disposition)) {
      throw new Error(`${SUBAGENTS_REL} bands[${index}].disposition must be generate-agent, parent-only, or stay-skill`);
    }
    return {
      id: rec.id,
      disposition: rec.disposition,
      skills: asStringArray(rec.skills, `${SUBAGENTS_REL} bands[${index}].skills`)
    };
  });
  const stayRaw = raw.staySkill;
  if (!stayRaw || typeof stayRaw !== 'object') {
    throw new Error(`${SUBAGENTS_REL} staySkill must be a mapping`);
  }
  const staySkillPrefixes = asStringArray(
    (stayRaw as { prefixes?: unknown }).prefixes,
    `${SUBAGENTS_REL} staySkill.prefixes`
  );
  const tddRaw = raw.tdd;
  if (!tddRaw || typeof tddRaw !== 'object') {
    throw new Error(`${SUBAGENTS_REL} tdd must be a mapping`);
  }
  const tddRec = tddRaw as Record<string, unknown>;
  if (typeof tddRec.skill !== 'string' || typeof tddRec.sameAgent !== 'boolean' || typeof tddRec.escapeHatch !== 'string') {
    throw new Error(`${SUBAGENTS_REL} tdd needs skill, sameAgent, and escapeHatch`);
  }
  const tdd: SubagentTddContract = {
    skill: tddRec.skill,
    gears: asNumberArray(tddRec.gears, `${SUBAGENTS_REL} tdd.gears`),
    sameAgent: tddRec.sameAgent,
    escapeHatch: tddRec.escapeHatch
  };
  const generateAgent = bands
    .filter((band) => band.disposition === 'generate-agent')
    .flatMap((band) => band.skills);
  const parentOnly = bands
    .filter((band) => band.disposition === 'parent-only')
    .flatMap((band) => band.skills);
  return {
    version: raw.version,
    iteration: raw.iteration,
    kill: { freezeIf: (killRaw as { freezeIf: string }).freezeIf },
    bands,
    staySkillPrefixes,
    tdd,
    generateAgent,
    parentOnly,
    bandSkills: (id: string) => bands.find((band) => band.id === id)?.skills ?? []
  };
}

export function dispositionFor(catalog: SubagentAllowlist, skillName: string): SubagentDisposition {
  if (catalog.generateAgent.includes(skillName)) return 'generate-agent';
  if (catalog.parentOnly.includes(skillName)) return 'parent-only';
  return 'stay-skill';
}

export function verifySubagentAllowlist(kitRoot: string): SubagentAllowlistResult {
  const errors: string[] = [];
  const filePath = path.join(kitRoot, SUBAGENTS_REL);
  if (!fs.existsSync(filePath)) {
    return { ok: false, errors: [`missing ${SUBAGENTS_REL}`] };
  }
  let catalog: SubagentAllowlist;
  try {
    catalog = loadSubagentAllowlist(kitRoot);
  } catch (err: unknown) {
    return { ok: false, errors: [err instanceof Error ? err.message : String(err)] };
  }

  if (catalog.generateAgent.join(',') !== PILOT_GENERATE_AGENT.join(',')) {
    errors.push(
      `generate-agent ${catalog.generateAgent.join(', ')} is not the frozen pilot set (${PILOT_GENERATE_AGENT.join(', ')}). ${catalog.kill.freezeIf}`
    );
  }
  if (catalog.parentOnly.join(',') !== 'agent-orchestrator') {
    errors.push(`parent-only must be agent-orchestrator, got ${catalog.parentOnly.join(', ') || '(empty)'}`);
  }
  if (catalog.staySkillPrefixes.join(',') !== 'lang-,framework-,profile-') {
    errors.push('staySkill.prefixes must be lang-, framework-, profile-');
  }
  if (catalog.tdd.skill !== 'agent-tdd' || catalog.tdd.sameAgent !== true) {
    errors.push('tdd.skill must be agent-tdd with sameAgent: true');
  }
  if (catalog.tdd.gears.join(',') !== '1,2') {
    errors.push('tdd.gears must be [1, 2] on one agent');
  }
  if (catalog.tdd.escapeHatch !== 'agent-adapter') {
    errors.push('tdd.escapeHatch must be agent-adapter');
  }
  if (catalog.generateAgent.includes(catalog.tdd.escapeHatch)) {
    errors.push(`${catalog.tdd.escapeHatch} is the TDD escape hatch and must stay-skill, not generate-agent`);
  }
  if (!/freeze if auto-delegation is worse than today's skill picker/i.test(catalog.kill.freezeIf)) {
    errors.push("kill.freezeIf must name: freeze if auto-delegation is worse than today's skill picker");
  }

  const required = [...new Set([...catalog.generateAgent, ...catalog.parentOnly, catalog.tdd.escapeHatch])];
  for (const name of required) {
    const skillMd = path.join(kitRoot, 'skills', name, 'SKILL.md');
    if (!fs.existsSync(skillMd)) {
      errors.push(`listed skill missing SKILL.md: ${name}`);
    }
  }

  return { ok: errors.length === 0, errors };
}

export function printSubagentAllowlistResult(result: SubagentAllowlistResult): void {
  if (!result.ok) {
    for (const error of result.errors) {
      console.error(`ERROR: subagent allowlist: ${error}`);
    }
    return;
  }
  console.log('OK: subagent allowlist (pilot generate-agent set; stack profiles stay-skill)');
}
