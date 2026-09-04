import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveModel, type ResolvedHostModel } from '../models/catalog.js';

export const HANDOVER_STATUSES = ['COMPLETE', 'BLOCKED'] as const;
export type HandoverStatus = (typeof HANDOVER_STATUSES)[number];

export interface HandoverContract {
  path: string | null;
  phase: string | null;
  status: HandoverStatus | null;
  nextAgent: string | null;
  ticket: string | null;
}

export interface SpecialistLaunchInput {
  skill: string;
  project: string;
  ticket?: string;
  handoverPaths: string[];
  definitionOfDone: string;
  nextAgent: string;
  sameSessionGears?: boolean;
}

export interface SpecialistLaunchPrompt {
  skill: string;
  project: string;
  ticket: string | null;
  handoverPaths: string[];
  definitionOfDone: string;
  nextAgent: string;
  sameSessionGears: boolean;
  prompt: string;
}

export interface ResolveHandoverDirOptions {
  homedir?: string;
  kitRoot?: string;
  handoverDir?: string;
}

const NEXT_AGENT: Record<string, string> = {
  'agent-spec': 'agent-tdd',
  'agent-tdd': 'agent-xfn',
  'agent-xfn': 'agent-security',
  'agent-debug': 'agent-pre-commit',
  'agent-review': 'agent-orchestrator',
  'agent-security': 'agent-orchestrator',
  'agent-arch-drift': 'agent-orchestrator'
};

const PHASE_FOR_SKILL: Record<string, string> = {
  'agent-spec': 'spec',
  'agent-tdd': 'tdd',
  'agent-xfn': 'xfn',
  'agent-debug': 'debug',
  'agent-review': 'audit',
  'agent-security': 'audit',
  'agent-arch-drift': 'audit',
  'agent-prd': 'prd',
  'agent-adapter': 'impl'
};

export function recommendedNextAgent(skill: string): string {
  return NEXT_AGENT[skill] ?? 'agent-orchestrator';
}

export function phaseForSkill(skill: string): string {
  if (PHASE_FOR_SKILL[skill]) return PHASE_FOR_SKILL[skill];
  return skill.replace(/^agent-/, '');
}

export function sameSessionGears(skill: string): boolean {
  return skill === 'agent-tdd';
}

function cellValue(markdown: string, field: string): string | null {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    `\\|\\s*\\*\\*${escaped}\\*\\*\\s*\\|\\s*([^|\\n]+)\\|`,
    'i'
  );
  const match = markdown.match(re);
  if (!match) return null;
  const raw = match[1].trim().replace(/`/g, '');
  if (!raw || /^n\/a$/i.test(raw)) return null;
  return raw;
}

function firstAgentToken(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/agent-[a-z0-9-]+/i);
  return match ? match[0].toLowerCase() : value.split(/\s+/)[0] ?? null;
}

function firstTicketToken(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/\b[A-Z]{2,10}-\d+\b/);
  return match ? match[0] : null;
}

export function parseHandoverContract(markdown: string, filePath?: string): HandoverContract {
  const statusRaw = cellValue(markdown, 'Status');
  const status =
    statusRaw && (HANDOVER_STATUSES as readonly string[]).includes(statusRaw.toUpperCase())
      ? (statusRaw.toUpperCase() as HandoverStatus)
      : null;
  return {
    path: filePath ?? null,
    phase: cellValue(markdown, 'Phase'),
    status,
    nextAgent: firstAgentToken(cellValue(markdown, 'Next agent')),
    ticket: firstTicketToken(cellValue(markdown, 'Linear ticket'))
  };
}

export function definitionOfDoneForPhase(templateMarkdown: string, phase: string): string {
  const needle = phase.trim().toLowerCase();
  const lines = templateMarkdown.split('\n');
  const matches: string[] = [];
  for (const line of lines) {
    if (!line.includes('|')) continue;
    const lower = line.toLowerCase();
    if (!lower.includes(`**${needle}**`) && !lower.includes(`**${needle}** (`)) {
      if (!new RegExp(`\\*\\*${needle}\\*\\*`, 'i').test(line)) continue;
    }
    const cells = line.split('|').map((c) => c.trim()).filter(Boolean);
    if (cells.length < 2) continue;
    matches.push(cells[cells.length - 1] ?? '');
  }
  if (matches.length === 0) {
    return `Mark COMPLETE only when the ${phase} Definition of Done in templates/handover.md is met.`;
  }
  if (needle === 'tdd') {
    const shortLoop = matches.find((m) => /gear 1/i.test(m) && /gear 2/i.test(m));
    if (shortLoop) return shortLoop;
  }
  return matches[matches.length - 1] ?? matches[0]!;
}

export function buildSpecialistLaunchPrompt(input: SpecialistLaunchInput): SpecialistLaunchPrompt {
  const ticket = input.ticket?.trim() ? input.ticket.trim() : null;
  const gears = input.sameSessionGears === true || sameSessionGears(input.skill);
  const paths =
    input.handoverPaths.length > 0
      ? input.handoverPaths.map((p) => `- ${p}`).join('\n')
      : '- (none yet — write the first handover for this project)';
  const tdd = gears
    ? [
        '',
        'TDD: keep gear 1 (domain + mocked ports) and gear 2 (thin adapter + integration test) in this same child session when ports are new or changed. Do not split gears across agents. `agent-adapter` is an escape hatch only when gear 2 is too large.'
      ]
    : [];
  const prompt = [
    `You are the Waykit \`${input.skill}\` specialist. This is a fresh child window. Load \`skills/${input.skill}/SKILL.md\` (or \`~/.agents/skills/${input.skill}/SKILL.md\`) plus kit-knowledge. Do not re-explore the repo from an empty window.`,
    '',
    '## Launch contract',
    '',
    `| Field | Value |`,
    `|-------|-------|`,
    `| **Linear ticket** | ${ticket ?? 'n/a'} |`,
    `| **Project** | ${input.project} |`,
    `| **Definition of Done** | ${input.definitionOfDone} |`,
    `| **Next agent** | \`${input.nextAgent}\` |`,
    '',
    '## Previous handover files',
    '',
    paths,
    '',
    'Read those files first. Write `COMPLETE` or `BLOCKED` to `~/.agents/handover/' +
      input.project +
      `/${handoverFileForSkill(input.skill)}\`. Mark COMPLETE only when the Definition of Done is met.`,
    '',
    'Return a short summary only. The parent reads the handover file as the contract — not this chat summary.',
    ...tdd,
    ''
  ].join('\n');
  return {
    skill: input.skill,
    project: input.project,
    ticket,
    handoverPaths: [...input.handoverPaths],
    definitionOfDone: input.definitionOfDone,
    nextAgent: input.nextAgent,
    sameSessionGears: gears,
    prompt
  };
}

function handoverFileForSkill(skill: string): string {
  return `handover_${phaseForSkill(skill)}.md`;
}

export function resolveHandoverDir(project: string, opts: ResolveHandoverDirOptions = {}): string {
  if (opts.handoverDir && opts.handoverDir.trim()) {
    return path.resolve(opts.handoverDir);
  }
  const home = opts.homedir ?? os.homedir();
  const preferred = path.join(home, '.agents', 'handover', project);
  if (fs.existsSync(preferred)) return preferred;
  if (opts.kitRoot) {
    const alt = path.join(opts.kitRoot, 'handover', project);
    if (fs.existsSync(alt)) return alt;
  }
  return preferred;
}

export function listHandoverPaths(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.startsWith('handover_') && f.endsWith('.md'))
    .sort()
    .map((f) => path.join(dir, f));
}

export interface ComposeSpecialistLaunchInput {
  kitRoot: string;
  skill: string;
  project: string;
  ticket?: string;
  host?: string;
  specComplete?: boolean;
  blocked?: boolean;
  homedir?: string;
  handoverDir?: string;
}

export interface ComposedSpecialistLaunch extends SpecialistLaunchPrompt {
  model: ResolvedHostModel;
  handoverDir: string;
}

export function composeSpecialistLaunch(input: ComposeSpecialistLaunchInput): ComposedSpecialistLaunch {
  const handoverDir = resolveHandoverDir(input.project, {
    homedir: input.homedir,
    kitRoot: input.kitRoot,
    handoverDir: input.handoverDir
  });
  const templatePath = path.join(input.kitRoot, 'templates', 'handover.md');
  const template = fs.existsSync(templatePath) ? fs.readFileSync(templatePath, 'utf8') : '';
  const phase = phaseForSkill(input.skill);
  const launch = buildSpecialistLaunchPrompt({
    skill: input.skill,
    project: input.project,
    ticket: input.ticket,
    handoverPaths: listHandoverPaths(handoverDir),
    definitionOfDone: definitionOfDoneForPhase(template, phase),
    nextAgent: recommendedNextAgent(input.skill),
    sameSessionGears: sameSessionGears(input.skill)
  });
  return {
    ...launch,
    model: resolveModel(input.kitRoot, {
      skill: input.skill,
      host: input.host,
      specComplete: input.specComplete,
      blocked: input.blocked
    }),
    handoverDir
  };
}

export function readHandoverContract(
  project: string,
  opts: ResolveHandoverDirOptions & { phase?: string } = {}
): HandoverContract | null {
  const dir = resolveHandoverDir(project, opts);
  const files = listHandoverPaths(dir);
  if (files.length === 0) return null;
  let target = files[files.length - 1]!;
  if (opts.phase) {
    const want = `handover_${opts.phase.replace(/^handover_/, '')}.md`;
    const found = files.find((p) => path.basename(p) === want || path.basename(p).includes(opts.phase!));
    if (found) target = found;
    else return null;
  }
  const body = fs.readFileSync(target, 'utf8');
  return parseHandoverContract(body, target);
}
