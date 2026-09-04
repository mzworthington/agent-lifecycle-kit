import fs from 'node:fs';
import path from 'node:path';

export const SPECIALIST_MISS_DATASET = 'evals/edd/subagent_routing.jsonl';
export const PICKER_MISS_DATASET = 'evals/suites/routing-matrix.json';
/** Last allowed generate-list size while miss-rate freeze is on (current seven specialists). */
export const FREEZE_GENERATE_MAX = 7;

export type MissRateSide = {
  label: string;
  relPath: string;
  total: number;
  prodDerived: number;
  /** Null when there are no prod-derived traces — not a 0% win. */
  rate: number | null;
  enough: boolean;
};

export type MissRateCompare = {
  specialist: MissRateSide;
  picker: MissRateSide;
  verdict: 'freeze' | 'hold' | 'not-enough';
};

export function formatMissRateCompare(cmp: MissRateCompare): string {
  const side = (s: MissRateSide) =>
    s.enough
      ? `${(s.rate! * 100).toFixed(1)}% (${s.prodDerived}/${s.total} prod-derived in ${s.relPath})`
      : `not-enough (0 prod-derived in ${s.relPath}${s.total ? `, ${s.total} cases` : ''})`;
  return [
    `specialist: ${side(cmp.specialist)}`,
    `skill-picker: ${side(cmp.picker)}`,
    `verdict: ${cmp.verdict}`
  ].join('\n');
}

export function freezeExpandKillLine(cmp: MissRateCompare, catalogLine: string): string {
  if (cmp.verdict === 'freeze') {
    return 'Freeze this generate list. Do not add a role.';
  }
  return catalogLine;
}

export function compareMissRates(
  repoDir: string,
  opts?: {
    specialistRel?: string;
    pickerRel?: string;
  }
): MissRateCompare {
  const specialistRel = opts?.specialistRel ?? SPECIALIST_MISS_DATASET;
  const pickerRel = opts?.pickerRel ?? PICKER_MISS_DATASET;
  const specialist = measureSide(repoDir, 'specialist', specialistRel);
  const picker = measureSide(repoDir, 'skill-picker', pickerRel);
  let verdict: MissRateCompare['verdict'] = 'not-enough';
  if (specialist.enough && picker.enough) {
    verdict = specialist.rate! > picker.rate! ? 'freeze' : 'hold';
  }
  return { specialist, picker, verdict };
}

function measureSide(repoDir: string, label: string, relPath: string): MissRateSide {
  const abs = path.join(repoDir, relPath);
  const counted = relPath.endsWith('.jsonl') ? countJsonl(abs) : countRoutingMatrix(abs);
  const total = counted?.total ?? 0;
  const prodDerived = counted?.prodDerived ?? 0;
  const enough = counted !== null && prodDerived > 0;
  return {
    label,
    relPath,
    total,
    prodDerived,
    rate: enough && total > 0 ? prodDerived / total : null,
    enough
  };
}

function countJsonl(abs: string): { total: number; prodDerived: number } | null {
  if (!fs.existsSync(abs)) return null;
  const lines = fs.readFileSync(abs, 'utf8').split(/\r?\n/);
  let total = 0;
  let prodDerived = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    let raw: unknown;
    try {
      raw = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (!raw || typeof raw !== 'object') continue;
    total += 1;
    const tags = (raw as { tags?: unknown }).tags;
    if (Array.isArray(tags) && tags.includes('prod-derived')) prodDerived += 1;
  }
  return { total, prodDerived };
}

function countRoutingMatrix(abs: string): { total: number; prodDerived: number } | null {
  if (!fs.existsSync(abs)) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object') return null;
  const cases = (raw as { test_cases?: unknown }).test_cases;
  if (!Array.isArray(cases)) return null;
  let prodDerived = 0;
  for (const c of cases) {
    if (!c || typeof c !== 'object') continue;
    const tags = (c as { tags?: unknown }).tags;
    if (Array.isArray(tags) && tags.includes('prod-derived')) prodDerived += 1;
  }
  return { total: cases.length, prodDerived };
}
