import fs from 'fs';
import path from 'path';
import { composeMCP } from './compose_mcp.js';
import { exportIDERules } from './export_ide_rules.js';
import { gitHooksDir, projectCursorDir, resolveRepoDir } from '../shared/paths.js';

const defaultKitRepoDir: string = resolveRepoDir(import.meta.url);

export interface InitProjectOptions {
  targetDir: string;
  mcpProfile: string;
  installMCP: boolean;
  installIDE: boolean;
  installHook: boolean;
  kitRepoDir?: string;
  /** Override for tests; default is `<target>/.cursor`. */
  cursorDir?: string;
  /** Override for tests; default is `<target>/.git/hooks`. */
  hooksDir?: string;
}

export function initProject(options: InitProjectOptions): void {
  const { targetDir, mcpProfile, installMCP, installIDE, installHook } = options;
  const kitRepoDir = options.kitRepoDir ?? defaultKitRepoDir;

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
    const templatePath = path.join(kitRepoDir, 'templates', 'project-AGENTS.md');
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
    exportIDERules(targetDir, false, kitRepoDir);
  }

  // 3. Setup .cursor/mcp.json
  if (installMCP) {
    const cursorDir = options.cursorDir ?? projectCursorDir(targetDir);
    const mcpPath = path.join(cursorDir, 'mcp.json');
    if (!fs.existsSync(cursorDir)) {
      fs.mkdirSync(cursorDir, { recursive: true });
    }
    try {
      composeMCP(mcpProfile, mcpPath, false, { repoDir: kitRepoDir });
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
      const hooksDir = options.hooksDir ?? gitHooksDir(gitDir);
      if (!fs.existsSync(hooksDir)) {
        fs.mkdirSync(hooksDir, { recursive: true });
      }
      const hookPath = path.join(hooksDir, 'pre-commit');
      const hookScript = `#!/usr/bin/env bash\n# Pre-Commit Security & Quality Gate via Agent Lifecycle Kit\nset -e\nKIT="$HOME/.agents/bin/kit"\nif [ -x "$KIT" ]; then\n  "$KIT" audit\nelif command -v kit >/dev/null 2>&1; then\n  kit audit\nfi\n`;
      fs.writeFileSync(hookPath, hookScript, { mode: 0o755 });
      console.log(`✅ Installed pre-commit hook to ${hookPath}`);
    } else {
      console.log(`ℹ️  No .git directory found in ${targetDir}; skipping git hook installation.`);
    }
  }

  console.log(`\n🎉 Project bootstrapping complete!`);
}
