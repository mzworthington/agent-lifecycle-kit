import path from 'node:path';
import type { AlignOwnedResult } from '../align/align_owned.js';
import type { AlignResult } from '../align/align_project.js';
import type { DoctorRunResult } from '../doctor/run.js';

export type JsonFindingStatus = 'ok' | 'fail';

export interface JsonFinding {
  id: string;
  status: JsonFindingStatus;
  path: string;
  detail?: string;
}

export interface JsonCommandReport {
  ok: boolean;
  command: string;
  findings: JsonFinding[];
}

function posixPath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

export function printJsonReport(report: JsonCommandReport, write: (msg: string) => void = console.log): void {
  write(
    JSON.stringify({
      ...report,
      findings: report.findings.map((item) => ({ ...item, path: posixPath(item.path) }))
    })
  );
}

function failFinding(id: string, filePath: string, detail: string): JsonFinding {
  return { id, status: 'fail', path: posixPath(filePath), detail };
}

export function alignResultToJson(result: AlignResult): JsonCommandReport {
  return {
    ok: result.ok,
    command: 'align',
    findings: result.findings.map((item) => ({
      id: item.id,
      status: item.status,
      path: posixPath(result.targetDir),
      detail: item.detail
    }))
  };
}

export function alignOwnedResultToJson(result: AlignOwnedResult): JsonCommandReport {
  if (result.error) {
    return {
      ok: false,
      command: 'align',
      findings: [failFinding('error', '.', result.error)]
    };
  }
  const findings: JsonFinding[] = [];
  for (const report of result.reports) {
    const filePath = report.targetDir ?? report.label;
    if (report.align) {
      const nested = alignResultToJson(report.align);
      for (const item of nested.findings) {
        findings.push({
          ...item,
          id: `${report.label}:${item.id}`,
          path: posixPath(filePath)
        });
      }
      continue;
    }
    findings.push({
      id: `skip:${report.label}`,
      status: 'ok',
      path: posixPath(filePath),
      detail: report.skipReason
    });
  }
  return { ok: result.ok, command: 'align', findings };
}

export function doctorResultToJson(result: DoctorRunResult): JsonCommandReport {
  if (result.error) {
    return {
      ok: false,
      command: 'doctor',
      findings: [failFinding('error', '.', result.error)]
    };
  }
  const findings: JsonFinding[] = [];
  for (const report of result.reports) {
    const base = report.targetDir ?? report.label;
    if (report.plan.skippedReason) {
      findings.push({
        id: `skip:${report.label}`,
        status: 'ok',
        path: posixPath(base),
        detail: report.plan.skippedReason
      });
      continue;
    }
    for (const item of report.plan.findings) {
      const filePath = report.targetDir
        ? path.join(report.targetDir, item.relPath)
        : `${report.label}/${item.relPath}`;
      findings.push({
        id: `${report.label}:${item.relPath}`,
        status: item.status === 'ok' ? 'ok' : 'fail',
        path: posixPath(filePath)
      });
    }
  }
  return { ok: result.ok, command: 'doctor', findings };
}
