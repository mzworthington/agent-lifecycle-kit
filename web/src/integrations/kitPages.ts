import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { overlayKitPublic } from '../../../kit/src/site/assemble.ts';
import { publishedSeoRoutes } from '../seo/publishedMarkdown.ts';
import { buildSitemapXml, listIndexableSeoPaths } from '../seo/siteSeo.ts';

export function kitPages(kitRoot: string): AstroIntegration {
  return {
    name: 'kit-pages',
    hooks: {
      'astro:build:done': ({ dir }) => {
        const outDir = fileURLToPath(dir);
        overlayKitPublic(kitRoot, outDir);
        const lastmod = new Date().toISOString().slice(0, 10);
        const indexable = listIndexableSeoPaths(publishedSeoRoutes(kitRoot));
        fs.writeFileSync(path.join(outDir, 'sitemap.xml'), buildSitemapXml(indexable, lastmod), 'utf8');
      }
    }
  };
}
