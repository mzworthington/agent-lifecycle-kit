import fs from 'node:fs';
import path from 'node:path';

/** Profile names only. Never secrets. Gitignored. */
export const MCP_PROFILE_STAMP_REL = path.join('.agents', 'mcp-profile.stamp');

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

export function recordComposedProfile(projectDir: string, profileName: string): McpProfileStamp {
  const prior = readMcpProfileStamp(projectDir);
  const stamp: McpProfileStamp = {
    previous: prior?.current,
    current: profileName
  };
  writeMcpProfileStamp(projectDir, stamp);
  return stamp;
}

export function profileToRestore(projectDir: string): string {
  return readMcpProfileStamp(projectDir)?.previous ?? 'default';
}
