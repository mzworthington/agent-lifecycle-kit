import type { EvalStyle, JudgeBackend } from './eval-style.js';

export type EvalCasePhase = 'agent' | 'judges';

export interface EvalSuiteStartInfo {
  style: EvalStyle;
  model: string;
  baseUrl?: string;
  caseCount: number;
  skippedLive: number;
  judgeBackend?: JudgeBackend;
}

export interface EvalCaseStartInfo {
  index: number;
  total: number;
  id: string;
}

export interface EvalCasePhaseInfo extends EvalCaseStartInfo {
  phase: EvalCasePhase;
}

export interface EvalCaseDoneInfo extends EvalCaseStartInfo {
  passed: boolean;
  agentMs: number;
  totalMs: number;
}

/** Driven port so tests can record progress without capturing stdout. */
export interface EvalProgress {
  onSuiteStart(info: EvalSuiteStartInfo): void;
  onCasePhase(info: EvalCasePhaseInfo): void;
  onCaseDone(info: EvalCaseDoneInfo): void;
}

export function formatSuiteStart(info: EvalSuiteStartInfo): string[] {
  const base =
    info.style === 'http' && info.baseUrl
      ? `  base=${info.baseUrl.replace(/\/$/, '')}`
      : '';
  const lines = [
    `Eval style: ${info.style}  model=${info.model}${base}`,
    `Cases: ${info.caseCount}${info.skippedLive ? ` (${info.skippedLive} requires-live skipped)` : ''}`
  ];
  if (info.style === 'http') {
    lines.push(
      'Progress: each case runs agent HTTP then judges on the same model; a pause after "agent" means the provider has not returned.'
    );
  }
  if (info.style === 'cli') {
    lines.push(
      'Progress: each case spawns the same CLI for agent then judges (stdout buffered until exit). A pause after "agent" or "judges" means that process is still running — first-run download, login, or a hung prompt. Default timeout 120s; CLI stderr is forwarded.'
    );
  }
  return lines;
}

export function formatCasePhase(info: EvalCasePhaseInfo): string {
  return `  [${info.index}/${info.total}] ${info.id}  ${info.phase}…`;
}

export function formatCaseDone(info: EvalCaseDoneInfo): string {
  const mark = info.passed ? '✓' : '✗';
  const agent = Math.round(info.agentMs);
  const total = Math.round(info.totalMs);
  return `  ${mark} [${info.index}/${info.total}] ${info.id}  agent ${agent}ms  total ${total}ms`;
}

export function createConsoleEvalProgress(
  log: (msg: string) => void = (msg) => {
    console.log(msg);
  }
): EvalProgress {
  return {
    onSuiteStart(info) {
      for (const line of formatSuiteStart(info)) log(line);
    },
    onCasePhase(info) {
      log(formatCasePhase(info));
    },
    onCaseDone(info) {
      log(formatCaseDone(info));
    }
  };
}
