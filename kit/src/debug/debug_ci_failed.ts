import { spawnSync } from 'child_process';

export interface DebugCiOptions {
  runId: string;
  workflow: string;
  branch: string;
  limit: string;
  repo: string;
  help: boolean;
}

export function parseDebugCiArgs(args: string[]): DebugCiOptions {
  const opts: DebugCiOptions = { runId: '', workflow: '', branch: '', limit: '1', repo: '', help: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];
    switch (arg) {
      case '--run':
        opts.runId = next ?? '';
        i++;
        break;
      case '--workflow':
        opts.workflow = next ?? '';
        i++;
        break;
      case '--branch':
        opts.branch = next ?? '';
        i++;
        break;
      case '--limit':
        opts.limit = next ?? '1';
        i++;
        break;
      case '--repo':
        opts.repo = next ?? '';
        i++;
        break;
      case '-h':
      case '--help':
        opts.help = true;
        break;
      default:
        throw new Error(`Unknown arg: ${arg}`);
    }
  }
  return opts;
}

function gh(repo: string, args: string[]): { status: number; stdout: string } {
  const full = repo ? ['--repo', repo, ...args] : args;
  const result = spawnSync('gh', full, { encoding: 'utf8' });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return { status: result.status ?? 1, stdout: result.stdout ?? '' };
}

function ghCapture(repo: string, args: string[]): { status: number; stdout: string } {
  const full = repo ? ['--repo', repo, ...args] : args;
  const result = spawnSync('gh', full, { encoding: 'utf8' });
  return { status: result.status ?? 1, stdout: result.stdout ?? '' };
}

export function debugCiFailed(args: string[]): number {
  let opts: DebugCiOptions;
  try {
    opts = parseDebugCiArgs(args);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(message);
    return 2;
  }

  if (opts.help) {
    console.log(`Fetch failed GitHub Actions logs to speed CI triage (agent-debug).
Usage:
  kit debug-ci                  # latest failed run on default branch
  kit debug-ci --run 123456789  # specific run id
  kit debug-ci --workflow "Sync Derived Outputs"
  kit debug-ci --branch main --limit 5`);
    return 0;
  }

  const which = spawnSync('sh', ['-c', 'command -v gh'], { encoding: 'utf8' });
  if (which.status !== 0) {
    console.error('ERROR: gh CLI required (https://cli.github.com/)');
    return 1;
  }

  let runId = opts.runId;
  if (!runId) {
    const listArgs = [
      'run',
      'list',
      '--status',
      'failure',
      '--limit',
      opts.limit,
      '--json',
      'databaseId,displayTitle,workflowName,headBranch,url,conclusion,createdAt'
    ];
    if (opts.workflow) listArgs.push('--workflow', opts.workflow);
    if (opts.branch) listArgs.push('--branch', opts.branch);

    console.log('== Failed runs ==');
    gh(opts.repo, listArgs);

    const jq = ghCapture(opts.repo, [...listArgs, '--jq', '.[0].databaseId // empty']);
    runId = jq.stdout.trim();
    if (!runId) {
      console.error('No failed runs found.');
      return 1;
    }
    console.log('');
    console.log(`== Using run ${runId} ==`);
  }

  console.log('');
  console.log('== Run summary ==');
  gh(opts.repo, ['run', 'view', runId]);

  console.log('');
  console.log('== Failed job logs ==');
  const failed = spawnSync(
    'gh',
    opts.repo ? ['--repo', opts.repo, 'run', 'view', runId, '--log-failed'] : ['run', 'view', runId, '--log-failed'],
    { stdio: 'inherit' }
  );
  if (failed.status !== 0) {
    console.error('(--log-failed unavailable; showing full log)');
    gh(opts.repo, ['run', 'view', runId, '--log']);
  }

  console.log('');
  console.log('Tip: classify as flake | config-drift | tool-missing | auth | product-bug before editing code.');
  console.log('See: ~/.agents/SOPs/hypothesis-driven-debug.md');
  return 0;
}
