import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { EvalRunner } from './edd/runner.js';
import { generateReport, type SuiteReport } from './edd/telemetry.js';
import { watchTargets } from './edd/watch.js';
import { loadDataset } from './edd/dataset.js';
import {
  casesFromTraceFile,
  dedupeCases,
  lintCases,
  synthesizeFromSeeds
} from './edd/dataset-hygiene.js';
import type { EvalCase } from './edd/schema.js';

export interface EddCliOptions {
  repoDir: string;
  args: string[];
}

function printEddHelp(): void {
  console.log(`
Kit EDD (Eval-Driven Development) commands

Usage: kit eval <subcommand> [options]
       agent-kit eval <subcommand> [options]

Subcommands:
  run      --suite <path> [--model <name>] [--tags a,b] [--out <dir>] [--format md|json]
  watch    --suite <path> [--target <file-or-dir>] [--model <name>]
  report   --format <md|json> --out <dir> [--from <json-report>]
  ci       --suite <path> [--threshold-routing <pct>] [--model <name>] [--out <dir>]
  dataset  lint|dedupe|synthesize|from-trace [options]

Dataset options:
  lint         --dataset <jsonl>
  dedupe       --dataset <jsonl> [--out <jsonl>]
  synthesize   --dataset <jsonl> --count <n> [--out <jsonl>]
  from-trace   --trace <json> [--out <jsonl>]

Notes:
  - Default model is "scripted" (deterministic local driver for CI / offline). Cursor and Copilot users stay here; no API key.
  - Cases tagged requires-live are skipped on the scripted driver; nightly live runs include them.
  - Live LLM runs: KIT_EVAL_API_KEY (or OPENAI_API_KEY) plus --model <provider-model>. That HTTP path does not call Cursor Chat or Copilot Chat.
  - Bare "kit eval" (no subcommand) still runs the skill trigger harness.
`);
}

export function getEddFlag(args: string[], name: string): string | undefined {
  const idx = args.indexOf(name);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

export function getEddNumberFlag(args: string[], name: string, fallback: number): number {
  const raw = getEddFlag(args, name);
  if (raw === undefined) return fallback;
  const n = Number(raw);
  if (Number.isNaN(n)) throw new Error(`Invalid number for ${name}: ${raw}`);
  return n;
}

export function defaultEddSuite(repoDir: string): string {
  return path.join(repoDir, 'evals', 'edd', 'architecture_routing.yaml');
}

export function resolveEddSuite(repoDir: string, args: string[]): string {
  return path.resolve(process.cwd(), getEddFlag(args, '--suite') ?? defaultEddSuite(repoDir));
}

export function eddWatchTargets(repoDir: string, args: string[]): string[] {
  const suite = resolveEddSuite(repoDir, args);
  return [
    suite,
    getEddFlag(args, '--target'),
    path.join(repoDir, 'evals', 'edd'),
    path.dirname(suite)
  ].filter((t): t is string => Boolean(t));
}

function createRunner(repoDir: string, args: string[]): EvalRunner {
  const model = getEddFlag(args, '--model') ?? process.env.KIT_EVAL_MODEL ?? 'scripted';
  const tagsRaw = getEddFlag(args, '--tags');
  const tags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : undefined;
  const systemPromptPath =
    getEddFlag(args, '--system-prompt') ?? path.join(repoDir, 'evals', 'edd', 'system_prompt.md');
  return new EvalRunner({
    model,
    tags,
    systemPromptPath: fs.existsSync(systemPromptPath) ? systemPromptPath : undefined,
    apiKey: process.env.KIT_EVAL_API_KEY ?? process.env.OPENAI_API_KEY ?? process.env.ANTHROPIC_API_KEY,
    baseUrl: process.env.KIT_EVAL_BASE_URL ?? process.env.OPENAI_BASE_URL
  });
}

async function cmdRun(repoDir: string, args: string[]): Promise<number> {
  const suite = resolveEddSuite(repoDir, args);
  const runner = createRunner(repoDir, args);
  const report = await runner.runSuite(suite);
  const out = getEddFlag(args, '--out');
  if (out) {
    const outDir = path.resolve(process.cwd(), out);
    const format = (getEddFlag(args, '--format') as 'md' | 'json' | undefined) ?? 'md';
    const written = [
      ...runner.writeReports(format, outDir),
      ...(format === 'md' ? runner.writeReports('json', outDir) : [])
    ];
    console.log(`Wrote report(s): ${written.join(', ')}`);
  }
  return report.failed > 0 ? 1 : 0;
}

async function cmdWatch(repoDir: string, args: string[]): Promise<number> {
  const suite = resolveEddSuite(repoDir, args);
  const model = getEddFlag(args, '--model') ?? 'scripted';
  const targets = eddWatchTargets(repoDir, args);

  const runOnce = async (reason: string) => {
    console.log(`\n[edd watch] re-run (${reason}) model=${model}`);
    const runner = createRunner(repoDir, args);
    try {
      await runner.runSuite(suite);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[edd watch] suite error: ${msg}`);
    }
  };

  await runOnce('initial');
  console.log(`[edd watch] watching: ${targets.join(', ')} (Ctrl+C to stop)`);
  watchTargets({
    targets,
    onChange: async (file) => {
      await runOnce(file);
    }
  });

  await new Promise(() => {
    /* run until interrupted */
  });
  return 0;
}

async function cmdReport(repoDir: string, args: string[]): Promise<number> {
  const format = (getEddFlag(args, '--format') as 'md' | 'json' | undefined) ?? 'md';
  const outDir = path.resolve(process.cwd(), getEddFlag(args, '--out') ?? 'out/reports');
  const fromPath = getEddFlag(args, '--from');

  let reports: SuiteReport[];
  if (fromPath) {
    const abs = path.resolve(process.cwd(), fromPath);
    const raw = JSON.parse(fs.readFileSync(abs, 'utf8')) as SuiteReport | SuiteReport[];
    reports = Array.isArray(raw) ? raw : [raw];
  } else {
    const runner = createRunner(repoDir, args);
    reports = await runner.runSuites([resolveEddSuite(repoDir, args)]);
  }

  const written = generateReport(reports, { format, outDir });
  console.log(`Wrote Markdown/JSON evaluation report(s):\n${written.map((w) => `  - ${w}`).join('\n')}`);
  return 0;
}

async function cmdCi(repoDir: string, args: string[]): Promise<number> {
  const suite = resolveEddSuite(repoDir, args);
  const threshold = getEddNumberFlag(args, '--threshold-routing', 95);
  const outDir = path.resolve(process.cwd(), getEddFlag(args, '--out') ?? 'out/reports');
  const runner = createRunner(repoDir, ['--model', getEddFlag(args, '--model') ?? 'scripted', ...args]);
  const report = await runner.runSuite(suite);
  const written = runner.writeReports('md', outDir);
  runner.writeReports('json', outDir);
  console.log(`CI artifacts: ${written.join(', ')}`);
  console.log(`Routing accuracy: ${report.routingAccuracy.toFixed(1)}% (threshold ${threshold}%)`);

  if (report.routingAccuracy < threshold) {
    console.error(
      `EDD CI gate failed: routing accuracy ${report.routingAccuracy.toFixed(1)}% < ${threshold}%`
    );
    return 1;
  }
  if (report.failed > 0) {
    console.error(`EDD CI gate failed: ${report.failed} case(s) failed`);
    return 1;
  }
  console.log('EDD CI gate passed');
  return 0;
}

async function readJsonlRows(filePath: string): Promise<Array<{ line: number; raw: unknown }>> {
  const absolute = path.resolve(filePath);
  const stream = fs.createReadStream(absolute, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  const rows: Array<{ line: number; raw: unknown }> = [];
  let lineNo = 0;
  for await (const line of rl) {
    lineNo += 1;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    rows.push({ line: lineNo, raw: JSON.parse(trimmed) });
  }
  return rows;
}

function writeJsonl(filePath: string, cases: EvalCase[]): void {
  const abs = path.resolve(filePath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, cases.map((c) => JSON.stringify(c)).join('\n') + '\n', 'utf8');
}

async function cmdDataset(_repoDir: string, args: string[]): Promise<number> {
  const action = args[0];
  const rest = args.slice(1);
  if (!action || action === 'help' || action === '--help') {
    printEddHelp();
    return action ? 0 : 1;
  }

  try {
    if (action === 'lint') {
      const dataset = getEddFlag(rest, '--dataset');
      if (!dataset) throw new Error('dataset lint requires --dataset <jsonl>');
      const rows = await readJsonlRows(dataset);
      const issues = lintCases(rows);
      if (!issues.length) {
        console.log(`dataset lint: ok (${rows.length} cases)`);
        return 0;
      }
      for (const issue of issues) {
        console.error(`line ${issue.line}${issue.id ? ` id=${issue.id}` : ''}: ${issue.message}`);
      }
      return 1;
    }

    if (action === 'dedupe') {
      const dataset = getEddFlag(rest, '--dataset');
      if (!dataset) throw new Error('dataset dedupe requires --dataset <jsonl>');
      const cases = await loadDataset(dataset);
      const { kept, removed } = dedupeCases(cases);
      const out = getEddFlag(rest, '--out') ?? dataset;
      writeJsonl(out, kept);
      console.log(`dataset dedupe: kept ${kept.length}, removed ${removed.length} -> ${out}`);
      return 0;
    }

    if (action === 'synthesize') {
      const dataset = getEddFlag(rest, '--dataset');
      const count = getEddNumberFlag(rest, '--count', 1);
      if (!dataset) throw new Error('dataset synthesize requires --dataset <jsonl>');
      const seeds = await loadDataset(dataset);
      const generated = synthesizeFromSeeds(seeds, count);
      const out = getEddFlag(rest, '--out');
      if (!out) throw new Error('dataset synthesize requires --out <jsonl>');
      writeJsonl(out, generated);
      console.log(`dataset synthesize: wrote ${generated.length} paraphrases -> ${out}`);
      return 0;
    }

    if (action === 'from-trace') {
      const tracePath = getEddFlag(rest, '--trace');
      if (!tracePath) throw new Error('dataset from-trace requires --trace <json>');
      const raw = JSON.parse(fs.readFileSync(path.resolve(tracePath), 'utf8')) as unknown;
      const row = casesFromTraceFile(raw);
      const out = getEddFlag(rest, '--out');
      if (out) {
        const abs = path.resolve(out);
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.appendFileSync(abs, `${JSON.stringify(row)}\n`, 'utf8');
        console.log(`dataset from-trace: appended ${row.id} -> ${abs}`);
      } else {
        console.log(JSON.stringify(row));
      }
      return 0;
    }

    console.error(`Unknown dataset action: ${action}`);
    printEddHelp();
    return 1;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`dataset ${action}: ${msg}`);
    return 1;
  }
}

/**
 * Handle `kit eval …` when a subcommand is present.
 * Returns null when the caller should fall back to the legacy trigger harness.
 */
export async function handleEddEvalCli(options: EddCliOptions): Promise<number | null> {
  const { repoDir, args } = options;
  const sub = args[0];

  if (!sub || sub.startsWith('--')) {
    return null;
  }

  if (sub === 'help' || sub === '--help' || sub === '-h') {
    printEddHelp();
    return 0;
  }

  const rest = args.slice(1);
  switch (sub) {
    case 'run':
      return cmdRun(repoDir, rest);
    case 'watch':
      return cmdWatch(repoDir, rest);
    case 'report':
      return cmdReport(repoDir, rest);
    case 'ci':
      return cmdCi(repoDir, rest);
    case 'dataset':
      return cmdDataset(repoDir, rest);
    default:
      if (sub.endsWith('.yaml') || sub.endsWith('.yml') || sub === 'all') {
        return null;
      }
      console.error(`Unknown eval subcommand: ${sub}`);
      printEddHelp();
      return 1;
  }
}
