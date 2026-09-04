import fs from 'node:fs';
import path from 'node:path';

/** Profile names only. Never secrets. Gitignored. */
export const MCP_PROFILE_STAMP_REL = path.join('.agents', 'mcp-profile.stamp');

/** Reserved `wk mcp` profile that re-composes the previous named profile. */
export const MCP_RESTORE_PROFILE = 'restore';

export const MCP_RESTORE_GITIGNORE_COMMENT =
  '# Waykit MCP session restore (profile names only; never secrets)';

export const MCP_RESTORE_GITIGNORE_PATTERNS = [
  '.agents/mcp-profile.stamp',
  '*.json.bak.*'
] as const;

export interface McpProfileStamp {
  previous: string | undefined;
  current: string;
}

export function mcpProfileStampPath(projectDir: string): string {
  return path.join(projectDir, MCP_PROFILE_STAMP_REL);
}

export function readMcpProfileStamp(projectDir: string): McpProfileStamp | undefined {
  const filePath = mcpProfileStampPath(projectDir);
  if (!fs.existsSync(filePath)) return undefined;
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;
    const rec = parsed as Record<string, unknown>;
    const current = typeof rec.current === 'string' ? rec.current : undefined;
    if (!current) return undefined;
    const previous = typeof rec.previous === 'string' ? rec.previous : undefined;
    return { current, previous };
  } catch {
    return undefined;
  }
}

export function writeMcpProfileStamp(projectDir: string, stamp: McpProfileStamp): string {
  const filePath = mcpProfileStampPath(projectDir);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify({ previous: stamp.previous ?? null, current: stamp.current }, null, 2)}\n`);
  return filePath;
}

export function gitignoreHasPattern(text: string, pattern: string): boolean {
  return text.split(/\r?\n/).some((line) => line.trim() === pattern);
}

export function ensureMcpRestoreGitignore(projectDir: string): string {
  const gitignorePath = path.join(projectDir, '.gitignore');
  const existing = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8') : '';
  const missing = MCP_RESTORE_GITIGNORE_PATTERNS.filter((pattern) => !gitignoreHasPattern(existing, pattern));
  if (missing.length === 0) return gitignorePath;
  const block = [MCP_RESTORE_GITIGNORE_COMMENT, ...missing].join('\n');
  const next = existing.trimEnd() === '' ? `${block}\n` : `${existing.trimEnd()}\n\n${block}\n`;
  fs.writeFileSync(gitignorePath, next, 'utf8');
  return gitignorePath;
}

export function recordComposedProfile(projectDir: string, profileName: string): McpProfileStamp {
  const prior = readMcpProfileStamp(projectDir);
  const restoring = prior?.previous === profileName;
  const stamp: McpProfileStamp = restoring
    ? { previous: profileName, current: profileName }
    : { previous: prior?.current, current: profileName };
  writeMcpProfileStamp(projectDir, stamp);
  ensureMcpRestoreGitignore(projectDir);
  return stamp;
}

export function profileToRestore(projectDir: string): string {
  return readMcpProfileStamp(projectDir)?.previous ?? 'default';
}

export function resolveComposeProfileName(profileName: string, projectDir: string): string {
  if (profileName === MCP_RESTORE_PROFILE) {
    return profileToRestore(projectDir);
  }
  return profileName;
}
