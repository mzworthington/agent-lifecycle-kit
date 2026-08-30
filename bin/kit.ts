#!/usr/bin/env node --import tsx/esm
import { fileURLToPath } from 'url';
import path from 'path';
import { spawnSync } from 'child_process';
import { exportIDERules } from '../scripts/lib/export_ide_rules.js';
import { initProject } from '../scripts/lib/init_project.js';
import { renderAnalyticsSummary } from '../scripts/lib/telemetry_analytics.js';
import { composeMCP } from '../scripts/lib/compose_mcp.js';
import { runEvals } from '../scripts/lib/run_evals.js';
import { handleEddEvalCli } from '../scripts/lib/edd_cli.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoDir = path.resolve(__dirname, '..');

function printHelp(): void {
  console.log(`
🤖 Agent Lifecycle Kit CLI (kit)

Usage: kit <command> [options]
       agent-kit <command> [options]

Commands:
  init [dir]           Bootstrap AGENTS.md, multi-IDE rules, .cursor/mcp.json & git hook
  mcp <profile>        Compose and install MCP profile (default, collab, ops, security, lab)
  audit                Run security & supply chain audit across skills and scripts
  validate             Validate evals structure against JSON schemas
  eval                 Run live trigger evals, or EDD subcommands (run|watch|report|ci)
  export-rules [dir]   Export and sync AGENTS.md to CLAUDE.md, .windsurfrules & Copilot rules
  metrics              Display telemetry analytics summary for subagent phase handovers
  verify               Verify skills directory layout conventions
  sync                 Sync official external skills (Cloudflare, Vercel)
  help                 Display this help menu

Examples:
  kit init ./my-app --mcp collab --hook
  kit mcp ops --install
  kit audit
  kit eval
  kit eval run --suite evals/edd/architecture_routing.yaml --model scripted
  kit eval ci --threshold-routing 95 --out out/reports
  kit eval report --format md --out out/reports
  kit export-rules
  kit metrics
`);
}

async function main(): Promise<void> {
  const args: string[] = process.argv.slice(2);
  const command: string | undefined = args[0];

  switch (command) {
    case 'init': {
      const targetIdx = args.indexOf('--target');
      let targetDir = process.cwd();
      if (targetIdx !== -1 && args[targetIdx + 1]) {
        targetDir = path.resolve(process.cwd(), args[targetIdx + 1]);
      } else if (args[1] && !args[1].startsWith('--')) {
        targetDir = path.resolve(process.cwd(), args[1]);
      }

      const mcpIdx = args.indexOf('--mcp');
      const mcpProfile = mcpIdx !== -1 && args[mcpIdx + 1] ? args[mcpIdx + 1] : 'default';

      initProject({
        targetDir,
        mcpProfile,
        installMCP: !args.includes('--skip-mcp'),
        installIDE: !args.includes('--skip-ide'),
        installHook: args.includes('--hook') || args.includes('--with-hook')
      });
      break;
    }

    case 'mcp': {
      const profile = args[1] || 'default';
      const install = args.includes('--install');
      const outIdx = args.indexOf('-o');
      const outputFile = outIdx !== -1 ? args[outIdx + 1] : undefined;

      composeMCP(profile, outputFile, install);
      break;
    }

    case 'audit': {
      const res = spawnSync(path.join(repoDir, 'scripts', 'scan-skill-security.sh'), {
        stdio: 'inherit',
        env: { ...process.env, REPO_DIR: repoDir }
      });
      process.exit(res.status ?? 0);
      break;
    }

    case 'validate': {
      const res = spawnSync(path.join(repoDir, 'scripts', 'validate-evals.sh'), {
        stdio: 'inherit',
        env: { ...process.env, REPO_DIR: repoDir }
      });
      process.exit(res.status ?? 0);
      break;
    }

    case 'eval': {
      const eddCode = await handleEddEvalCli({ repoDir, args: args.slice(1) });
      if (eddCode !== null) {
        process.exit(eddCode);
      }
      const ok = runEvals();
      process.exit(ok ? 0 : 1);
      break;
    }

    case 'export-rules': {
      const check = args.includes('--check');
      const target = args.find((a) => a !== 'export-rules' && !a.startsWith('--'));
      const dir = target ? path.resolve(process.cwd(), target) : repoDir;

      const ok = exportIDERules(dir, check);
      process.exit(ok ? 0 : 1);
      break;
    }

    case 'metrics': {
      renderAnalyticsSummary();
      break;
    }

    case 'verify': {
      const res = spawnSync(path.join(repoDir, 'scripts', 'verify-skills-layout.sh'), {
        stdio: 'inherit',
        env: { ...process.env, REPO_DIR: repoDir }
      });
      process.exit(res.status ?? 0);
      break;
    }

    case 'sync': {
      const syncArgs = args.slice(1);
      const res = spawnSync(path.join(repoDir, 'scripts', 'sync-external-skills.sh'), syncArgs, {
        stdio: 'inherit',
        env: { ...process.env, REPO_DIR: repoDir }
      });
      process.exit(res.status ?? 0);
      break;
    }

    case 'help':
    case '--help':
    case '-h':
    case undefined:
      printHelp();
      break;

    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.stack ?? err.message : String(err);
  console.error(msg);
  process.exit(1);
});
