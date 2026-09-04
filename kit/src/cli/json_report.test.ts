import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { printJsonReport, type JsonCommandReport } from './json_report.js';

describe('printJsonReport', () => {
  it('prints valid JSON with ids, ok/fail, and paths', () => {
    const report: JsonCommandReport = {
      ok: false,
      command: 'align',
      findings: [{ id: 'agents', status: 'fail', path: '/app', detail: 'missing' }]
    };
    let out = '';
    printJsonReport(report, (msg) => {
      out = msg;
    });
    const parsed = JSON.parse(out) as JsonCommandReport;
    assert.equal(parsed.ok, false);
    assert.equal(parsed.findings[0]?.id, 'agents');
    assert.equal(parsed.findings[0]?.status, 'fail');
    assert.equal(parsed.findings[0]?.path, '/app');
  });
});
