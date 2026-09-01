import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { copyKitPublic } from './vite/copyKitPublic.ts';
import { emitSiteSeo } from './vite/emitSiteSeo.ts';

const webRoot = path.dirname(fileURLToPath(import.meta.url));
const kitRoot = path.resolve(webRoot, '..');

function serveKitStatic(root: string): Plugin {
  return {
    name: 'kit-static-dev',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] ?? '';
        if (!url.startsWith('/assets/') && url !== '/llms.txt' && url !== '/robots.txt') {
          next();
          return;
        }
        const file = path.join(root, url.replace(/^\//, ''));
        if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
          next();
          return;
        }
        fs.createReadStream(file).pipe(res);
      });
    }
  };
}

export default defineConfig({
  root: webRoot,
  publicDir: false,
  plugins: [react(), serveKitStatic(kitRoot), copyKitPublic(kitRoot), emitSiteSeo(kitRoot)],
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
