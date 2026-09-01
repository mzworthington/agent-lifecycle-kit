#!/usr/bin/env node --import tsx/esm
import { fileURLToPath } from 'url';
import path from 'path';
import { stackMessage } from '../kit/src/cli/help.js';
import { parseKitArgv } from '../kit/src/cli/parse.js';
import { runKitCommand } from '../kit/src/cli/run.js';

const repoDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function main(): Promise<void> {
  const command = parseKitArgv(process.argv.slice(2), {
    cwd: process.cwd(),
    repoDir
  });
  process.exit(await runKitCommand(command, { repoDir }));
}

main().catch((err: unknown) => {
  console.error(stackMessage(err));
  process.exit(1);
});
