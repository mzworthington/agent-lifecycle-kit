/** First token on report commands so humans and scripts can scan ok / warn / fail. */

export const CLI_OUTCOMES = ['ok', 'warn', 'fail'] as const;
export type CliOutcome = (typeof CLI_OUTCOMES)[number];

const RESET = '\x1b[0m';
const TOKEN_COLOR: Record<CliOutcome, string> = {
  ok: '\x1b[32m',
  warn: '\x1b[38;5;208m',
  fail: '\x1b[31m'
};

export function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

/** Color when stdout/stderr is a TTY. NO_COLOR disables; FORCE_COLOR enables (except FORCE_COLOR=0). */
export function cliOutcomeShouldColor(
  env: NodeJS.ProcessEnv = process.env,
  stream: { isTTY?: boolean } = process.stdout
): boolean {
  if (env.NO_COLOR !== undefined && env.NO_COLOR !== '') return false;
  if (env.FORCE_COLOR === '0') return false;
  if (env.FORCE_COLOR !== undefined && env.FORCE_COLOR !== '') return true;
  return stream.isTTY === true;
}

export function formatCliOutcome(
  outcome: CliOutcome,
  command: string,
  summary: string,
  opts?: { color?: boolean }
): string {
  const token = outcome.padEnd(4);
  const painted = opts?.color === true ? `${TOKEN_COLOR[outcome]}${token}${RESET}` : token;
  return `${painted}  ${command}  ${summary}`;
}

export function printCliOutcome(
  outcome: CliOutcome,
  command: string,
  summary: string,
  io?: {
    log?: (msg: string) => void;
    error?: (msg: string) => void;
    color?: boolean;
  }
): void {
  const stream = outcome === 'fail' ? process.stderr : process.stdout;
  const color = io?.color ?? cliOutcomeShouldColor(process.env, stream);
  const line = formatCliOutcome(outcome, command, summary, { color });
  if (outcome === 'fail') {
    (io?.error ?? console.error)(line);
    return;
  }
  (io?.log ?? console.log)(line);
}

/** Warnings stay exit 0. Fail is exit 1. */
export function cliOutcomeExit(outcome: CliOutcome): number {
  return outcome === 'fail' ? 1 : 0;
}

export function cliOutcomeFromOk(ok: boolean): CliOutcome {
  return ok ? 'ok' : 'fail';
}
