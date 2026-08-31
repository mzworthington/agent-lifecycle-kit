import fs from 'fs';
import path from 'path';
import { EvalRunner } from './edd/runner.js';
import { generateReport, type SuiteReport } from './edd/telemetry.js';
import { watchTargets } from './edd/watch.js';

export interface EddCliOptions {
  repoDir: string;
  args: string[];
}

function printEddHelp(): void {
  console.log(`
🧪 Kit EDD (Eval-Driven Development) commands

Usage: kit eval <subcommand> [options]
       agent-kit eval <subcommand> [options]

Subcommands:
  run      --suite <path> [--model <name>] [--tags a,b] [--out <dir>] [--format md|json]
  watch    --suite <path> [--target <file-or-dir>] [--model <name>]
  report   --format <md|json> --out <dir> [--from <json-report>]
  ci       --suite <path> [--threshold-routing <pct>] [--model <name>] [--out <dir>]

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
    // Re-run default suite to produce a fresh report artifact
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
  console.log('✅ EDD CI gate passed');
  return 0;
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
    default:
      // Unknown token — not an EDD subcommand; let legacy `kit eval` run
      if (sub.endsWith('.yaml') || sub.endsWith('.yml') || sub === 'all') {
        return null;
      }
      console.error(`Unknown eval subcommand: ${sub}`);
      printEddHelp();
      return 1;
  }
}
