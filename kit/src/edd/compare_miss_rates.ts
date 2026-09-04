import fs from 'node:fs';
import path from 'node:path';
import { ALLOWLISTED_SPECIALISTS, matchAllowlistedSpecialist } from './scripted_subagent_routing.js';
import { EvalCaseSchema, type EvalCase } from './schema.js';

export const SPECIALIST_ROUTING_DATASET_REL = 'evals/edd/subagent_routing.jsonl';
export const SKILL_PICKER_MATRIX_REL = 'evals/suites/routing-matrix.json';

/** Published generate list. Verify fails if freeze is on and a name leaves this set. */
export const FROZEN_GENERATE_BASELINE: readonly string[] = ALLOWLISTED_SPECIALISTS;

export const FREEZE_EXPAND_KILL =
  'Freeze the generate list. Specialist-launch miss rate is worse than the skill-picker miss rate.';

export type CompareDecision = 'freeze' | 'hold' | 'not-enough';

export interface MissRate {
  misses: number;
  n: number;
  /** Null when n is 0 — never a fake 0% win. */
  rate: number | null;
}

export interface CompareMissRatesInput {
  specialistCases: EvalCase[];
  skillPickerCases: Array<{ prompt: string; targetSkill: string }>;
  skills: Array<{ name: string; triggers: string[] }>;
  catalogExpandKill: string;
  specialistDatasetRel?: string;
  routingMatrixRel?: string;
}

export interface CompareMissRatesResult {
  decision: CompareDecision;
  specialist: MissRate;
  skillPicker: MissRate;
  specialistDataset: string;
  routingMatrix: string;
  expandKillLine: string;
}

export interface SkillTrigger {
  name: string;
  triggers: string[];
}

interface RoutingMatrixFile {
  test_cases?: Array<{ prompt?: string; target_skill?: string }>;
}

function parseTriggers(yamlText: string): string[] {
  const trigBlockMatch = yamlText.match(/triggers:\s*\n((?:\s*-\s*.*\n?)+)/);
  if (!trigBlockMatch) return [];
  const triggers: string[] = [];
  for (const line of trigBlockMatch[1].split('\n')) {
    const itemMatch = line.match(/^\s*-\s*['"]?([^'"]+)['"]?\s*$/);
    if (itemMatch) triggers.push(itemMatch[1].trim());
  }
  return triggers;
}

export function loadSkillTriggers(repoDir: string): SkillTrigger[] {
  const skillsDir = path.join(repoDir, 'skills');
  if (!fs.existsSync(skillsDir)) return [];
  const out: SkillTrigger[] = [];
  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillPath = path.join(skillsDir, entry.name, 'SKILL.md');
    if (!fs.existsSync(skillPath)) continue;
    const content = fs.readFileSync(skillPath, 'utf8');
    const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!fmMatch) continue;
    const nameMatch = fmMatch[1].match(/^name:\s*(.+)$/m);
    out.push({
      name: nameMatch ? nameMatch[1].trim() : entry.name,
      triggers: parseTriggers(fmMatch[1])
    });
  }
  return out;
}

export function readJsonlCases(filePath: string): EvalCase[] {
  if (!fs.existsSync(filePath)) return [];
  const cases: EvalCase[] = [];
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i]!.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    let raw: unknown;
    try {
      raw = JSON.parse(trimmed);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Invalid JSONL at ${filePath}:${i + 1}: ${msg}`);
    }
    const parsed = EvalCaseSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(
        `Invalid eval case at ${filePath}:${i + 1}: ${parsed.error.issues.map((issue) => issue.message).join('; ')}`
      );
    }
    cases.push(parsed.data);
  }
  return cases;
}

export function readRoutingMatrixCases(
  filePath: string
): Array<{ prompt: string; targetSkill: string }> {
  if (!fs.existsSync(filePath)) return [];
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as RoutingMatrixFile;
  const cases: Array<{ prompt: string; targetSkill: string }> = [];
  for (const row of raw.test_cases ?? []) {
    if (typeof row.prompt === 'string' && typeof row.target_skill === 'string') {
      cases.push({ prompt: row.prompt, targetSkill: row.target_skill });
    }
  }
  return cases;
}

export function isFromTraceCase(testCase: EvalCase): boolean {
  const tags = testCase.tags ?? [];
  if (tags.includes('requires-live')) return false;
  return tags.includes('prod-derived');
}

export function specialistLaunchMiss(testCase: EvalCase): boolean {
  const picked = matchAllowlistedSpecialist(testCase.prompt);
  if (testCase.expect?.no_tool) return picked !== null;
  const want = testCase.expect?.arguments_contains?.specialist;
  if (typeof want === 'string') return picked !== want;
  return true;
}

export function pickSkillsByTriggers(
  prompt: string,
  skills: Array<{ name: string; triggers: string[] }>
): string[] {
  const hay = prompt.toLowerCase();
  let best = 0;
  const winners: string[] = [];
  for (const skill of skills) {
    const score = skill.triggers.filter((trigger) => trigger && hay.includes(trigger.toLowerCase())).length;
    if (score === 0) continue;
    if (score > best) {
      best = score;
      winners.length = 0;
      winners.push(skill.name);
    } else if (score === best) {
      winners.push(skill.name);
    }
  }
  return winners;
}

export function skillPickerMiss(
  prompt: string,
  targetSkill: string,
  skills: Array<{ name: string; triggers: string[] }>
): boolean {
  const winners = pickSkillsByTriggers(prompt, skills);
  if (winners.length === 0) return true;
  return !winners.includes(targetSkill);
}

export function missRate(misses: number, n: number): MissRate {
  return { misses, n, rate: n === 0 ? null : misses / n };
}

export function compareMissRates(input: CompareMissRatesInput): CompareMissRatesResult {
  const fromTrace = input.specialistCases.filter(isFromTraceCase);
  let specialistMisses = 0;
  for (const row of fromTrace) {
    if (specialistLaunchMiss(row)) specialistMisses += 1;
  }
  const specialist = missRate(specialistMisses, fromTrace.length);

  let pickerMisses = 0;
  for (const row of input.skillPickerCases) {
    if (skillPickerMiss(row.prompt, row.targetSkill, input.skills)) pickerMisses += 1;
  }
  const skillPicker = missRate(pickerMisses, input.skillPickerCases.length);

  let decision: CompareDecision = 'not-enough';
  if (specialist.rate !== null && skillPicker.rate !== null) {
    decision = specialist.rate > skillPicker.rate ? 'freeze' : 'hold';
  }

  const expandKillLine =
    decision === 'freeze' ? FREEZE_EXPAND_KILL : input.catalogExpandKill.trim();

  return {
    decision,
    specialist,
    skillPicker,
    specialistDataset: input.specialistDatasetRel ?? SPECIALIST_ROUTING_DATASET_REL,
    routingMatrix: input.routingMatrixRel ?? SKILL_PICKER_MATRIX_REL,
    expandKillLine
  };
}

export function compareMissRatesFromRepo(
  repoDir: string,
  catalogExpandKill = ''
): CompareMissRatesResult {
  return compareMissRates({
    specialistCases: readJsonlCases(path.join(repoDir, SPECIALIST_ROUTING_DATASET_REL)),
    skillPickerCases: readRoutingMatrixCases(path.join(repoDir, SKILL_PICKER_MATRIX_REL)),
    skills: loadSkillTriggers(repoDir),
    catalogExpandKill,
    specialistDatasetRel: SPECIALIST_ROUTING_DATASET_REL,
    routingMatrixRel: SKILL_PICKER_MATRIX_REL
  });
}

export function formatMissRate(rate: MissRate): string {
  if (rate.n === 0 || rate.rate === null) return 'not-enough';
  return `${(rate.rate * 100).toFixed(1)}% (${rate.misses}/${rate.n})`;
}

export function formatCompareMissRates(result: CompareMissRatesResult): string {
  const specialistNote =
    result.specialist.n === 0
      ? `${formatMissRate(result.specialist)} (0 from-trace cases in ${result.specialistDataset})`
      : `${formatMissRate(result.specialist)} from ${result.specialistDataset}`;
  return [
    `decision: ${result.decision}`,
    `specialist-launch: ${specialistNote}`,
    `skill-picker: ${formatMissRate(result.skillPicker)} from ${result.routingMatrix}`,
    `expand-kill: ${result.expandKillLine}`
  ].join('\n');
}

export function generateNamesOutsideFreezeBaseline(names: readonly string[]): string[] {
  const allowed = new Set<string>(FROZEN_GENERATE_BASELINE);
  return names.filter((name) => !allowed.has(name));
}
