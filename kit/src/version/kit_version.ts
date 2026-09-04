export const STALE_AFTER_SECONDS = 14 * 24 * 60 * 60;

export interface KitVersionSnapshot {
  packageVersion: string;
  gitDescribe: string | undefined;
  agentsPath: string;
  kitRepoDir: string;
  agentsIsSymlink: boolean;
  agentsResolvesToKit: boolean;
}

export interface StaleCheck {
  aheadCount: number;
  localTipUnix: number | undefined;
  originTipUnix: number | undefined;
}

export function isOriginWeeksAhead(check: StaleCheck): boolean {
  if (check.aheadCount <= 0) return false;
  if (check.localTipUnix === undefined || check.originTipUnix === undefined) return false;
  return check.originTipUnix - check.localTipUnix >= STALE_AFTER_SECONDS;
}

export function kitVersionOutcome(
  snap: KitVersionSnapshot,
  stale: boolean
): { outcome: 'ok' | 'warn' | 'fail'; summary: string } {
  if (!snap.agentsIsSymlink || !snap.agentsResolvesToKit) {
    return { outcome: 'fail', summary: '~/.agents is not a symlink to this clone' };
  }
  if (stale) {
    return { outcome: 'warn', summary: 'origin is weeks ahead of this clone' };
  }
  return { outcome: 'ok', summary: '~/.agents points at this clone' };
}

export function formatKitVersion(snap: KitVersionSnapshot, opts?: { stale?: boolean }): string {
  const lines = [`waykit ${snap.packageVersion}`];
  if (snap.gitDescribe) lines.push(`git: ${snap.gitDescribe}`);
  if (snap.agentsIsSymlink && snap.agentsResolvesToKit) {
    lines.push(`~/.agents -> ${snap.kitRepoDir} (symlink to this clone)`);
  } else {
    lines.push(`~/.agents is ${snap.agentsPath} (not a symlink to this clone)`);
  }
  if (opts?.stale) {
    lines.push('warning: origin is weeks ahead of this clone (not pulling).');
    lines.push('update: git -C ~/.agents pull --ff-only');
  }
  return `${lines.join('\n')}\n`;
}
