import path from 'path';
import { firstPositional, flagValue, hasFlag } from './flags.js';
import { cliUsage } from './name.js';

export interface ParseKitArgvOptions {
  cwd: string;
  repoDir: string;
}

export type KitCommand =
  | { kind: 'help' }
  | { kind: 'unknown'; command: string }
  | { kind: 'usage'; message: string }
  | {
      kind: 'init';
      targetDir: string;
      mcpProfile: string;
      installMCP: boolean;
      installIDE: boolean;
      installHook: boolean;
    }
  | { kind: 'mcp'; profile: string; install: boolean; outputFile: string | undefined }
  | { kind: 'audit' }
  | { kind: 'validate' }
  | { kind: 'eval'; rest: string[] }
  | { kind: 'export-rules'; dir: string; check: boolean }
  | { kind: 'metrics' }
  | { kind: 'verify' }
  | { kind: 'sync'; rest: string[] }
  | { kind: 'measure-context' }
  | { kind: 'debug-board'; project: string; title: string }
  | { kind: 'debug-ci'; rest: string[] }
  | { kind: 'check' }
  | { kind: 'ontology'; sub: 'generate' | 'check' }
  | { kind: 'memory-lint' }
  | { kind: 'site-assemble'; dest: string | undefined };

const SITE_ASSEMBLE_USAGE = cliUsage('site assemble [--out <dir>]');

export function parseKitArgv(argv: string[], opts: ParseKitArgvOptions): KitCommand {
  const command = argv[0];
  const rest = argv.slice(1);

  switch (command) {
    case undefined:
    case 'help':
    case '--help':
    case '-h':
      return { kind: 'help' };

    case 'init': {
      const targetFlag = flagValue(rest, '--target');
      const positional = rest[0] && !rest[0].startsWith('--') ? rest[0] : undefined;
      const targetDir = path.resolve(opts.cwd, targetFlag ?? positional ?? '.');
      return {
        kind: 'init',
        targetDir,
        mcpProfile: flagValue(rest, '--mcp') ?? 'default',
        installMCP: !hasFlag(rest, '--skip-mcp'),
        installIDE: !hasFlag(rest, '--skip-ide'),
        installHook: hasFlag(rest, '--hook') || hasFlag(rest, '--with-hook')
      };
    }

    case 'mcp': {
      const profile = rest[0] && !rest[0].startsWith('-') ? rest[0] : 'default';
      return {
        kind: 'mcp',
        profile,
        install: hasFlag(rest, '--install'),
        outputFile: flagValue(rest, '-o')
      };
    }

    case 'audit':
    case 'scan':
      return { kind: 'audit' };

    case 'validate':
      return { kind: 'validate' };

    case 'eval':
      return { kind: 'eval', rest };

    case 'export-rules': {
      const target = firstPositional(rest);
      return {
        kind: 'export-rules',
        dir: target ? path.resolve(opts.cwd, target) : opts.repoDir,
        check: hasFlag(rest, '--check')
      };
    }

    case 'metrics':
      return { kind: 'metrics' };

    case 'verify':
      return { kind: 'verify' };

    case 'sync':
      return { kind: 'sync', rest };

    case 'measure-context':
      return { kind: 'measure-context' };

    case 'debug-board': {
      const project = rest[0];
      if (!project) {
        return { kind: 'usage', message: cliUsage('debug-board <project> [title]') };
      }
      return {
        kind: 'debug-board',
        project,
        title: rest.slice(1).join(' ') || 'debug session'
      };
    }

    case 'debug-ci':
      return { kind: 'debug-ci', rest };

    case 'check':
      return { kind: 'check' };

    case 'ontology': {
      const sub = rest[0];
      if (sub === 'generate' || sub === 'check') {
        return { kind: 'ontology', sub };
      }
      return { kind: 'usage', message: cliUsage('ontology <generate|check>') };
    }

    case 'memory':
      if (rest[0] === 'lint') return { kind: 'memory-lint' };
      return { kind: 'usage', message: cliUsage('memory lint') };

    case 'site': {
      if (rest[0] !== 'assemble') {
        return { kind: 'usage', message: SITE_ASSEMBLE_USAGE };
      }
      const siteRest = rest.slice(1);
      if (hasFlag(siteRest, '--out') && flagValue(siteRest, '--out') === undefined) {
        return { kind: 'usage', message: SITE_ASSEMBLE_USAGE };
      }
      const destArg = flagValue(siteRest, '--out');
      return {
        kind: 'site-assemble',
        dest: destArg ? path.resolve(opts.cwd, destArg) : undefined
      };
    }

    default:
      return { kind: 'unknown', command };
  }
}
