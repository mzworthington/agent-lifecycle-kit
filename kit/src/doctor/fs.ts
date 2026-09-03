import fs from 'node:fs';
import path from 'node:path';
import { classifyRepo, communityRelPaths, type RepoClass } from './hygiene.js';

export function classifyRepoDir(dir: string, explicit?: RepoClass): RepoClass {
  if (explicit) return explicit;
  const pkgPath = path.join(dir, 'package.json');
  let pkgName = '';
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { name?: string };
      pkgName = pkg.name ?? '';
    } catch {
      pkgName = '';
    }
  }
  const hasKitLayout =
    fs.existsSync(path.join(dir, 'bin', 'kit.ts')) && fs.existsSync(path.join(dir, 'skills'));
  const hasApp = fs.existsSync(path.join(dir, 'app', 'package.json'));
  return classifyRepo({
    hasKitLayout,
    hasTemplateName: /template/i.test(pkgName) || /template/i.test(path.basename(dir)),
    hasPulumiWithoutApp: fs.existsSync(path.join(dir, 'Pulumi.yaml')) && !hasApp,
    hasDocsSiteWithoutApp:
      !hasApp && fs.existsSync(path.join(dir, 'web')) && fs.existsSync(path.join(dir, 'docs'))
  });
}

export function existingCommunityPaths(dir: string, repoClass: RepoClass): Set<string> {
  const found = new Set<string>();
  for (const rel of communityRelPaths(repoClass)) {
    if (fs.existsSync(path.join(dir, rel))) found.add(rel);
  }
  return found;
}

export function listGitWorktrees(scanDir: string): string[] {
  if (!fs.existsSync(scanDir)) return [];
  const st = fs.statSync(scanDir);
  if (!st.isDirectory()) return [];
  const out: string[] = [];
  if (fs.existsSync(path.join(scanDir, '.git'))) out.push(path.resolve(scanDir));
  for (const name of fs.readdirSync(scanDir)) {
    const child = path.join(scanDir, name);
    try {
      if (fs.statSync(child).isDirectory() && fs.existsSync(path.join(child, '.git'))) {
        out.push(path.resolve(child));
      }
    } catch {
      continue;
    }
  }
  return out;
}

export function originNameWithOwnerFromGitConfig(text: string): string | undefined {
  const match = text.match(/github\.com[:/]([^/\s]+\/[^/\s]+)/);
  return match?.[1]?.replace(/\.git$/, '');
}

export function originNameWithOwner(dir: string): string | undefined {
  const gitConfig = path.join(dir, '.git', 'config');
  if (!fs.existsSync(gitConfig)) return undefined;
  return originNameWithOwnerFromGitConfig(fs.readFileSync(gitConfig, 'utf8'));
}
