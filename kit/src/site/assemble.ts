import fs from 'node:fs';
import path from 'node:path';

/** Custom domain for the GitHub Pages artifact (DNS lives in edge-dns). */
export const PAGES_SITE_HOST = 'eval-driven-development.dev';

/**
 * Public GitHub Pages allowlist. Markdown stays at the same relative URLs as in
 * the repo so humans and agents keep stable `.md` links.
 */
export const PAGES_SITE_ENTRIES: readonly string[] = [
  'index.html',
  '404.html',
  '.nojekyll',
  'llms.txt',
  'robots.txt',
  'sitemap.xml',
  'LICENSE',
  'assets',
  'docs',
  'evals/edd',
  'SOPs',
  'mcps/README.md',
  'ontology'
];

export type AssemblePagesSiteOptions = {
  kitRoot: string;
  dest: string;
};

export type AssemblePagesSiteResult = {
  dest: string;
  fileCount: number;
};

function countFiles(root: string): number {
  let n = 0;
  const walk = (dir: string) => {
    for (const name of fs.readdirSync(dir)) {
      const abs = path.join(dir, name);
      if (fs.statSync(abs).isDirectory()) walk(abs);
      else n += 1;
    }
  };
  walk(root);
  return n;
}

function copyEntry(src: string, dest: string): void {
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    fs.cpSync(src, dest, { recursive: true });
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

export function assemblePagesSite(opts: AssemblePagesSiteOptions): AssemblePagesSiteResult {
  const kitRoot = path.resolve(opts.kitRoot);
  const dest = path.resolve(opts.dest);
  const missing = PAGES_SITE_ENTRIES.filter((rel) => !fs.existsSync(path.join(kitRoot, rel)));
  if (missing.length > 0) {
    throw new Error(`Pages site assemble missing required paths: ${missing.join(', ')}`);
  }

  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });

  for (const rel of PAGES_SITE_ENTRIES) {
    copyEntry(path.join(kitRoot, rel), path.join(dest, rel));
  }
  fs.writeFileSync(path.join(dest, 'CNAME'), `${PAGES_SITE_HOST}\n`, 'utf8');

  return { dest, fileCount: countFiles(dest) };
}

export function defaultPagesSiteDest(kitRoot: string): string {
  return path.join(kitRoot, 'site');
}
