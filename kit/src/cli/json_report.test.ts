import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { AlignOwnedResult } from '../align/align_owned.js';
import type { AlignResult } from '../align/align_project.js';
import type { DoctorRunResult } from '../doctor/run.js';
import {
  alignOwnedResultToJson,
  alignResultToJson,
  doctorResultToJson,
  printJsonReport,
  type JsonCommandReport
} from './json_report.js';

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

describe('alignResultToJson', () => {
  it('maps finding ids, status, and the target path', () => {
    const result: AlignResult = {
      ok: false,
      targetDir: '/app',
      written: [],
      findings: [{ id: 'agents', label: 'AGENTS.md present', status: 'fail', detail: 'create via wk init' }]
    };
    const report = alignResultToJson(result);
    assert.equal(report.command, 'align');
    assert.equal(report.ok, false);
    assert.deepEqual(report.findings[0], {
      id: 'agents',
      status: 'fail',
      path: '/app',
      detail: 'create via wk init'
    });
  });
});

describe('alignOwnedResultToJson', () => {
  it('stays valid JSON with exit-fail findings when gh is missing', () => {
    const result: AlignOwnedResult = { ok: false, reports: [], error: 'gh CLI required' };
    const report = alignOwnedResultToJson(result);
    assert.equal(report.ok, false);
    assert.equal(report.findings[0]?.id, 'error');
    assert.equal(report.findings[0]?.status, 'fail');
    JSON.parse(JSON.stringify(report));
  });
});

describe('doctorResultToJson', () => {
  it('maps missing community files to fail with ids and paths', () => {
    const result: DoctorRunResult = {
      ok: false,
      error: undefined,
      reports: [
        {
          label: 'acme/app',
          targetDir: '/app',
          written: [],
          remoteOnly: false,
          plan: {
            repoClass: 'product',
            ownership: { inScope: true, reason: 'owned', nameWithOwner: 'acme/app' },
            ok: false,
            writeBlocked: false,
            skippedReason: undefined,
            findings: [
              { relPath: 'README.md', status: 'ok' },
              { relPath: 'LICENSE', status: 'missing' }
            ],
            writes: [],
            installHooks: false
          }
        }
      ]
    };
    const report = doctorResultToJson(result);
    assert.equal(report.command, 'doctor');
    assert.equal(report.ok, false);
    assert.equal(report.findings[0]?.id, 'acme/app:README.md');
    assert.equal(report.findings[0]?.status, 'ok');
    assert.equal(report.findings[0]?.path, '/app/README.md');
    assert.equal(report.findings[1]?.id, 'acme/app:LICENSE');
    assert.equal(report.findings[1]?.status, 'fail');
    assert.equal(report.findings[1]?.path, '/app/LICENSE');
  });

  it('prefixes remote-only findings with owner/repo when there is no clone path', () => {
    const result: DoctorRunResult = {
      ok: false,
      error: undefined,
      reports: [
        {
          label: 'acme/old',
          targetDir: undefined,
          written: [],
          remoteOnly: true,
          plan: {
            repoClass: 'product',
            ownership: { inScope: true, reason: 'owned', nameWithOwner: 'acme/old' },
            ok: false,
            writeBlocked: true,
            skippedReason: undefined,
            findings: [{ relPath: 'CONTRIBUTING.md', status: 'missing' }],
            writes: [],
            installHooks: false
          }
        }
      ]
    };
    const report = doctorResultToJson(result);
    assert.deepEqual(report.findings[0], {
      id: 'acme/old:CONTRIBUTING.md',
      status: 'fail',
      path: 'acme/old/CONTRIBUTING.md'
    });
  });
});
