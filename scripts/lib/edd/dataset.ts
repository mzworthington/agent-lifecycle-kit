import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { EvalCaseSchema, type EvalCase } from './schema.js';

/**
 * Stream JSONL datasets line-by-line so large suites never need a full in-memory load.
 */
export async function* streamDataset(filePath: string): AsyncGenerator<EvalCase> {
  const absolute = path.resolve(filePath);
  if (!fs.existsSync(absolute)) {
    throw new Error(`Dataset not found: ${absolute}`);
  }

  const stream = fs.createReadStream(absolute, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let lineNo = 0;
  for await (const line of rl) {
    lineNo += 1;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    let raw: unknown;
    try {
      raw = JSON.parse(trimmed);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Invalid JSONL at ${absolute}:${lineNo}: ${msg}`);
    }
    const parsed = EvalCaseSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(
        `Invalid eval case at ${absolute}:${lineNo}: ${parsed.error.issues.map((i) => i.message).join('; ')}`
      );
    }
    yield parsed.data;
  }
}

export async function loadDataset(filePath: string, tags?: string[]): Promise<EvalCase[]> {
  const cases: EvalCase[] = [];
  for await (const testCase of streamDataset(filePath)) {
    if (tags?.length) {
      const caseTags = testCase.tags ?? [];
      if (!tags.some((t) => caseTags.includes(t))) continue;
    }
    cases.push(testCase);
  }
  return cases;
}

/** Format a production failure into a JSONL regression case (prod → dataset). */
export function productionTraceToJsonl(input: {
  id: string;
  prompt: string;
  history?: EvalCase['history'];
  tags?: string[];
  reason: 'unhandled_tool_exception' | 'circuit_breaker' | 'user_downvote' | 'shadow_fail';
}): string {
  const row: EvalCase = {
    id: input.id,
    prompt: input.prompt,
    history: input.history,
    tags: [...(input.tags ?? []), 'prod-derived', input.reason]
  };
  return JSON.stringify(row);
}
