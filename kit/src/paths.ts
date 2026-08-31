import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/** Walk up from a module until `bin/kit.ts` + `package.json` (kit repo root). */
export function kitRootFrom(metaUrl: string): string {
  let dir = path.dirname(fileURLToPath(metaUrl));
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, 'bin', 'kit.ts')) && fs.existsSync(path.join(dir, 'package.json'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`Could not resolve kit root from ${metaUrl}`);
}

export function resolveRepoDir(metaUrl: string): string {
  return process.env.REPO_DIR || kitRootFrom(metaUrl);
}
