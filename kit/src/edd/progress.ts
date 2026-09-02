import { usesScriptedDriver } from './agent-client.js';

export type EvalDriverKind = 'scripted' | 'live';
export type EvalCasePhase = 'agent' | 'judges';

export interface EvalSuiteStartInfo {
  driver: EvalDriverKind;
  model: string;
  baseUrl?: string;
  caseCount: number;
  skippedLive: number;
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

export function evalDriverKind(model: string, apiKey?: string): EvalDriverKind {
  return usesScriptedDriver(model, apiKey) ? 'scripted' : 'live';
}

export function formatSuiteStart(info: EvalSuiteStartInfo): string[] {
  const base =
    info.driver === 'live' && info.baseUrl
      ? `  base=${info.baseUrl.replace(/\/$/, '')}`
      : '';
  const lines = [
    `Eval driver: ${info.driver}  model=${info.model}${base}`,
    `Cases: ${info.caseCount}${info.skippedLive ? ` (${info.skippedLive} requires-live skipped)` : ''}`
  ];
  if (info.driver === 'live') {
    lines.push(
      'Progress: each case runs agent HTTP then optional judges; a pause after "agent" means the provider has not returned.'
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
