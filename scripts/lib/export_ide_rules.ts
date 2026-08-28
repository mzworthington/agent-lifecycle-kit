import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoDir: string = process.env.REPO_DIR || path.resolve(__dirname, '../..');

interface IDETarget {
  filename: string;
  templateName: string;
  fallbackContent: string;
}

const IDE_TARGETS: IDETarget[] = [
  {
    filename: 'GEMINI.md',
    templateName: 'GEMINI.md',
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

export function exportIDERules(targetDir: string = repoDir, checkOnly: boolean = false): boolean {
  let allValid = true;

  for (const target of IDE_TARGETS) {
    const destPath = path.join(targetDir, target.filename);
    const templatePath = path.join(repoDir, 'templates', target.templateName);

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

const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const targetArg = args.find(a => !a.startsWith('--'));
const targetDir = targetArg ? path.resolve(process.cwd(), targetArg) : repoDir;

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('export_ide_rules.ts')) {
  console.log(`=== Multi-IDE Rule Synchronizer (${checkOnly ? 'Check' : 'Export'}) ===`);
  const success = exportIDERules(targetDir, checkOnly);
  if (!success && checkOnly) {
    console.error('Multi-IDE rule check FAILED.');
    process.exit(1);
  } else if (checkOnly) {
    console.log('✅ Multi-IDE rule check PASSED.');
  }
}
