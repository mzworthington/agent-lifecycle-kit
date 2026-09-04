import path from 'node:path';
import { alignProject, printAlignResult, type AlignResult } from './align_project.js';
import {
  classifyRepoDir,
  listGitWorktrees,
  originNameWithOwner
} from '../doctor/fs.js';
import type { GitHubPort } from '../doctor/github.js';
import { evaluateOwnership, type OwnershipReason } from '../doctor/ownership.js';

export type AlignOwnedSkipReason = OwnershipReason | 'kit' | 'not-cloned';
export type AlignOwnedReportKind = 'aligned' | 'skip';

export interface AlignOwnedReport {
  label: string;
  kind: AlignOwnedReportKind;
  skipReason: AlignOwnedSkipReason | undefined;
  targetDir: string | undefined;
  ok: boolean;
  align: AlignResult | undefined;
}

export interface AlignOwnedOptions {
  targetDir: string;
  write: boolean;
  composeMcp?: boolean;
  scanDir: string | undefined;
  login: string | undefined;
  kitRepoDir: string;
  github: GitHubPort;
  resolveOrigin?: (dir: string) => string | undefined;
  listWorktrees?: (scanDir: string) => string[];
}

export interface AlignOwnedResult {
  ok: boolean;
  reports: AlignOwnedReport[];
  error: string | undefined;
}

export function runAlignOwned(opts: AlignOwnedOptions): AlignOwnedResult {
  const login = opts.login ?? opts.github.currentUser();
  if (!login) {
    return { ok: false, reports: [], error: 'gh CLI required for --owned (or pass --login)' };
  }
  const sources = opts.github.listSources(login);
  const resolveOrigin = opts.resolveOrigin ?? originNameWithOwner;
  const listTrees = opts.listWorktrees ?? listGitWorktrees;
  const scanRoot = opts.scanDir ?? opts.targetDir;
  const worktrees = listTrees(scanRoot);
  const reports: AlignOwnedReport[] = [];

  for (const view of sources) {
    const ownership = evaluateOwnership(view);
    const clone = worktrees.find((dir) => resolveOrigin(dir) === view.nameWithOwner);
    if (ownership.reason === 'fork' || ownership.reason === 'archived' || ownership.reason === 'not-admin') {
      reports.push({
        label: view.nameWithOwner,
        kind: 'skip',
        skipReason: ownership.reason,
        targetDir: clone,
        ok: true,
        align: undefined
      });
      continue;
    }
    if (!clone) {
      reports.push({
        label: view.nameWithOwner,
        kind: 'skip',
        skipReason: 'not-cloned',
        targetDir: undefined,
        ok: true,
        align: undefined
      });
      continue;
    }
    const repoClass = classifyRepoDir(clone);
    if (repoClass === 'kit') {
      reports.push({
        label: view.nameWithOwner,
        kind: 'skip',
        skipReason: 'kit',
        targetDir: clone,
        ok: true,
        align: undefined
      });
      continue;
    }
    const align = alignProject({
      targetDir: clone,
      kitRepoDir: opts.kitRepoDir,
      write: opts.write,
      composeMcp: opts.composeMcp
    });
    reports.push({
      label: view.nameWithOwner,
      kind: 'aligned',
      skipReason: undefined,
      targetDir: clone,
      ok: align.ok,
      align
    });
  }

  return { ok: reports.every((r) => r.ok), reports, error: undefined };
}

export function printAlignOwnedResult(
  result: AlignOwnedResult,
  log: (msg: string) => void = console.log,
  error: (msg: string) => void = console.error
): void {
  if (result.error) {
    error(`ERROR: ${result.error}`);
    return;
  }
  for (const report of result.reports) {
    const where = report.targetDir ?? 'not cloned';
    const klass = report.skipReason === 'kit' ? 'kit' : path.basename(report.targetDir ?? report.label);
    log(`=== ${report.label} (${klass}) [${where}] ===`);
    if (report.kind === 'skip') {
      log(`skip (${report.skipReason})`);
      continue;
    }
    if (report.align) printAlignResult(report.align, log);
  }
  if (result.ok) log('✅ align PASSED.');
  else error('align FAILED (consumer handshake/MCP/hooks on an owned clone).');
}
