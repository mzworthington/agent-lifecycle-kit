import fs from 'fs';
import path from 'path';
import { resolveRepoDir } from '../shared/paths.js';

const defaultRepoDir: string = resolveRepoDir(import.meta.url);

interface IDETarget {
  filename: string;
  templateName: string;
  fallbackContent: string;
}

export const IDE_RULE_REL_PATHS: readonly string[] = [
  'GEMINI.md',
  'CLAUDE.md',
  '.windsurfrules',
  '.cursorrules',
  path.join('.github', 'copilot-instructions.md')
];

const IDE_TARGETS: IDETarget[] = [
  {
    filename: 'GEMINI.md',
    templateName: 'project-GEMINI.md',
    fallbackContent: `# Gemini CLI entry point\n\nThe canonical bootstrap lives in [AGENTS.md](./AGENTS.md).\n\nRead [AGENTS.md](./AGENTS.md) for context structure, lifecycle routing, and specialist activation.\n`
  },
  {
    filename: 'CLAUDE.md',
    templateName: 'project-CLAUDE.md',
    fallbackContent: `# Claude Code entry point\n\nThe canonical bootstrap lives in [AGENTS.md](./AGENTS.md).\n\nRead [AGENTS.md](./AGENTS.md) for context structure, lifecycle routing, and specialist activation.\n`
  },
  {
    filename: '.windsurfrules',
    templateName: 'project-windsurfrules',
    fallbackContent: `# Windsurf entry point\n\nThe canonical bootstrap lives in [AGENTS.md](./AGENTS.md).\n\nRead [AGENTS.md](./AGENTS.md) for context structure, lifecycle routing, and specialist activation.\n`
  },
  {
    filename: '.cursorrules',
    templateName: 'project-cursorrules',
    fallbackContent: `# Cursor entry point\n\nThe canonical bootstrap lives in [AGENTS.md](./AGENTS.md).\n\nRead [AGENTS.md](./AGENTS.md) for context structure, lifecycle routing, and specialist activation.\n`
  },
  {
    filename: path.join('.github', 'copilot-instructions.md'),
    templateName: 'project-copilot-instructions.md',
    fallbackContent: `# GitHub Copilot Workspace entry point\n\nThe canonical bootstrap lives in [AGENTS.md](./AGENTS.md).\n\nRead [AGENTS.md](./AGENTS.md) for context structure, lifecycle routing, and specialist activation.\n`
  }
];

export function exportIDERules(
  targetDir: string = defaultRepoDir,
  checkOnly: boolean = false,
  kitRepoDir: string = defaultRepoDir
): boolean {
  let allValid = true;

  for (const target of IDE_TARGETS) {
    const destPath = path.join(targetDir, target.filename);
    const templatePath = path.join(kitRepoDir, 'templates', target.templateName);

    let contentToUse = target.fallbackContent;
    if (fs.existsSync(templatePath)) {
      contentToUse = fs.readFileSync(templatePath, 'utf8');
    }

    if (checkOnly) {
      if (!fs.existsSync(destPath)) {
        console.error(`❌ [IDE Rule Sync] Missing entry point file: ${target.filename}`);
        allValid = false;
      } else {
        console.log(`✓ [IDE Rule Sync] Found ${target.filename}`);
      }
    } else {
      const parentDir = path.dirname(destPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      fs.writeFileSync(destPath, contentToUse, 'utf8');
      console.log(`Exported ${target.filename}`);
    }
  }

  return allValid;
}
