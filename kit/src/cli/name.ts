/** Public CLI binary. `kit` and `agent-kit` remain aliases. */
export const CLI_BIN = 'wk';
export const CLI_ALIASES = ['kit', 'agent-kit'] as const;

export function cliUsage(rest: string): string {
  return `Usage: ${CLI_BIN} ${rest}`;
}
