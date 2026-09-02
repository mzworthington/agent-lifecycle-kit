import path from 'node:path';
import type { Plugin } from 'vite';
import { overlayKitPublic } from '../../kit/src/site/assemble.ts';

export function copyKitPublic(kitRoot: string): Plugin {
  let outDir = 'dist';
  let shouldCopy = false;
  return {
    name: 'kit-copy-public',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
      shouldCopy = config.command === 'build' && !process.env.VITEST;
    },
    closeBundle() {
      if (!shouldCopy) return;
      overlayKitPublic(kitRoot, outDir);
    }
  };
}
