import path from 'node:path';
import { applyDoctorPlan, type TemplateVars } from './apply.js';
import {
  classifyRepoDir,
  existingCommunityPaths,
  listGitWorktrees,
  originNameWithOwner
} from './fs.js';
import type { GitHubPort } from './github.js';
import { communityRelPaths, planRepoDoctor, type DoctorPlan, type RepoClass } from './hygiene.js';
import { evaluateOwnership, type RepoView } from './ownership.js';
import { printCliOutcome } from '../cli/outcome.js';

export interface DoctorRunOptions {
  targetDir: string;
  write: boolean;
  owned: boolean;
  scanDir: string | undefined;
  repoClass: RepoClass | undefined;
  installHook: boolean;
  login: string | undefined;
  kitRepoDir: string;
  github: GitHubPort;
  copyrightHolder?: string;
  year?: string;
  resolveOrigin?: (dir: string) => string | undefined;
  listWorktrees?: (scanDir: string) => string[];
}

export interface DoctorRepoReport {
  label: string;
  targetDir: string | undefined;
  plan: DoctorPlan;
  written: string[];
  remoteOnly: boolean;
}

export interface DoctorRunResult {
  ok: boolean;
  reports: DoctorRepoReport[];
  error: string | undefined;
}

function varsFor(label: string, targetDir: string | undefined, copyrightHolder: string, year: string): TemplateVars {
  const nameWithOwner = label.includes('/') ? label : undefined;
  const project = targetDir ? path.basename(targetDir) : (nameWithOwner?.split('/')[1] ?? label);
  const login = nameWithOwner?.split('/')[0] ?? 'OWNER';
  return {
    PROJECT: project,
    YEAR: year,
    COPYRIGHT_HOLDER: copyrightHolder,
    REPO: nameWithOwner ?? project,
    GITHUB_LOGIN: login
  };
}

function remotePlan(view: RepoView, repoClass: RepoClass, github: GitHubPort, write: boolean, installHook: boolean): DoctorPlan {
  const existing = new Set<string>();
  for (const rel of communityRelPaths(repoClass)) {
    if (github.remoteFileExists(view.nameWithOwner, rel)) existing.add(rel);
  }
  return planRepoDoctor({
    repoClass,
    ownership: evaluateOwnership(view),
    existingRelPaths: existing,
    write,
    installHook,
    mode: 'fleet'
  });
}

export function runDoctor(opts: DoctorRunOptions): DoctorRunResult {
  const year = opts.year ?? String(new Date().getFullYear());
  const copyrightHolder = opts.copyrightHolder ?? process.env.WK_COPYRIGHT_HOLDER?.trim() ?? 'the copyright holders';
  const reports: DoctorRepoReport[] = [];

  if (opts.owned) {
    const login = opts.login ?? opts.github.currentUser();
    if (!login) {
      return { ok: false, reports: [], error: 'gh CLI required for --owned (or pass --login)' };
    }
    const sources = opts.github.listSources(login);
    const resolveOrigin = opts.resolveOrigin ?? originNameWithOwner;
    const listTrees = opts.listWorktrees ?? listGitWorktrees;
    const worktrees = opts.scanDir ? listTrees(opts.scanDir) : listTrees(opts.targetDir);
    for (const view of sources) {
      const ownership = evaluateOwnership(view);
      const clone = worktrees.find((dir) => resolveOrigin(dir) === view.nameWithOwner);
      const repoClass = clone
        ? classifyRepoDir(clone, opts.repoClass)
        : (opts.repoClass ?? 'product');
      if (clone) {
        const plan = planRepoDoctor({
          repoClass,
          ownership,
          existingRelPaths: existingCommunityPaths(clone, repoClass),
          write: opts.write,
          installHook: opts.installHook,
          mode: 'fleet'
        });
        const applied = applyDoctorPlan(plan, {
          targetDir: clone,
          kitRepoDir: opts.kitRepoDir,
          vars: varsFor(view.nameWithOwner, clone, copyrightHolder, year)
        });
        reports.push({
          label: view.nameWithOwner,
          targetDir: clone,
          plan,
          written: applied.written,
          remoteOnly: false
        });
      } else {
        const plan = remotePlan(view, repoClass, opts.github, opts.write, opts.installHook);
        reports.push({
          label: view.nameWithOwner,
          targetDir: undefined,
          plan: { ...plan, writes: [], installHooks: false, writeBlocked: true },
          written: [],
          remoteOnly: true
        });
      }
    }
    const ok = reports.every((r) => r.plan.ok || r.plan.skippedReason !== undefined);
    return { ok, reports, error: undefined };
  }

  const view = opts.github.viewFromCwd(opts.targetDir);
  const ownership = evaluateOwnership(view);
  const repoClass = classifyRepoDir(opts.targetDir, opts.repoClass);
  const plan = planRepoDoctor({
    repoClass,
    ownership,
    existingRelPaths: existingCommunityPaths(opts.targetDir, repoClass),
    write: opts.write,
    installHook: opts.installHook,
    mode: 'local'
  });
  const label = ownership.nameWithOwner ?? path.basename(opts.targetDir);
  const applied = applyDoctorPlan(plan, {
    targetDir: opts.targetDir,
    kitRepoDir: opts.kitRepoDir,
    vars: varsFor(label, opts.targetDir, copyrightHolder, year)
  });
  reports.push({
    label,
    targetDir: opts.targetDir,
    plan,
    written: applied.written,
    remoteOnly: false
  });
  return { ok: plan.ok || plan.skippedReason !== undefined, reports, error: undefined };
}

export function printDoctorResult(
  result: DoctorRunResult,
  log: (msg: string) => void = console.log,
  error: (msg: string) => void = console.error
): void {
  if (result.error) {
    error(`ERROR: ${result.error}`);
    return;
  }
  for (const report of result.reports) {
    const where = report.targetDir ?? 'not cloned';
    log(`=== ${report.label} (${report.plan.repoClass}) [${where}] ===`);
    if (report.plan.skippedReason) {
      log(`skip (${report.plan.skippedReason})`);
      continue;
    }
    if (report.remoteOnly) {
      log('remote check only (pass --scan with a local checkout to --write)');
    }
    if (report.plan.writeBlocked && !report.remoteOnly) {
      log(`write blocked (${report.plan.ownership.reason})`);
    }
    for (const finding of report.plan.findings) {
      const mark = finding.status === 'ok' ? 'ok  ' : 'miss';
      log(`  ${mark}  ${finding.relPath}`);
    }
    if (report.written.length > 0) {
      log(`wrote: ${report.written.join(', ')}`);
    }
    if (report.plan.installHooks) {
      log('hooks: installed');
    }
  }
  const hintAlign = result.reports.some(
    (report) => report.plan.skippedReason === undefined && report.plan.repoClass !== 'kit'
  );
  if (hintAlign) {
    log('Handshake (thin AGENTS, MCP, host pointers) is wk align ., not doctor.');
  }
  if (result.ok) printCliOutcome('ok', 'doctor', 'community files on owned sources', { log });
  else printCliOutcome('fail', 'doctor', 'missing community files on an owned repo', { log, error });
}
