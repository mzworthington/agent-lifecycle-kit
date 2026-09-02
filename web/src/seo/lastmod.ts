/**
 * Freshness per file, from git history rather than the build clock. A build date
 * on every URL tells a crawler nothing: everything looks equally new every deploy.
 */

/** Parse `git log --pretty=format:@%cs --name-only --no-merges` into path -> ISO date. */
export function parseGitLastModified(log: string): Map<string, string> {
  const dates = new Map<string, string>();
  let current = '';
  for (const line of log.split('\n')) {
    if (line.startsWith('@')) current = line.slice(1).trim();
    else if (line.trim() && current && !dates.has(line)) dates.set(line, current);
  }
  return dates;
}

export function resolveLastmod(
  file: string,
  dates: ReadonlyMap<string, string>,
  fallback: string
): string {
  return dates.get(file) ?? fallback;
}
