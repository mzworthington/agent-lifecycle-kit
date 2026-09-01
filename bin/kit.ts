#!/usr/bin/env node --import tsx/esm
import { fileURLToPath } from 'url';
import path from 'path';
import { exportIDERules } from '../kit/src/export_ide_rules.js';
import { initProject } from '../kit/src/init_project.js';
import { renderAnalyticsSummary } from '../kit/src/telemetry_analytics.js';
import { composeMCP } from '../kit/src/compose_mcp.js';
import { runEvals } from '../kit/src/run_evals.js';
import { handleEddEvalCli } from '../kit/src/edd_cli.js';
import { scanSkillSecurity } from '../kit/src/scan_skill_security.js';
import { validateEvals } from '../kit/src/validate_evals.js';
import { verifySkillsLayout, printSkillsLayoutResult } from '../kit/src/verify_skills_layout.js';
import { syncExternalSkills } from '../kit/src/sync_external_skills.js';
import { measureContextBudget, printContextBudget } from '../kit/src/measure_context_budget.js';
import { initDebugBoardSession } from '../kit/src/init_debug_board.js';
import { debugCiFailed } from '../kit/src/debug_ci_failed.js';
import { runKitCheck } from '../kit/src/quality_gate.js';
import {
  checkOntology,
  lintMemoryGraph,
  regenerateOntologyIndex
} from '../kit/src/ontology/index.js';
import os from 'os';

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
  mcp <profile>        Compose and install MCP profile (default, collab, ops, cloudflare-ops, security, lab)
  audit                Run security & supply chain audit across skills and scripts
  validate             Validate evals structure against JSON schemas
  eval                 Run live trigger evals, or EDD subcommands (run|watch|report|ci|dataset)
  export-rules [dir]   Export and sync AGENTS.md to CLAUDE.md, .windsurfrules & Copilot rules
  metrics              Display telemetry analytics summary for subagent phase handovers
  verify               Verify skills directory layout conventions
  sync                 Sync official external skills (Cloudflare, Vercel)
  measure-context      Report always-on context budget
  debug-board <proj>   Scaffold a hypothesis-driven debug board
  debug-ci             Fetch failed GitHub Actions logs
  check                Run the local quality gate (audit, ontology, evals, EDD CI, context budget)
  ontology generate    Regenerate ontology/index.json from schema + kit tree
  ontology check       Fail on index drift or broken skill mcp/depends-on refs
  memory lint          List legacy memory entities outside the ontology allowlist
  help                 Display this help menu

Examples:
  kit init ./my-app --mcp collab --hook
  kit mcp ops --install
  kit mcp cloudflare-ops --install
  kit audit
  kit eval
  kit eval run --suite evals/edd/architecture_routing.yaml --model scripted
  kit eval ci --threshold-routing 95 --out out/reports
  kit eval report --format md --out out/reports
  kit ontology generate
  kit ontology check
  kit memory lint
  kit export-rules
  kit metrics
  kit sync --install
  kit debug-board archlens "initial load overlap"
  kit check
`);
}

function exitStatus(ok: boolean): never {
  process.exit(ok ? 0 : 1);
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

    case 'audit':
    case 'scan':
      exitStatus(scanSkillSecurity(repoDir).ok);
      break;

    case 'validate':
      exitStatus(validateEvals(repoDir).ok);
      break;

    case 'eval': {
      const eddCode = await handleEddEvalCli({ repoDir, args: args.slice(1) });
      if (eddCode !== null) {
        process.exit(eddCode);
      }
      exitStatus(runEvals());
      break;
    }

    case 'export-rules': {
      const check = args.includes('--check');
      const target = args.find((a) => a !== 'export-rules' && !a.startsWith('--'));
      const dir = target ? path.resolve(process.cwd(), target) : repoDir;
      const ok = exportIDERules(dir, check);
      if (check) {
        if (ok) console.log('✅ Multi-IDE rule check PASSED.');
        else console.error('Multi-IDE rule check FAILED.');
      }
      exitStatus(ok);
      break;
    }

    case 'metrics': {
      renderAnalyticsSummary();
      break;
    }

    case 'verify': {
      const result = verifySkillsLayout(repoDir);
      printSkillsLayoutResult(result);
      exitStatus(result.ok);
      break;
    }

    case 'sync':
      process.exit(syncExternalSkills(repoDir, args.slice(1)));
      break;

    case 'measure-context': {
      const result = measureContextBudget(repoDir);
      printContextBudget(result);
      exitStatus(result.ok);
      break;
    }

    case 'debug-board': {
      const project = args[1];
      if (!project) {
        console.error('Usage: kit debug-board <project> [title]');
        process.exit(2);
      }
      try {
        const result = initDebugBoardSession({
          repoDir,
          project,
          title: args.slice(2).join(' ') || 'debug session'
        });
        console.log(`Wrote ${result.boardPath}`);
        console.log(`Handover: ${result.handoverPath}`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`ERROR: ${message}`);
        process.exit(1);
      }
      break;
    }

    case 'debug-ci':
      process.exit(debugCiFailed(args.slice(1)));
      break;

    case 'check':
      process.exit(await runKitCheck(repoDir));
      break;

    case 'ontology': {
      const sub = args[1];
      if (sub === 'generate') {
        const result = regenerateOntologyIndex(repoDir);
        console.log(
          result.changed
            ? `Wrote ${result.path} (updated)`
            : `Wrote ${result.path} (unchanged)`
        );
        process.exit(0);
      }
      if (sub === 'check') {
        const result = checkOntology(repoDir);
        for (const msg of result.messages) console.error(msg);
        if (result.ok) console.log('✅ ontology check PASSED.');
        else console.error('ontology check FAILED.');
        process.exit(result.ok ? 0 : 1);
      }
      console.error('Usage: kit ontology <generate|check>');
      process.exit(2);
      break;
    }

    case 'memory': {
      const sub = args[1];
      if (sub === 'lint') {
        const memoryPath =
          process.env.MEMORY_FILE_PATH?.trim() ||
          path.join(os.homedir(), '.agents', 'sync', 'mcp-memory.jsonl');
        const result = lintMemoryGraph(repoDir, memoryPath);
        for (const msg of result.messages) console.log(msg);
        if (result.legacyUnknown.length > 0) {
          for (const e of result.legacyUnknown) {
            console.log(`- ${e.name} (${e.entityType})`);
          }
        }
        process.exit(0);
      }
      console.error('Usage: kit memory lint');
      process.exit(2);
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
