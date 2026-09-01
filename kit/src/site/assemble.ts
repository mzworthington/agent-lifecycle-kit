import fs from 'node:fs';
import path from 'node:path';

/** Custom domain for the GitHub Pages artifact (DNS lives in edge-dns). */
export const PAGES_SITE_HOST = 'eval-driven-development.dev';

export const VITE_DIST_REL = 'web/dist';

/**
 * Markdown and static files copied onto the Vite build so agents keep stable
 * `.md` / `.yaml` URLs next to the HTML app.
 */
export const PAGES_SITE_ENTRIES: readonly string[] = [
  'llms.txt',
  'robots.txt',
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

export function overlayKitPublic(kitRoot: string, dest: string): void {
  const missing = PAGES_SITE_ENTRIES.filter((rel) => !fs.existsSync(path.join(kitRoot, rel)));
  if (missing.length > 0) {
    throw new Error(`Pages site assemble missing required paths: ${missing.join(', ')}`);
  }
  for (const rel of PAGES_SITE_ENTRIES) {
    copyEntry(path.join(kitRoot, rel), path.join(dest, rel));
  }
  fs.writeFileSync(path.join(dest, 'CNAME'), `${PAGES_SITE_HOST}\n`, 'utf8');
  fs.writeFileSync(path.join(dest, '.nojekyll'), '', 'utf8');
}

export function assemblePagesSite(opts: AssemblePagesSiteOptions): AssemblePagesSiteResult {
  const kitRoot = path.resolve(opts.kitRoot);
  const dest = path.resolve(opts.dest);
  const dist = path.join(kitRoot, VITE_DIST_REL);
  const builtIndex = path.join(dist, 'index.html');
  if (!fs.existsSync(builtIndex)) {
    throw new Error(
      `Pages site assemble needs ${VITE_DIST_REL}/index.html (run pnpm --dir web build)`
    );
  }

  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(dist, dest, { recursive: true });
  overlayKitPublic(kitRoot, dest);

  return { dest, fileCount: countFiles(dest) };
}

export function defaultPagesSiteDest(kitRoot: string): string {
  return path.join(kitRoot, 'site');
}
