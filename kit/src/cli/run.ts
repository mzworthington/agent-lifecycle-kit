import fs from 'fs';
import os from 'os';
import path from 'path';
import { exportIDERules } from '../bootstrap/export_ide_rules.js';
import { initProject } from '../bootstrap/init_project.js';
import { ghGitHubPort } from '../doctor/github.js';
import { printDoctorResult, runDoctor } from '../doctor/run.js';
import { evaluateOwnership, shouldInstallInitHooks } from '../doctor/ownership.js';
import { composeMCP } from '../bootstrap/compose_mcp.js';
import { debugCiFailed } from '../debug/debug_ci_failed.js';
import { initDebugBoardSession } from '../debug/init_debug_board.js';
import { handleEddEvalCli } from '../edd/edd_cli.js';
import { runEvals } from '../edd/run_evals.js';
import { validateEvals } from '../edd/validate_evals.js';
import {
  checkOntology,
  lintMemoryGraph,
  regenerateOntologyIndex
} from '../ontology/index.js';
import { measureContextBudget, printContextBudget } from '../quality/measure_context_budget.js';
import { runKitCheck } from '../quality/quality_gate.js';
import { renderAnalyticsSummary } from '../quality/telemetry_analytics.js';
import { assemblePagesSite, defaultPagesSiteDest } from '../site/assemble.js';
import { scanSkillSecurity } from '../skills/scan_skill_security.js';
import { syncExternalSkills } from '../skills/sync_external_skills.js';
import { printSkillsLayoutResult, verifySkillsLayout } from '../skills/verify_skills_layout.js';
import { resolveModel } from '../models/catalog.js';
import { validateConventionalCommit } from '../commits/conventional.js';
import { listMcpProfileNames, renderCompletion } from './completion.js';
import { errorMessage, printKitHelp } from './help.js';
import type { KitCommand } from './parse.js';

export interface RunKitContext {
  repoDir: string;
  env?: NodeJS.ProcessEnv;
  homedir?: string;
}

function status(ok: boolean): number {
  return ok ? 0 : 1;
}

function memoryGraphPath(ctx: RunKitContext): string {
  const env = ctx.env ?? process.env;
  const home = ctx.homedir ?? os.homedir();
  return env.MEMORY_FILE_PATH?.trim() || path.join(home, '.agents', 'sync', 'mcp-memory.jsonl');
}

export async function runKitCommand(command: KitCommand, ctx: RunKitContext): Promise<number> {
  const { repoDir } = ctx;

  switch (command.kind) {
    case 'help':
      printKitHelp();
      return 0;

    case 'unknown':
      console.error(`Unknown command: ${command.command}`);
      printKitHelp();
      return 1;

    case 'usage':
      console.error(command.message);
      return 2;

    case 'init': {
      let installHook = command.installHook;
      if (installHook) {
        const ownership = evaluateOwnership(ghGitHubPort().viewFromCwd(command.targetDir));
        if (!shouldInstallInitHooks(ownership, true)) {
          console.log(`Skipping git hooks (${ownership.reason}). Install hooks only on repos you admin.`);
          installHook = false;
        }
      }
      initProject({
        targetDir: command.targetDir,
        mcpProfile: command.mcpProfile,
        installMCP: command.installMCP,
        installIDE: command.installIDE,
        installHook
      });
      return 0;
    }

    case 'doctor': {
      const result = runDoctor({
        targetDir: command.targetDir,
        write: command.write,
        owned: command.owned,
        scanDir: command.scanDir,
        repoClass: command.repoClass,
        installHook: command.installHook,
        login: command.login,
        kitRepoDir: repoDir,
        github: ghGitHubPort()
      });
      printDoctorResult(result);
      if (result.error) return 1;
      return status(result.ok);
    }

    case 'mcp':
      composeMCP(command.profile, command.outputFile, command.install);
      return 0;

    case 'audit':
      return status(scanSkillSecurity(repoDir).ok);

    case 'validate':
      return status(validateEvals(repoDir).ok);

    case 'eval': {
      const eddCode = await handleEddEvalCli({ repoDir, args: command.rest });
      if (eddCode !== null) return eddCode;
      return status(runEvals());
    }

    case 'export-rules': {
      const ok = exportIDERules(command.dir, command.check);
      if (command.check) {
        if (ok) console.log('✅ Multi-IDE rule check PASSED.');
        else console.error('Multi-IDE rule check FAILED.');
      }
      return status(ok);
    }

    case 'metrics':
      renderAnalyticsSummary();
      return 0;

    case 'verify': {
      const result = verifySkillsLayout(repoDir);
      printSkillsLayoutResult(result);
      return status(result.ok);
    }

    case 'sync':
      return syncExternalSkills(repoDir, command.rest);

    case 'measure-context': {
      const result = measureContextBudget(repoDir);
      printContextBudget(result);
      return status(result.ok);
    }

    case 'debug-board':
      try {
        const result = initDebugBoardSession({
          repoDir,
          project: command.project,
          title: command.title
        });
        console.log(`Wrote ${result.boardPath}`);
        console.log(`Handover: ${result.handoverPath}`);
        return 0;
      } catch (err: unknown) {
        console.error(`ERROR: ${errorMessage(err)}`);
        return 1;
      }

    case 'debug-ci':
      return debugCiFailed(command.rest);

    case 'check':
      return runKitCheck(repoDir);

    case 'completion':
      process.stdout.write(
        renderCompletion(command.shell, { mcpProfiles: listMcpProfileNames(repoDir) })
      );
      return 0;

    case 'ontology':
      if (command.sub === 'generate') {
        const result = regenerateOntologyIndex(repoDir);
        console.log(`Wrote derived ontology cache (gitignored): ${result.path}`);
        console.log(`Wrote homepage index (gitignored): ${result.sitePath}`);
        return 0;
      }
      {
        const result = checkOntology(repoDir);
        for (const msg of result.messages) console.error(msg);
        if (result.ok) console.log('✅ ontology check PASSED (live-derived).');
        else console.error('ontology check FAILED.');
        return status(result.ok);
      }

    case 'model-resolve': {
      try {
        const resolved = resolveModel(repoDir, {
          skill: command.skill,
          phase: command.phase,
          host: command.host,
          specComplete: command.specComplete,
          blocked: command.blocked
        });
        console.log(JSON.stringify(resolved));
        return 0;
      } catch (err: unknown) {
        console.error(`ERROR: ${errorMessage(err)}`);
        return 1;
      }
    }

    case 'memory-lint': {
      const result = lintMemoryGraph(repoDir, memoryGraphPath(ctx));
      for (const msg of result.messages) console.log(msg);
      for (const e of result.legacyUnknown) {
        console.log(`- ${e.name} (${e.entityType})`);
      }
      return 0;
    }

    case 'commit-msg': {
      let raw = command.message;
      if (raw === undefined) {
        const file = command.file;
        if (!file) {
          console.error('Usage: wk commit-msg [--message <subject>] [file]');
          return 2;
        }
        try {
          raw = fs.readFileSync(file, 'utf8');
        } catch (err: unknown) {
          console.error(`ERROR: ${errorMessage(err)}`);
          return 1;
        }
      }
      const result = validateConventionalCommit(raw);
      if (!result.ok) {
        console.error(result.error);
        return 1;
      }
      return 0;
    }

    case 'site-assemble': {
      const dest = command.dest ?? defaultPagesSiteDest(repoDir);
      try {
        const result = assemblePagesSite({ kitRoot: repoDir, dest });
        console.log(`Wrote Pages tree: ${result.dest} (${result.fileCount} files)`);
        return 0;
      } catch (err: unknown) {
        console.error(`ERROR: ${errorMessage(err)}`);
        return 1;
      }
    }
  }
}
