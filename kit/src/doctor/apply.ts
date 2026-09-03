import fs from 'node:fs';
import path from 'node:path';
import { installGitHooks } from '../bootstrap/init_project.js';
import type { DoctorPlan, RepoClass } from './hygiene.js';

export interface TemplateVars {
  PROJECT: string;
  YEAR: string;
  COPYRIGHT_HOLDER: string;
  REPO: string;
  GITHUB_LOGIN: string;
}

export function licenseTemplateName(repoClass: RepoClass): string {
  return repoClass === 'kit' ? 'LICENSE.unlicense' : 'LICENSE.mit';
}

export function templateRelFor(communityPath: string, repoClass: RepoClass): string {
  if (communityPath === 'LICENSE') return path.join('community', licenseTemplateName(repoClass));
  if (communityPath === 'AGENTS.md') return 'project-AGENTS.md';
  return path.join('community', communityPath);
}

export function renderTemplate(source: string, vars: TemplateVars): string {
  return source
    .replaceAll('{{PROJECT}}', vars.PROJECT)
    .replaceAll('{{YEAR}}', vars.YEAR)
    .replaceAll('{{COPYRIGHT_HOLDER}}', vars.COPYRIGHT_HOLDER)
    .replaceAll('{{REPO}}', vars.REPO)
    .replaceAll('{{GITHUB_LOGIN}}', vars.GITHUB_LOGIN);
}

export function applyDoctorPlan(
  plan: DoctorPlan,
  opts: { targetDir: string; kitRepoDir: string; vars: TemplateVars; hooksDir?: string }
): { written: string[] } {
  const written: string[] = [];
  if (plan.writeBlocked) return { written };

  for (const item of plan.writes) {
    const dest = path.join(opts.targetDir, item.relPath);
    if (fs.existsSync(dest)) continue;
    const templatePath = path.join(opts.kitRepoDir, 'templates', templateRelFor(item.relPath, plan.repoClass));
    if (!fs.existsSync(templatePath)) {
      throw new Error(`missing community template: ${templatePath}`);
    }
    const body = renderTemplate(fs.readFileSync(templatePath, 'utf8'), opts.vars);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, body, 'utf8');
    written.push(item.relPath);
  }

  if (plan.installHooks) {
    installGitHooks({
      targetDir: opts.targetDir,
      kitRepoDir: opts.kitRepoDir,
      hooksDir: opts.hooksDir
    });
  }

  return { written };
}
