import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { copyKitPublic } from './vite/copyKitPublic.ts';
import { emitSiteSeo } from './vite/emitSiteSeo.ts';

const webRoot = path.dirname(fileURLToPath(import.meta.url));
const kitRoot = path.resolve(webRoot, '..');

export default defineConfig({
  root: webRoot,
  publicDir: 'public',
  plugins: [react(), copyKitPublic(kitRoot), emitSiteSeo(kitRoot)],
  resolve: {
    alias: {
      '@kit': kitRoot,
      d3: path.join(webRoot, 'node_modules/d3')
    }
  },
  server: {
    fs: {
      allow: [webRoot, kitRoot]
    }
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx']
  }
});
