import fs from 'node:fs';
import path from 'node:path';
import { exportIDERules, IDE_RULE_REL_PATHS } from '../bootstrap/export_ide_rules.js';
import { MCP_HOSTS, projectMcpPath } from '../bootstrap/mcp_hosts.js';
import { DEFAULT_TARGET_CHARS } from '../quality/measure_context_budget.js';

export type AlignStatus = 'ok' | 'fail';

export interface AlignFinding {
  id: string;
  label: string;
  status: AlignStatus;
  detail: string;
}

export interface AlignResult {
  ok: boolean;
  targetDir: string;
  findings: AlignFinding[];
  written: string[];
}

export interface AlignProjectOptions {
  targetDir: string;
  kitRepoDir: string;
  write: boolean;
}

function readIfPresent(filePath: string): string | undefined {
  if (!fs.existsSync(filePath)) return undefined;
  return fs.readFileSync(filePath, 'utf8');
}

function fileExists(dir: string, rel: string): boolean {
  return fs.existsSync(path.join(dir, rel));
}

function finding(id: string, label: string, ok: boolean, detail: string): AlignFinding {
  return { id, label, status: ok ? 'ok' : 'fail', detail };
}

function bulkLoadsPhilosophy(text: string): boolean {
  if (/do not bulk-read|do not bulk-load/i.test(text)) return false;
  return /before (starting work|phase work)[\s\S]{0,800}CODING_PHILOSOPHY/i.test(text)
    || /Read[\s\S]{0,200}CODING_PHILOSOPHY\.md[\s\S]{0,80}before/i.test(text);
}

function posixRel(fromDir: string, absPath: string): string {
  return path.relative(fromDir, absPath).split(path.sep).join('/');
}

function serverNamesFromDoc(doc: Record<string, unknown>): string[] {
  const names: string[] = [];
  for (const key of ['mcpServers', 'servers'] as const) {
    const block = doc[key];
    if (!block || typeof block !== 'object' || Array.isArray(block)) continue;
    names.push(...Object.keys(block as Record<string, unknown>));
  }
  return names;
}

interface ProjectMcpInspection {
  hasKitKnowledge: boolean;
  emptyPaths: string[];
}

function inspectProjectMcp(targetDir: string): ProjectMcpInspection {
  const emptyPaths: string[] = [];
  let hasKitKnowledge = false;
  for (const host of MCP_HOSTS) {
    const filePath = projectMcpPath(host, targetDir);
    if (!fs.existsSync(filePath)) continue;
    const rel = posixRel(targetDir, filePath);
    const raw = readIfPresent(filePath);
    if (raw === undefined || raw.trim() === '') {
      emptyPaths.push(rel);
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      emptyPaths.push(rel);
      continue;
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      emptyPaths.push(rel);
      continue;
    }
    const names = serverNamesFromDoc(parsed as Record<string, unknown>);
    if (!names.includes('kit-knowledge')) {
      emptyPaths.push(rel);
      continue;
    }
    hasKitKnowledge = true;
  }
  return { hasKitKnowledge, emptyPaths };
}

function commitMsgPresent(targetDir: string): boolean {
  return (
    fileExists(targetDir, path.join('.husky', 'commit-msg')) ||
    fileExists(targetDir, path.join('.githooks', 'commit-msg')) ||
    fileExists(targetDir, path.join('.git', 'hooks', 'commit-msg'))
  );
}

function handoverHomeOk(text: string, project: string): boolean {
  const folders = [...text.matchAll(/handover\/([A-Za-z0-9._-]+)/g)].map((m) => m[1] ?? '');
  if (folders.length === 0) return true;
  if (folders.includes('blueprint') && project !== 'blueprint') return false;
  return folders.includes(project);
}

function evaluate(targetDir: string): AlignFinding[] {
  const project = path.basename(path.resolve(targetDir));
  const agents = readIfPresent(path.join(targetDir, 'AGENTS.md'));
  const findings: AlignFinding[] = [];

  findings.push(finding('agents', 'AGENTS.md present', agents !== undefined, 'create via wk init or copy templates/project-AGENTS.md'));

  const budgetOk = agents !== undefined && Buffer.byteLength(agents, 'utf8') <= DEFAULT_TARGET_CHARS;
  findings.push(
    finding(
      'budget',
      `AGENTS.md under ${DEFAULT_TARGET_CHARS} chars`,
      budgetOk,
      agents === undefined ? 'missing AGENTS.md' : `${Buffer.byteLength(agents, 'utf8')} chars`
    )
  );

  const bulk = agents !== undefined && bulkLoadsPhilosophy(agents);
  findings.push(
    finding(
      'no-bulk-load',
      'Handshake does not eager-load philosophy',
      agents !== undefined && !bulk,
      'say “do not bulk-read”; load CODING_PHILOSOPHY.md only on demand'
    )
  );

  findings.push(
    finding(
      'kit-pointer',
      'Handshake points at ~/.agents',
      agents !== undefined && /~\/\.agents/.test(agents),
      'name ~/.agents as the kit root'
    )
  );

  const missingHosts = IDE_RULE_REL_PATHS.filter((rel) => !fileExists(targetDir, rel));
  findings.push(
    finding(
      'host-pointers',
      'Host rule pointers present',
      missingHosts.length === 0,
      missingHosts.length ? `missing ${missingHosts.join(', ')}` : 'CLAUDE.md, .cursorrules, GEMINI.md, Copilot, Windsurf'
    )
  );

  findings.push(
    finding(
      'commit-msg',
      'Conventional commit-msg hook',
      commitMsgPresent(targetDir),
      'add .githooks/commit-msg then git config core.hooksPath .githooks (or wk init --hook)'
    )
  );

  const mcp = inspectProjectMcp(targetDir);
  const mcpOk = mcp.hasKitKnowledge && mcp.emptyPaths.length === 0;
  findings.push(
    finding(
      'mcp-kit-knowledge',
      'Project MCP includes kit-knowledge',
      mcpOk,
      mcp.emptyPaths.length > 0 ? `empty ${mcp.emptyPaths.join(', ')}` : 'wk mcp default --project'
    )
  );

  findings.push(
    finding(
      'handover-home',
      `Handover path uses ${project}`,
      agents === undefined || handoverHomeOk(agents, project),
      `use ~/.agents/handover/${project}/, not a stale folder name`
    )
  );

  return findings;
}

const AGENTS_TEMPLATE_REL = path.join('templates', 'project-AGENTS.md');

function seedAgentsMd(targetDir: string, kitRepoDir: string): boolean {
  const dest = path.join(targetDir, 'AGENTS.md');
  if (fs.existsSync(dest)) return false;
  const src = path.join(kitRepoDir, AGENTS_TEMPLATE_REL);
  if (!fs.existsSync(src)) return false;
  fs.copyFileSync(src, dest);
  return true;
}

export function alignNextSteps(findings: AlignFinding[]): string[] {
  const failed = new Set(findings.filter((item) => item.status === 'fail').map((item) => item.id));
  const steps: string[] = [];
  if (failed.has('agents') || failed.has('host-pointers')) {
    steps.push('wk align . --write   # seed AGENTS.md if missing; fill host pointers');
  }
  if (
    !failed.has('agents') &&
    (failed.has('no-bulk-load') ||
      failed.has('kit-pointer') ||
      failed.has('budget') ||
      failed.has('handover-home'))
  ) {
    steps.push('Edit AGENTS.md (thin handshake, ~/.agents, handover/<this-folder>/)');
  }
  if (failed.has('commit-msg')) {
    steps.push('Add .githooks/commit-msg then git config core.hooksPath .githooks  (or wk init --hook)');
  }
  if (failed.has('mcp-kit-knowledge')) {
    steps.push('wk mcp default --project');
  }
  return steps;
}

export function alignProject(options: AlignProjectOptions): AlignResult {
  const targetDir = path.resolve(options.targetDir);
  const written: string[] = [];

  if (options.write) {
    if (seedAgentsMd(targetDir, options.kitRepoDir)) written.push('AGENTS.md');
    for (const rel of IDE_RULE_REL_PATHS) {
      if (!fileExists(targetDir, rel)) written.push(rel);
    }
    exportIDERules(targetDir, false, options.kitRepoDir);
  }

  const findings = evaluate(targetDir);
  return {
    ok: findings.every((f) => f.status === 'ok'),
    targetDir,
    findings,
    written: options.write ? written : []
  };
}

export function printAlignResult(result: AlignResult, log: (msg: string) => void = console.log): void {
  log(`=== align ${result.targetDir} ===`);
  for (const item of result.findings) {
    const mark = item.status === 'ok' ? 'ok  ' : 'fail';
    const extra = item.status === 'fail' && item.detail ? ` (${item.detail})` : '';
    log(`  ${mark}  ${item.label}${extra}`);
  }
  if (result.written.length > 0) {
    log(`wrote: ${result.written.join(', ')}`);
  }
  if (result.ok) log('✅ align PASSED.');
  else {
    log('align FAILED (consumer handshake/MCP/hooks). Doctor still owns README/license/templates.');
    const steps = alignNextSteps(result.findings);
    if (steps.length > 0) {
      log('next:');
      for (const step of steps) log(`  ${step}`);
    }
  }
}
