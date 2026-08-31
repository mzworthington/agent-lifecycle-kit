import fs from 'fs';
import path from 'path';

export interface FailureTrace {
  diagnosis: string;
  suggestedFix: string;
  expectedTool?: string;
  actualTool?: string;
  expectedArguments?: string;
  actualArguments?: string;
  llmOutput?: string;
}

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
  /** Populated for failed cases to drive Markdown failure traces. */
  trace?: FailureTrace;
  schemaOk?: boolean;
  routingOk?: boolean;
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
  schemaAdherence: number;
  hallucinationRate: number;
  totalTokens: number;
  avgLatencyMs: number;
  /** Optional rough USD estimate when KIT_EVAL_TOKEN_USD_PER_1K is set. */
  estimatedCostUsd?: number;
  results: CaseResult[];
}

function estimateCostUsd(totalTokens: number): number | undefined {
  const per1k = Number(process.env.KIT_EVAL_TOKEN_USD_PER_1K ?? '');
  if (!Number.isFinite(per1k) || per1k <= 0) return undefined;
  return (totalTokens / 1000) * per1k;
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
  const routingCases = input.results.filter(
    (r) => (r.tags ?? []).includes('routing') || r.routingOk !== undefined || r.tags === undefined
  );
  const routingPassed = routingCases.filter((r) => r.routingOk !== false && r.passed).length;
  // Prefer explicit routingOk when present
  const routingScored = input.results.filter((r) => r.routingOk !== undefined);
  const routingAccuracy = routingScored.length
    ? (routingScored.filter((r) => r.routingOk).length / routingScored.length) * 100
    : routingCases.length
      ? (routingPassed / routingCases.length) * 100
      : total
        ? (passed / total) * 100
        : 100;

  const schemaScored = input.results.filter((r) => r.schemaOk !== undefined);
  const schemaAdherence = schemaScored.length
    ? (schemaScored.filter((r) => r.schemaOk).length / schemaScored.length) * 100
    : 100;

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
    schemaAdherence,
    hallucinationRate,
    totalTokens,
    avgLatencyMs,
    estimatedCostUsd: estimateCostUsd(totalTokens),
    results: input.results
  };
}

function diagnoseFailure(result: CaseResult): FailureTrace {
  if (result.trace) return result.trace;

  const failureText = result.failures.join('; ');
  if (failureText.includes('routing:')) {
    return {
      diagnosis:
        'Tool Selection Failure. The model refused to use the expected tool or selected the wrong one.',
      suggestedFix:
        'Add a constraint to the system prompt instructing the agent to never guess architectural details and to always use the provided C4 / architecture tools.'
    };
  }
  if (failureText.includes('schema:')) {
    return {
      diagnosis:
        'Schema Violation. Tool arguments did not match the declared JSON schema (type or required fields).',
      suggestedFix:
        'Update the tool description to state it accepts one component at a time, or widen the backend schema if multi-intent prompts are supported.'
    };
  }
  if (failureText.includes('semantic:') || result.hallucinated) {
    return {
      diagnosis: 'Semantic Failure. LLM-as-a-judge flagged hallucination or inaccurate synthesis.',
      suggestedFix:
        'Tighten the system prompt to ground answers strictly in tool output; re-run with a stronger judge model locally before CI.'
    };
  }
  if (failureText.includes('self_correction')) {
    return {
      diagnosis: 'Self-Correction Failure. The agent did not update parameters from the error hint.',
      suggestedFix:
        'Instruct the agent to parse NotFound / validation hints and retry once with corrected arguments.'
    };
  }
  if (failureText.includes('terminal_fallback')) {
    return {
      diagnosis: 'Terminal Fallback Failure. The agent did not halt after consecutive tool failures.',
      suggestedFix:
        'Enforce a circuit breaker in the system prompt: after N consecutive timeouts, stop retrying and report the constraint to the user.'
    };
  }
  return {
    diagnosis: failureText || 'Assertion failure',
    suggestedFix: 'Inspect the prompt, tool schema, and system instructions for this case.'
  };
}

function renderSuiteMarkdown(report: SuiteReport): string {
  const date = report.finishedAt.slice(0, 10);
  const passRate = report.total ? (report.passed / report.total) * 100 : 100;
  const cost =
    report.estimatedCostUsd !== undefined
      ? ` (approx. $${report.estimatedCostUsd.toFixed(2)})`
      : '';

  const lines: string[] = [];
  lines.push(`# Agent Eval Report: ${report.suite}`);
  lines.push(`**Date:** ${date}`);
  lines.push(`**Model:** \`${report.model}\``);
  lines.push(`**Overall Pass Rate:** ${passRate.toFixed(1)}% (${report.passed}/${report.total})`);
  lines.push('');
  lines.push('## Performance Metrics');
  lines.push(`* **Total Tokens:** ${report.totalTokens.toLocaleString()}${cost}`);
  lines.push(`* **Average Latency:** ${Math.round(report.avgLatencyMs)}ms`);
  lines.push(`* **Routing Accuracy:** ${report.routingAccuracy.toFixed(1)}%`);
  lines.push(`* **Schema Adherence:** ${report.schemaAdherence.toFixed(1)}%`);
  if (report.hallucinationRate > 0 || report.results.some((r) => r.hallucinated !== undefined)) {
    lines.push(`* **Hallucination Rate:** ${report.hallucinationRate.toFixed(1)}%`);
  }
  lines.push('');

  const failures = report.results.filter((r) => !r.passed);
  if (failures.length === 0) {
    lines.push('## Failure Traces');
    lines.push('');
    lines.push('_No failures in this suite._');
    lines.push('');
  } else {
    lines.push('## Failure Traces');
    lines.push('');
    for (const f of failures) {
      const trace = diagnoseFailure(f);
      lines.push(`### Test ID: \`${f.id}\``);
      if (f.tags?.length) {
        lines.push(`**Tags:** ${f.tags.map((t) => `\`${t}\``).join(', ')}`);
      }
      lines.push(`* **Prompt:** "${f.prompt}"`);
      if (trace.expectedTool !== undefined || f.failures.some((x) => x.includes('routing'))) {
        lines.push(`* **Expected Tool:** \`${trace.expectedTool ?? 'see diagnosis'}\``);
        lines.push(
          `* **Actual Tool:** ${
            trace.actualTool ? `\`${trace.actualTool}\`` : '*None (Conversational Response)*'
          }`
        );
      }
      if (trace.expectedArguments !== undefined || trace.actualArguments !== undefined) {
        lines.push(`* **Expected Arguments:** \`${trace.expectedArguments ?? ''}\``);
        lines.push(`* **Actual Arguments:** \`${trace.actualArguments ?? ''}\``);
      }
      if (trace.llmOutput) {
        lines.push(`* **LLM Output:** "${trace.llmOutput}"`);
      }
      lines.push(`* **Diagnosis:** ${trace.diagnosis}`);
      lines.push(`* **Suggested Fix:** ${trace.suggestedFix}`);
      if (f.failures.length) {
        lines.push(`* **Raw Assertions:** ${f.failures.join('; ')}`);
      }
      lines.push('');
    }
  }

  lines.push('## Case Summary');
  lines.push('');
  lines.push('| ID | Result | Latency (ms) | Tokens |');
  lines.push('|----|--------|--------------|--------|');
  for (const r of report.results) {
    lines.push(
      `| ${r.id} | ${r.passed ? 'PASS' : 'FAIL'} | ${r.latencyMs.toFixed(1)} | ${r.tokens} |`
    );
  }
  lines.push('');
  return lines.join('\n');
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

  const parts: string[] = [];
  for (const report of reports) {
    parts.push(renderSuiteMarkdown(report));
  }
  const body = parts.join('\n---\n\n');

  const outPath = path.join(options.outDir, 'edd-report.md');
  fs.writeFileSync(outPath, body, 'utf8');
  written.push(outPath);

  // Stable PR-facing alias (docs and examples refer to eval-report.md)
  const alias = path.join(options.outDir, 'eval-report.md');
  fs.copyFileSync(outPath, alias);
  written.push(alias);
  return written;
}

export function printReportSummary(report: SuiteReport): void {
  console.log(`\nSuite: ${report.suite}`);
  console.log(`  Passed: ${report.passed}/${report.total}`);
  console.log(`  Routing accuracy: ${report.routingAccuracy.toFixed(1)}%`);
  console.log(`  Schema adherence: ${report.schemaAdherence.toFixed(1)}%`);
  console.log(`  Tokens: ${report.totalTokens} | Avg latency: ${report.avgLatencyMs.toFixed(1)}ms`);
  for (const r of report.results) {
    const mark = r.passed ? '✓' : '✗';
    console.log(`  ${mark} ${r.id}${r.failures.length ? ` — ${r.failures.join('; ')}` : ''}`);
  }
}
