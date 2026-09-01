import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { renderDocPage } from './doc_page.js';
import { buildLlmsFull, type LlmsDoc } from './llms.js';
import { extractDocMeta, renderMarkdownBody } from './markdown_html.js';
import {
  buildSitemapEntries,
  renderSitemapPage,
  serializeSitemapXml,
  type SitemapFile
} from './sitemap.js';
import {
  htmlOutputPath,
  publicUrlPath,
  sectionLabelFor,
  sectionUrlPathFor,
  SITE_ORIGIN
} from './urls.js';

/** Custom domain for the GitHub Pages artifact (DNS lives in edge-dns). */
export const PAGES_SITE_HOST = SITE_ORIGIN.replace(/^https:\/\//, '');

/**
 * Public GitHub Pages allowlist. Markdown stays at the same relative URLs as in
 * the repo so humans and agents keep stable `.md` links; each Markdown file also
 * gets an indexable HTML rendering beside it.
 */
export const PAGES_SITE_ENTRIES: readonly string[] = [
  'index.html',
  '404.html',
  '.nojekyll',
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

/** Generated into the artifact rather than committed. */
export const PAGES_GENERATED_ENTRIES: readonly string[] = [
  'sitemap.xml',
  'sitemap.html',
  'llms-full.txt',
  'CNAME'
];

/**
 * Eval suites ship their system prompts as Markdown. They stay published as raw
 * inputs, but they are fixtures rather than pages, so they get no HTML rendering
 * and no sitemap entry.
 */
export function isRenderableDoc(rel: string): boolean {
  if (!rel.endsWith('.md')) return false;
  return !/(^|\/)[a-z0-9_-]*prompt\.md$/i.test(rel);
}

/** Search-engine ownership proofs, copied from the repo root when present. */
export function isVerificationFile(name: string): boolean {
  return (
    /^google[0-9a-z]+\.html$/i.test(name) ||
    name === 'BingSiteAuth.xml' ||
    /^[0-9a-f]{8,}\.txt$/i.test(name)
  );
}

export type AssemblePagesSiteOptions = {
  kitRoot: string;
  dest: string;
  /** Last content change per repo-relative path; defaults to git history with an mtime fallback. */
  lastmodFor?: (rel: string) => string | undefined;
};

export type AssemblePagesSiteResult = {
  dest: string;
  fileCount: number;
  /** Markdown sources rendered to HTML, in publication order. */
  renderedPages: string[];
  /** URLs listed in sitemap.xml. */
  sitemapUrls: number;
};

function listFiles(root: string, prefix = ''): string[] {
  const out: string[] = [];
  for (const name of fs.readdirSync(path.join(root, prefix))) {
    const rel = prefix ? `${prefix}/${name}` : name;
    if (fs.statSync(path.join(root, rel)).isDirectory()) out.push(...listFiles(root, rel));
    else out.push(rel);
  }
  return out;
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

/** Last commit date (YYYY-MM-DD) per tracked path, from one `git log` pass. */
export function gitLastModifiedDates(kitRoot: string): Map<string, string> {
  const dates = new Map<string, string>();
  let log: string;
  try {
    log = execFileSync('git', ['log', '--pretty=format:@%cs', '--name-only', '--no-merges'], {
      cwd: kitRoot,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore']
    });
  } catch {
    return dates;
  }
  let current = '';
  for (const line of log.split('\n')) {
    if (line.startsWith('@')) current = line.slice(1).trim();
    else if (line.trim() && current && !dates.has(line)) dates.set(line, current);
  }
  return dates;
}

function defaultLastmod(kitRoot: string): (rel: string) => string | undefined {
  const dates = gitLastModifiedDates(kitRoot);
  return (rel) => {
    const tracked = dates.get(rel);
    if (tracked) return tracked;
    const abs = path.join(kitRoot, rel);
    if (!fs.existsSync(abs)) return undefined;
    return fs.statSync(abs).mtime.toISOString().slice(0, 10);
  };
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
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
  for (const name of fs.readdirSync(kitRoot)) {
    if (isVerificationFile(name) && fs.statSync(path.join(kitRoot, name)).isFile()) {
      copyEntry(path.join(kitRoot, name), path.join(dest, name));
    }
  }
  fs.writeFileSync(path.join(dest, 'CNAME'), `${PAGES_SITE_HOST}\n`, 'utf8');

  const lastmodFor = opts.lastmodFor ?? defaultLastmod(kitRoot);
  const copied = listFiles(dest);
  const publishedFiles = new Set(copied);
  const markdownSources = copied.filter(isRenderableDoc).sort();
  const renderedMarkdown = new Set(markdownSources);

  const sitemapFiles: SitemapFile[] = [];
  const llmsDocs: LlmsDoc[] = [];

  for (const rel of copied) {
    if (rel.endsWith('.md')) continue;
    sitemapFiles.push({ rel, lastmod: lastmodFor(rel) });
  }

  for (const sourceRel of markdownSources) {
    const markdown = fs.readFileSync(path.join(dest, sourceRel), 'utf8');
    const outputRel = htmlOutputPath(sourceRel);
    const meta = extractDocMeta(markdown, sourceRel);
    const { html, toc } = renderMarkdownBody(markdown, {
      fromRel: sourceRel,
      publishedFiles,
      renderedMarkdown
    });
    const lastmod = lastmodFor(sourceRel);
    const page = renderDocPage({
      outputRel,
      sourceRel,
      title: meta.title,
      description: meta.description,
      bodyHtml: html,
      toc,
      lastmod,
      sectionLabel: sectionLabelFor(sourceRel),
      sectionUrlPath: sectionUrlPathFor(sourceRel)
    });
    fs.mkdirSync(path.dirname(path.join(dest, outputRel)), { recursive: true });
    fs.writeFileSync(path.join(dest, outputRel), page, 'utf8');
    sitemapFiles.push({ rel: outputRel, lastmod, title: meta.title });
    llmsDocs.push({
      urlPath: publicUrlPath(outputRel),
      sourceUrlPath: publicUrlPath(sourceRel),
      title: meta.title,
      markdown
    });
  }

  const generatedOn = todayIso();
  fs.writeFileSync(path.join(dest, 'llms-full.txt'), buildLlmsFull(llmsDocs), 'utf8');
  sitemapFiles.push({ rel: 'llms-full.txt', lastmod: generatedOn });
  sitemapFiles.push({ rel: 'sitemap.html', lastmod: generatedOn, title: 'All pages' });

  const entries = buildSitemapEntries(sitemapFiles);
  fs.writeFileSync(path.join(dest, 'sitemap.xml'), serializeSitemapXml(entries), 'utf8');
  fs.writeFileSync(path.join(dest, 'sitemap.html'), renderSitemapPage(entries, generatedOn), 'utf8');

  return {
    dest,
    fileCount: listFiles(dest).length,
    renderedPages: markdownSources.map(htmlOutputPath),
    sitemapUrls: entries.length
  };
}

export function defaultPagesSiteDest(kitRoot: string): string {
  return path.join(kitRoot, 'site');
}
