import path from 'node:path';

/**
 * @typedef {'pass' | 'fail' | 'skip' | 'todo'} UnitTestOutcome
 * @typedef {{ name: string, file: string, outcome: UnitTestOutcome, durationMs: number, errorMessage?: string }} UnitTestCaseResult
 * @typedef {{ passed: number, failed: number, skipped: number, todo: number, total: number, durationMs: number }} UnitTestReportStats
 */

/** @param {string | undefined} file @param {string} [cwd] */
export function relativizeTestFile(file, cwd = process.cwd()) {
  if (!file) return '(unknown)';
  return path.isAbsolute(file) ? path.relative(cwd, file) || path.basename(file) : file;
}

/**
 * @param {{ type: string, data: { skip?: boolean | string, todo?: boolean | string, details?: { type?: string } } }} event
 * @returns {UnitTestOutcome | null}
 */
export function outcomeFromTestEvent(event) {
  const { type, data } = event;
  // Suites roll up children — only count leaf tests in the report.
  if (data.details?.type === 'suite') return null;
  if (data.skip || type === 'test:skip') return 'skip';
  if (data.todo || type === 'test:todo') return 'todo';
  if (type === 'test:fail') return 'fail';
  if (type === 'test:pass') return 'pass';
  return null;
}

/** @param {UnitTestCaseResult[]} cases @returns {UnitTestReportStats} */
export function summarizeUnitTests(cases) {
  const stats = {
    passed: 0,
    failed: 0,
    skipped: 0,
    todo: 0,
    total: cases.length,
    durationMs: 0
  };
  for (const c of cases) {
    stats.durationMs += c.durationMs;
    if (c.outcome === 'pass') stats.passed += 1;
    else if (c.outcome === 'fail') stats.failed += 1;
    else if (c.outcome === 'skip') stats.skipped += 1;
    else stats.todo += 1;
  }
  return stats;
}

/** @param {string} value */
function escapeCell(value) {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

/**
 * Markdown report for GitHub Actions job summaries / artifacts.
 * @param {UnitTestCaseResult[]} cases
 * @param {{ cwd?: string, title?: string }} [options]
 */
export function renderUnitTestReportMarkdown(cases, options = {}) {
  const title = options.title ?? 'Unit tests (`pnpm test`)';
  const stats = summarizeUnitTests(cases);
  const status = stats.failed > 0 ? 'FAILED' : stats.total === 0 ? 'NO TESTS' : 'PASSED';

  const lines = [
    `## ${title}`,
    '',
    `**Result:** ${status} — ${stats.passed} passed, ${stats.failed} failed, ${stats.skipped} skipped, ${stats.todo} todo (${stats.total} total, ${stats.durationMs.toFixed(0)}ms)`,
    '',
    'Node built-in test runner (`node:test`) covering kit unit tests and kit-knowledge MCP tests.',
    ''
  ];

  const failures = cases.filter((c) => c.outcome === 'fail');
  if (failures.length) {
    lines.push('### Failures', '');
    for (const f of failures) {
      lines.push(`- \`${escapeCell(f.file)}\` › **${escapeCell(f.name)}**`);
      if (f.errorMessage) {
        lines.push(`  - ${escapeCell(f.errorMessage)}`);
      }
    }
    lines.push('');
  }

  lines.push('<details>', '<summary>All test cases</summary>', '');
  lines.push('| File | Test | Result | Duration |');
  lines.push('|------|------|--------|----------|');
  for (const c of cases) {
    const mark =
      c.outcome === 'pass' ? 'PASS' : c.outcome === 'fail' ? 'FAIL' : c.outcome === 'skip' ? 'SKIP' : 'TODO';
    lines.push(
      `| ${escapeCell(c.file)} | ${escapeCell(c.name)} | ${mark} | ${c.durationMs.toFixed(1)}ms |`
    );
  }
  lines.push('', '</details>', '');
  return lines.join('\n');
}
