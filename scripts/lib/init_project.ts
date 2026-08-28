import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { composeMCP } from './compose_mcp.js';
import { exportIDERules } from './export_ide_rules.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoDir: string = process.env.REPO_DIR || path.resolve(__dirname, '../..');

export interface InitProjectOptions {
  targetDir: string;
  mcpProfile: string;
  installMCP: boolean;
  installIDE: boolean;
  installHook: boolean;
}

export function initProject(options: InitProjectOptions): void {
  const { targetDir, mcpProfile, installMCP, installIDE, installHook } = options;

  console.log(`=== Agent Lifecycle Kit - Project Bootstrapper ===`);
  console.log(`Target directory: ${targetDir}`);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // 1. Setup AGENTS.md
  const agentsPath = path.join(targetDir, 'AGENTS.md');
  if (fs.existsSync(agentsPath)) {
    console.log(`✓ AGENTS.md already exists in ${targetDir}`);
  } else {
    const templatePath = path.join(repoDir, 'templates', 'project-AGENTS.md');
    if (fs.existsSync(templatePath)) {
      fs.copyFileSync(templatePath, agentsPath);
      console.log(`✅ Created AGENTS.md in ${targetDir}`);
    } else {
      const fallback = `# Agent Bootstrap\n\nStandards and lifecycle agents live in ~/.agents - read ~/.agents/AGENTS.md before starting work.\n`;
      fs.writeFileSync(agentsPath, fallback, 'utf8');
      console.log(`✅ Created AGENTS.md (fallback) in ${targetDir}`);
    }
  }

  // 2. Export Multi-IDE Rules
  if (installIDE) {
    console.log(`Exporting Multi-IDE rule entry points...`);
    exportIDERules(targetDir, false);
  }

  // 3. Setup .cursor/mcp.json
  if (installMCP) {
    const cursorDir = path.join(targetDir, '.cursor');
    const mcpPath = path.join(cursorDir, 'mcp.json');
    if (!fs.existsSync(cursorDir)) {
      fs.mkdirSync(cursorDir, { recursive: true });
    }
    try {
      composeMCP(mcpProfile, mcpPath, false);
      console.log(`✅ Composed MCP profile "${mcpProfile}" to ${mcpPath}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`⚠️ MCP profile composition failed: ${msg}`);
    }
  }

  // 4. Setup Git Pre-Commit Hook if requested or present
  if (installHook) {
    const gitDir = path.join(targetDir, '.git');
    if (fs.existsSync(gitDir)) {
      const hooksDir = path.join(gitDir, 'hooks');
      if (!fs.existsSync(hooksDir)) {
        fs.mkdirSync(hooksDir, { recursive: true });
      }
      const hookPath = path.join(hooksDir, 'pre-commit');
      const hookScript = `#!/usr/bin/env bash\n# Pre-Commit Security & Quality Gate via Agent Lifecycle Kit\nset -e\nif [ -x "$HOME/.agents/scripts/scan-skill-security.sh" ]; then\n  "$HOME/.agents/scripts/scan-skill-security.sh"\nfi\n`;
      fs.writeFileSync(hookPath, hookScript, { mode: 0o755 });
      console.log(`✅ Installed pre-commit hook to ${hookPath}`);
    } else {
      console.log(`ℹ️  No .git directory found in ${targetDir}; skipping git hook installation.`);
    }
  }

  console.log(`\n🎉 Project bootstrapping complete!`);
}

// CLI entry point handling
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('init_project.ts')) {
  const args = process.argv.slice(2);

  let targetDir = process.cwd();
  let mcpProfile = 'default';
  let installMCP = true;
  let installIDE = true;
  let installHook = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--target' && i + 1 < args.length) {
      targetDir = path.resolve(process.cwd(), args[++i]);
    } else if (arg === '--mcp' && i + 1 < args.length) {
      mcpProfile = args[++i];
    } else if (arg === '--skip-mcp') {
      installMCP = false;
    } else if (arg === '--skip-ide') {
      installIDE = false;
    } else if (arg === '--hook' || arg === '--with-hook') {
      installHook = true;
    }
  }

  initProject({
    targetDir,
    mcpProfile,
    installMCP,
    installIDE,
    installHook
  });
}
