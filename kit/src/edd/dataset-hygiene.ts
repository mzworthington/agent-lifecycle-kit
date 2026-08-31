import { EvalCaseSchema, type EvalCase } from './schema.js';
import { productionTraceToJsonl } from './dataset.js';
import { synthesizeParaphrases } from './synthesize.js';

export interface LintIssue {
  line: number;
  id?: string;
  message: string;
}

/** Pure dataset lint: schema + duplicate id detection. */
export function lintCases(rows: Array<{ line: number; raw: unknown }>): LintIssue[] {
  const issues: LintIssue[] = [];
  const seen = new Map<string, number>();
  for (const row of rows) {
    const parsed = EvalCaseSchema.safeParse(row.raw);
    if (!parsed.success) {
      issues.push({
        line: row.line,
        message: parsed.error.issues.map((i) => i.message).join('; ')
      });
      continue;
    }
    const prev = seen.get(parsed.data.id);
    if (prev !== undefined) {
      issues.push({
        line: row.line,
        id: parsed.data.id,
        message: `duplicate id also seen at line ${prev}`
      });
    } else {
      seen.set(parsed.data.id, row.line);
    }
  }
  return issues;
}

/** Pure dedupe by identical prompt + expect JSON; keeps first occurrence. */
export function dedupeCases(cases: EvalCase[]): { kept: EvalCase[]; removed: EvalCase[] } {
  const kept: EvalCase[] = [];
  const removed: EvalCase[] = [];
  const seen = new Set<string>();
  for (const c of cases) {
    const key = `${c.prompt}\n${JSON.stringify(c.expect ?? null)}`;
    if (seen.has(key)) {
      removed.push(c);
    } else {
      seen.add(key);
      kept.push(c);
    }
  }
  return { kept, removed };
}

export function casesFromTraceFile(raw: unknown): EvalCase {
  const trace = raw as {
    id?: string;
    prompt?: string;
    reason?: 'unhandled_tool_exception' | 'circuit_breaker' | 'user_downvote' | 'shadow_fail';
    history?: EvalCase['history'];
    tags?: string[];
    expect?: EvalCase['expect'];
  };
  if (!trace.id || !trace.prompt || !trace.reason) {
    throw new Error('Trace must include id, prompt, and reason');
  }
  const line = productionTraceToJsonl({
    id: trace.id,
    prompt: trace.prompt,
    reason: trace.reason,
    history: trace.history,
    tags: trace.tags,
    expect: trace.expect
  });
  return EvalCaseSchema.parse(JSON.parse(line));
}

export function synthesizeFromSeeds(seeds: EvalCase[], countPerSeed: number): EvalCase[] {
  return seeds.flatMap((s) => synthesizeParaphrases(s, countPerSeed));
}
