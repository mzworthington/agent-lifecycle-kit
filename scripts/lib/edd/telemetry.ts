import fs from 'fs';
import path from 'path';
import type { EvalCase } from './schema.js';

export interface CaseResult {
  id: string;
  prompt: string;
  passed: boolean;
  latencyMs: number;
  tokens: number;
  routingConfidence?: number;
  failures: string[];
  tags?: string[];
  hallucinated?: boolean;
}

export interface SuiteReport {
  suite: string;
  suitePath: string;
  model: string;
  startedAt: string;
  finishedAt: string;
  total: number;
  passed: number;
  failed: number;
  routingAccuracy: number;
  hallucinationRate: number;
  totalTokens: number;
  avgLatencyMs: number;
  results: CaseResult[];
}

export function buildSuiteReport(input: {
  suite: string;
  suitePath: string;
  model: string;
  startedAt: string;
  results: CaseResult[];
}): SuiteReport {
  const finishedAt = new Date().toISOString();
  const total = input.results.length;
  const passed = input.results.filter((r) => r.passed).length;
  const failed = total - passed;
  const routingCases = input.results.filter((r) => (r.tags ?? []).includes('routing') || r.tags === undefined);
  const routingPassed = routingCases.filter((r) => r.passed).length;
  const routingAccuracy = routingCases.length ? (routingPassed / routingCases.length) * 100 : (total ? (passed / total) * 100 : 100);
  const judged = input.results.filter((r) => r.hallucinated !== undefined);
  const hallucinated = judged.filter((r) => r.hallucinated).length;
  const hallucinationRate = judged.length ? (hallucinated / judged.length) * 100 : 0;
  const totalTokens = input.results.reduce((s, r) => s + r.tokens, 0);
  const avgLatencyMs = total ? input.results.reduce((s, r) => s + r.latencyMs, 0) / total : 0;

  return {
    suite: input.suite,
    suitePath: input.suitePath,
    model: input.model,
    startedAt: input.startedAt,
    finishedAt,
    total,
    passed,
    failed,
    routingAccuracy,
    hallucinationRate,
    totalTokens,
    avgLatencyMs,
    results: input.results
  };
}

export function generateReport(
  reports: SuiteReport[],
  options: { format: 'md' | 'json'; outDir: string }
): string[] {
  fs.mkdirSync(options.outDir, { recursive: true });
  const written: string[] = [];

  if (options.format === 'json') {
    const outPath = path.join(options.outDir, 'edd-report.json');
    let merged: SuiteReport[] = reports;
    if (fs.existsSync(outPath)) {
      try {
        const prev = JSON.parse(fs.readFileSync(outPath, 'utf8')) as SuiteReport[];
        if (Array.isArray(prev)) {
          const byPath = new Map(prev.map((r) => [r.suitePath, r]));
          for (const r of reports) byPath.set(r.suitePath, r);
          merged = [...byPath.values()];
        }
      } catch {
        merged = reports;
      }
    }
    fs.writeFileSync(outPath, JSON.stringify(merged, null, 2) + '\n', 'utf8');
    written.push(outPath);
    return written;
  }

  const lines: string[] = [];
  lines.push('# EDD Evaluation Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('Readable artifact for PR review: routing failures, schema/parameter hallucinations, semantic (LLM-as-a-judge) misses, token cost, and latency to tool call.');
  lines.push('');

  for (const report of reports) {
    lines.push(`## ${report.suite}`);
    lines.push('');
    lines.push(`- Suite path: \`${report.suitePath}\``);
    lines.push(`- Model: \`${report.model}\``);
    lines.push(`- Passed: ${report.passed}/${report.total}`);
    lines.push(`- Routing accuracy: ${report.routingAccuracy.toFixed(1)}%`);
    lines.push(`- Hallucination rate: ${report.hallucinationRate.toFixed(1)}%`);
    lines.push(`- Total tokens: ${report.totalTokens}`);
    lines.push(`- Avg latency: ${report.avgLatencyMs.toFixed(1)} ms`);
    lines.push('');
    lines.push('| ID | Result | Latency (ms) | Tokens | Failures |');
    lines.push('|----|--------|--------------|--------|----------|');
    for (const r of report.results) {
      const fail = r.failures.length ? r.failures.join('; ').replace(/\|/g, '/') : '';
      lines.push(
        `| ${r.id} | ${r.passed ? 'PASS' : 'FAIL'} | ${r.latencyMs.toFixed(1)} | ${r.tokens} | ${fail} |`
      );
    }
    lines.push('');
  }

  const outPath = path.join(options.outDir, 'edd-report.md');
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
  written.push(outPath);

  const alias = path.join(options.outDir, 'eval-report.md');
  fs.copyFileSync(outPath, alias);
  written.push(alias);
  return written;
}

export function printReportSummary(report: SuiteReport): void {
  console.log(`\nSuite: ${report.suite}`);
  console.log(`  Passed: ${report.passed}/${report.total}`);
  console.log(`  Routing accuracy: ${report.routingAccuracy.toFixed(1)}%`);
  console.log(`  Tokens: ${report.totalTokens} | Avg latency: ${report.avgLatencyMs.toFixed(1)}ms`);
  for (const r of report.results) {
    const mark = r.passed ? '✓' : '✗';
    console.log(`  ${mark} ${r.id}${r.failures.length ? ` — ${r.failures.join('; ')}` : ''}`);
  }
}
