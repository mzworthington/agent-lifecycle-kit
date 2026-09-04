import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AGENTS_DIR_REL } from './generate_subagent_stubs.js';

export const MANAGED_AGENTS_MANIFEST = '.waykit-managed-agents.json';

export interface InstallSubagentStubsOptions {
  kitRepoDir: string;
  homedir?: string;
  destDirs?: string[];
}

export interface InstallSubagentStubsResult {
  destDirs: string[];
  written: string[];
  removed: string[];
}

interface ManagedManifest {
  files: string[];
}

export function userSubagentInstallDirs(homedir: string = os.homedir()): string[] {
  return [path.join(homedir, '.cursor', 'agents'), path.join(homedir, '.claude', 'agents')];
}

function listKitStubFiles(kitRepoDir: string): string[] {
  const dir = path.join(kitRepoDir, AGENTS_DIR_REL);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.md') && name.toLowerCase() !== 'readme.md')
    .sort();
}

function readManifest(destDir: string): ManagedManifest {
  const file = path.join(destDir, MANAGED_AGENTS_MANIFEST);
  if (!fs.existsSync(file)) return { files: [] };
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as { files?: unknown };
    const files = Array.isArray(raw.files)
      ? raw.files.filter((n): n is string => typeof n === 'string')
      : [];
    return { files };
  } catch {
    return { files: [] };
  }
}

function writeManifest(destDir: string, files: string[]): void {
  fs.writeFileSync(
    path.join(destDir, MANAGED_AGENTS_MANIFEST),
    `${JSON.stringify({ files }, null, 2)}\n`,
    'utf8'
  );
}

/**
 * Copy kit-generated stubs into user Cursor/Claude agent dirs.
 * Refreshes kit-managed files only; never writes product `.cursor/agents`
 * and never deletes custom agent files outside the manifest.
 */
export function installUserSubagentStubs(
  opts: InstallSubagentStubsOptions
): InstallSubagentStubsResult {
  const homedir = opts.homedir ?? os.homedir();
  const stubs = listKitStubFiles(opts.kitRepoDir);
  const srcDir = path.join(opts.kitRepoDir, AGENTS_DIR_REL);
  const destDirs = opts.destDirs ?? userSubagentInstallDirs(homedir);
  const written: string[] = [];
  const removed: string[] = [];

  for (const destDir of destDirs) {
    fs.mkdirSync(destDir, { recursive: true });
    const previous = new Set(readManifest(destDir).files);
    const next = new Set(stubs);

    for (const name of previous) {
      if (next.has(name)) continue;
      const stale = path.join(destDir, name);
      if (fs.existsSync(stale)) {
        fs.unlinkSync(stale);
        removed.push(stale);
      }
    }

    for (const name of stubs) {
      const from = path.join(srcDir, name);
      const to = path.join(destDir, name);
      fs.copyFileSync(from, to);
      written.push(to);
    }

    writeManifest(destDir, stubs);
  }

  return { destDirs, written, removed };
}
