import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { loadSubagentAllowlist, SUBAGENTS_REL } from './subagents.js';

export const WAYKIT_MANAGED_MARKER = '<!-- waykit-managed -->';

export const SUBAGENT_HOSTS = ['cursor', 'claude'] as const;
export type SubagentHostId = (typeof SUBAGENT_HOSTS)[number];

export interface InstallHostSubagentsOptions {
  kitRepoDir: string;
  homedir?: string;
  dryRun?: boolean;
  log?: (msg: string) => void;
}

export interface InstallHostSubagentsResult {
  written: string[];
  refreshed: string[];
  skipped: string[];
}

export function userSubagentDir(host: SubagentHostId, homedir: string): string {
  if (host === 'cursor') return path.join(homedir, '.cursor', 'agents');
  return path.join(homedir, '.claude', 'agents');
}

export function isWaykitManaged(content: string): boolean {
  return content.includes(WAYKIT_MANAGED_MARKER);
}

function parseSkillMeta(skillMd: string): { name: string; description: string } | undefined {
  const match = skillMd.match(/^---\s*\n([\s\S]*?)\n---(?:\n|$)/);
  if (!match) return undefined;
  const raw = parseYaml(match[1]) as Record<string, unknown> | null;
  if (!raw || typeof raw !== 'object') return undefined;
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  const description = typeof raw.description === 'string' ? raw.description.trim() : '';
  if (!name || !description) return undefined;
  return { name, description };
}

export function renderHostSubagentStub(options: {
  host: SubagentHostId;
  skillName: string;
  description: string;
  readonly: boolean;
}): string {
  const frontmatter: Record<string, unknown> = {
    name: options.skillName,
    description: options.description,
    model: 'inherit'
  };
  if (options.host === 'cursor' && options.readonly) {
    frontmatter.readonly = true;
  }
  const yaml = stringifyYaml(frontmatter).trimEnd();
  return `---\n${yaml}\n---\n\n${WAYKIT_MANAGED_MARKER}\n\nLoad and follow \`~/.agents/skills/${options.skillName}/SKILL.md\`. Kit skills are canonical; this file is a host adapter.\n`;
}

export function installHostSubagents(options: InstallHostSubagentsOptions): InstallHostSubagentsResult {
  const result: InstallHostSubagentsResult = { written: [], refreshed: [], skipped: [] };
  const allowlistPath = path.join(options.kitRepoDir, SUBAGENTS_REL);
  if (!fs.existsSync(allowlistPath)) return result;

  const catalog = loadSubagentAllowlist(options.kitRepoDir);
  const homedir = options.homedir ?? os.homedir();
  const readonly = new Set(catalog.bandSkills('readonly-audit'));
  const log = options.log ?? (() => undefined);

  for (const host of SUBAGENT_HOSTS) {
    const dir = userSubagentDir(host, homedir);
    if (!options.dryRun) fs.mkdirSync(dir, { recursive: true });
    for (const skillName of catalog.generateAgent) {
      const dest = path.join(dir, `${skillName}.md`);
      const skillMdPath = path.join(options.kitRepoDir, 'skills', skillName, 'SKILL.md');
      if (!fs.existsSync(skillMdPath)) {
        result.skipped.push(dest);
        continue;
      }
      const meta = parseSkillMeta(fs.readFileSync(skillMdPath, 'utf8'));
      if (!meta) {
        result.skipped.push(dest);
        continue;
      }
      const stub = renderHostSubagentStub({
        host,
        skillName: meta.name,
        description: meta.description,
        readonly: readonly.has(skillName)
      });
      const existed = fs.existsSync(dest);
      if (existed) {
        const existing = fs.readFileSync(dest, 'utf8');
        if (!isWaykitManaged(existing)) {
          result.skipped.push(dest);
          continue;
        }
      }
      result.written.push(dest);
      if (existed) result.refreshed.push(dest);
      if (options.dryRun) {
        log(`DRY-RUN: write ${dest}`);
        continue;
      }
      fs.writeFileSync(dest, stub, 'utf8');
      log(`Installed ${host} subagent ${skillName} -> ${dest}`);
    }
  }

  return result;
}
