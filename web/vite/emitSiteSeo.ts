import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { fileToRoute, shouldPublishMarkdown } from '../src/docs/catalog.ts';
import { injectPrerenderedPageHtml } from '../src/seo/prerenderHtml.ts';
import {
  buildSitemapXml,
  listIndexableSeoPaths,
  notFoundPageSeo,
  resolvePageSeo
} from '../src/seo/siteSeo.ts';

function walkMarkdown(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name);
    if (fs.statSync(abs).isDirectory()) walkMarkdown(abs, acc);
    else if (name.endsWith('.md')) acc.push(abs);
  }
  return acc;
}

export function listPublishedMarkdownFiles(kitRoot: string): Array<{ file: string; markdown: string }> {
  const roots = [
    path.join(kitRoot, 'docs'),
    path.join(kitRoot, 'SOPs'),
    path.join(kitRoot, 'evals', 'edd'),
    path.join(kitRoot, 'mcps', 'README.md'),
    path.join(kitRoot, 'ontology', 'README.md')
  ];
  const files: string[] = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    if (fs.statSync(root).isDirectory()) walkMarkdown(root, files);
    else files.push(root);
  }
  return files
    .map((abs) => ({
      file: path.relative(kitRoot, abs).split(path.sep).join('/'),
      markdown: fs.readFileSync(abs, 'utf8')
    }))
    .filter((entry) => shouldPublishMarkdown(entry.file));
}

function outPathForRoute(outDir: string, routePath: string): string {
  if (routePath === '/') return path.join(outDir, 'index.html');
  return path.join(outDir, routePath.replace(/^\//, ''), 'index.html');
}

function crawlerNav(): Array<{ href: string; label: string }> {
  return [
    { href: '/', label: 'Home' },
    { href: '/docs/start', label: 'Start' },
    { href: '/docs', label: 'Guide' },
    { href: '/evals/edd', label: 'Evals' },
    { href: '/docs/map', label: 'Map' }
  ];
}

export function emitSiteSeo(kitRoot: string): Plugin {
  let outDir = 'dist';
  let shouldEmit = false;

  return {
    name: 'kit-emit-site-seo',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
      shouldEmit = config.command === 'build' && !process.env.VITEST;
    },
    closeBundle() {
      if (!shouldEmit) return;
      const indexPath = path.join(outDir, 'index.html');
      if (!fs.existsSync(indexPath)) return;

      const shell = fs.readFileSync(indexPath, 'utf8');
      const published = listPublishedMarkdownFiles(kitRoot);
      const routes = ['/', ...published.map((entry) => fileToRoute(entry.file))];
      const nav = crawlerNav();
      const lastmod = new Date().toISOString().slice(0, 10);
      const indexable = listIndexableSeoPaths(routes);
      fs.writeFileSync(path.join(outDir, 'sitemap.xml'), buildSitemapXml(indexable, lastmod), 'utf8');

      const byRoute = new Map(published.map((entry) => [fileToRoute(entry.file), entry]));
      for (const routePath of routes) {
        const entry = routePath === '/' ? undefined : byRoute.get(routePath);
        const heading =
          entry?.markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() ||
          routePath.split('/').filter(Boolean).pop() ||
          'Agent Lifecycle Kit';
        const seo = resolvePageSeo(routePath, {
          headline: heading,
          markdown: entry?.markdown,
          file: entry?.file
        });
        const html = injectPrerenderedPageHtml(shell, seo, nav);
        const target = outPathForRoute(outDir, routePath);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, html, 'utf8');
      }

      fs.writeFileSync(
        path.join(outDir, '404.html'),
        injectPrerenderedPageHtml(shell, notFoundPageSeo(), nav),
        'utf8'
      );
    }
  };
}
