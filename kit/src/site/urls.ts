/** Public URL model for the assembled GitHub Pages tree. Pure - no I/O. */

export const SITE_ORIGIN = 'https://eval-driven-development.dev';
export const SITE_NAME = 'Agent Lifecycle Kit';
export const SITE_AUTHOR = 'mzworthington';
export const GITHUB_REPO_URL = 'https://github.com/mzworthington/agent-lifecycle-kit';
export const GITHUB_BLOB_URL = `${GITHUB_REPO_URL}/blob/main`;
export const SITE_OG_IMAGE = `${SITE_ORIGIN}/assets/og.jpg`;

/** Sections that get a breadcrumb label and a sitemap grouping. */
export const SITE_SECTIONS: ReadonlyArray<{ prefix: string; label: string }> = [
  { prefix: 'docs/ADRs/', label: 'Architecture decisions' },
  { prefix: 'docs/', label: 'Docs' },
  { prefix: 'SOPs/', label: 'SOPs' },
  { prefix: 'evals/edd/', label: 'Evals' },
  { prefix: 'ontology/', label: 'Ontology' },
  { prefix: 'mcps/', label: 'MCP servers' }
];

export function sectionLabelFor(rel: string): string | undefined {
  return SITE_SECTIONS.find((s) => rel.startsWith(s.prefix))?.label;
}

/** Root URL path of the section a file belongs to, for breadcrumbs. */
export function sectionUrlPathFor(rel: string): string | undefined {
  const prefix = SITE_SECTIONS.find((s) => rel.startsWith(s.prefix))?.prefix;
  return prefix ? `/${prefix}` : undefined;
}

/** Where a published Markdown source is rendered in the assembled tree. */
export function htmlOutputPath(markdownRel: string): string {
  const dir = markdownRel.slice(0, markdownRel.lastIndexOf('/') + 1);
  const base = markdownRel.slice(dir.length).replace(/\.md$/i, '');
  return base.toLowerCase() === 'readme' ? `${dir}index.html` : `${dir}${base}.html`;
}

/** Canonical URL path for a file in the assembled tree (directory form for index pages). */
export function publicUrlPath(rel: string): string {
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'index.html'.length)}`;
  return `/${rel}`;
}

export function absoluteUrl(urlPath: string): string {
  return `${SITE_ORIGIN}${urlPath}`;
}

export function githubBlobUrl(repoRel: string): string {
  return `${GITHUB_BLOB_URL}/${repoRel}`;
}

/** Resolve a relative Markdown link against the linking document's directory. */
export function resolveRelativePath(fromRel: string, href: string): string {
  const fromDir = fromRel.slice(0, fromRel.lastIndexOf('/') + 1);
  const segments = `${fromDir}${href}`.split('/');
  const out: string[] = [];
  for (const segment of segments) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') out.pop();
    else out.push(segment);
  }
  return out.join('/');
}

export function isExternalHref(href: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//');
}
