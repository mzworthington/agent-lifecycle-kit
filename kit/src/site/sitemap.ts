import { renderDocPage } from './doc_page.js';
import { escapeHtml } from './markdown_html.js';
import { absoluteUrl, publicUrlPath, SITE_OG_IMAGE, SITE_SECTIONS } from './urls.js';

/** Sitemap model derived from the assembled Pages tree. Pure - callers supply the file list. */

export interface SitemapImage {
  loc: string;
  title: string;
}

export interface SitemapEntry {
  urlPath: string;
  lastmod?: string;
  changefreq: 'daily' | 'weekly' | 'monthly';
  priority: string;
  /** Human label used by the HTML sitemap. */
  title: string;
  /** Section heading used to group the HTML sitemap. */
  group: string;
  images?: SitemapImage[];
}

export interface SitemapFile {
  /** Path inside the assembled tree, e.g. `docs/edd.html`. */
  rel: string;
  /** ISO date (YYYY-MM-DD) of the last content change. */
  lastmod?: string;
  /** Page title when the file is a rendered doc. */
  title?: string;
}

/**
 * Only canonical, indexable representations go in the sitemap. Raw Markdown and
 * data files stay published and linked (agents and `llms.txt` use them), but the
 * rendered HTML is the canonical URL, so listing both would split the signal.
 */
export function isSitemapCandidate(rel: string): boolean {
  if (rel === '404.html') return false;
  if (rel.startsWith('assets/')) return false;
  if (rel === 'llms.txt' || rel === 'llms-full.txt') return true;
  return rel.endsWith('.html');
}

interface Ranking {
  changefreq: SitemapEntry['changefreq'];
  priority: string;
  group: string;
}

function rank(rel: string): Ranking {
  if (rel === 'index.html') return { changefreq: 'weekly', priority: '1.0', group: 'Start here' };
  if (rel === 'sitemap.html') return { changefreq: 'weekly', priority: '0.3', group: 'Machine-readable' };
  if (rel === 'llms.txt' || rel === 'llms-full.txt') {
    return { changefreq: 'weekly', priority: '0.3', group: 'Machine-readable' };
  }
  const section = SITE_SECTIONS.find((s) => rel.startsWith(s.prefix));
  const isIndex = rel.endsWith('/index.html');
  if (!section) return { changefreq: 'monthly', priority: '0.5', group: 'Other pages' };
  if (section.prefix === 'docs/ADRs/') {
    return { changefreq: 'monthly', priority: isIndex ? '0.5' : '0.4', group: section.label };
  }
  if (section.prefix === 'docs/') {
    return { changefreq: 'weekly', priority: isIndex ? '0.7' : '0.8', group: section.label };
  }
  if (section.prefix === 'SOPs/') {
    return { changefreq: 'monthly', priority: isIndex ? '0.6' : '0.6', group: section.label };
  }
  return { changefreq: 'monthly', priority: '0.5', group: section.label };
}

function fallbackTitle(rel: string): string {
  if (rel === 'index.html') return 'Agent Lifecycle Kit';
  if (rel === 'sitemap.html') return 'All pages';
  if (rel === 'llms.txt') return 'llms.txt';
  if (rel === 'llms-full.txt') return 'llms-full.txt';
  const base = rel.replace(/\/index\.html$/, '').replace(/\.html$/, '');
  const leaf = base.slice(base.lastIndexOf('/') + 1);
  return leaf.replace(/[-_]/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

export function buildSitemapEntries(files: readonly SitemapFile[]): SitemapEntry[] {
  const entries = files
    .filter((file) => isSitemapCandidate(file.rel))
    .map((file) => {
      const ranking = rank(file.rel);
      const entry: SitemapEntry = {
        urlPath: publicUrlPath(file.rel),
        lastmod: file.lastmod,
        changefreq: ranking.changefreq,
        priority: ranking.priority,
        title: file.title ?? fallbackTitle(file.rel),
        group: ranking.group
      };
      if (file.rel === 'index.html') {
        entry.images = [{ loc: SITE_OG_IMAGE, title: 'Eval-Driven Development' }];
      }
      return entry;
    });

  return entries.sort(
    (a, b) => Number(b.priority) - Number(a.priority) || a.urlPath.localeCompare(b.urlPath)
  );
}

function xmlEscape(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function serializeSitemapXml(entries: readonly SitemapEntry[]): string {
  const body = entries
    .map((entry) => {
      const images = (entry.images ?? [])
        .map(
          (image) =>
            `    <image:image>\n      <image:loc>${xmlEscape(image.loc)}</image:loc>\n      <image:title>${xmlEscape(image.title)}</image:title>\n    </image:image>\n`
        )
        .join('');
      return [
        '  <url>',
        `    <loc>${xmlEscape(absoluteUrl(entry.urlPath))}</loc>`,
        entry.lastmod ? `    <lastmod>${entry.lastmod}</lastmod>` : undefined,
        `    <changefreq>${entry.changefreq}</changefreq>`,
        `    <priority>${entry.priority}</priority>`,
        images ? images.replace(/\n$/, '') : undefined,
        '  </url>'
      ]
        .filter((line) => line !== undefined)
        .join('\n');
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${body}
</urlset>
`;
}

export function groupSitemapEntries(
  entries: readonly SitemapEntry[]
): Array<{ group: string; entries: SitemapEntry[] }> {
  const order = ['Start here', ...SITE_SECTIONS.map((s) => s.label), 'Other pages', 'Machine-readable'];
  const buckets = new Map<string, SitemapEntry[]>();
  for (const entry of entries) {
    const bucket = buckets.get(entry.group) ?? [];
    bucket.push(entry);
    buckets.set(entry.group, bucket);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => order.indexOf(a) - order.indexOf(b))
    .map(([group, groupEntries]) => ({
      group,
      entries: [...groupEntries].sort((a, b) => a.urlPath.localeCompare(b.urlPath))
    }));
}

/** Human-readable sitemap: a crawlable hub that links every published page. */
export function renderSitemapPage(entries: readonly SitemapEntry[], lastmod?: string): string {
  const groups = groupSitemapEntries(entries);
  const sections = groups
    .map((group) => {
      const items = group.entries
        .map(
          (entry) =>
            `          <li><a href="${entry.urlPath}">${escapeHtml(entry.title)}</a> <span class="sitemap-url">${escapeHtml(entry.urlPath)}</span></li>`
        )
        .join('\n');
      return `        <h2 id="${escapeHtml(group.group.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}">${escapeHtml(group.group)}</h2>
        <ul class="sitemap-list">
${items}
        </ul>`;
    })
    .join('\n');

  const bodyHtml = `        <p>Every page published at eval-driven-development.dev. Machines should start from
          <a href="/sitemap.xml">sitemap.xml</a> or <a href="/llms.txt">llms.txt</a>.</p>
${sections}`;

  return renderDocPage({
    outputRel: 'sitemap.html',
    title: 'All pages',
    description:
      'Every page published on eval-driven-development.dev: EDD docs, SOPs, eval suites, the kit ontology, and machine-readable indexes.',
    bodyHtml,
    toc: groups.map((group) => ({
      id: group.group.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      text: group.group,
      depth: 2
    })),
    lastmod,
    ogType: 'website'
  });
}
