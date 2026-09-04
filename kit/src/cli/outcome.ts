/** First token on report commands so humans and scripts can scan ok / warn / fail. */

export const CLI_OUTCOMES = ['ok', 'warn', 'fail'] as const;
export type CliOutcome = (typeof CLI_OUTCOMES)[number];

export function formatCliOutcome(outcome: CliOutcome, command: string, summary: string): string {
  return `${outcome.padEnd(4)}  ${command}  ${summary}`;
}

export function printCliOutcome(
  outcome: CliOutcome,
  command: string,
  summary: string,
  io?: {
    log?: (msg: string) => void;
    error?: (msg: string) => void;
  }
): void {
  const line = formatCliOutcome(outcome, command, summary);
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
