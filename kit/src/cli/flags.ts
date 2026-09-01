/** Next argv token after `name`, including another flag if that is what follows. */
export function flagValue(args: string[], name: string): string | undefined {
  const idx = args.indexOf(name);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

export function hasFlag(args: string[], name: string): boolean {
  return args.includes(name);
}

export function firstPositional(args: string[]): string | undefined {
  return args.find((a) => !a.startsWith('--'));
}
