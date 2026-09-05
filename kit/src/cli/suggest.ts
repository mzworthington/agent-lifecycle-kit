import { KIT_TOP_LEVEL_COMMANDS } from './spec.js';

function levenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i]![0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,
        matrix[i]![j - 1]! + 1,
        matrix[i - 1]![j - 1]! + cost
      );
    }
  }
  return matrix[a.length]![b.length]!;
}

export function suggestKitCommand(input: string): string | undefined {
  let best: string | undefined;
  let bestDistance = Infinity;
  for (const candidate of KIT_TOP_LEVEL_COMMANDS) {
    if (candidate === 'help') continue;
    const distance = levenshtein(input.toLowerCase(), candidate);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  return bestDistance <= 2 ? best : undefined;
}

export function formatUnknownCommand(command: string, bin = 'wk'): string {
  const suggestion = suggestKitCommand(command);
  const lines = [`Unknown command: ${command}`];
  if (suggestion) lines.push(`Did you mean ${bin} ${suggestion}?`);
  lines.push(`Run ${bin} help for usage.`);
  return lines.join('\n');
}
