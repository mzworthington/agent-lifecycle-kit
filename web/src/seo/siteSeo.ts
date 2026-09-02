import { HOME_HEADLINE, HOME_LEDE } from '../landing/copy.ts';

export const SITE_ORIGIN = 'https://eval-driven.dev';
export const SITE_NAME = 'Agent Lifecycle Kit';
export const SITE_SOCIAL_IMAGE = `${SITE_ORIGIN}/assets/og.jpg`;
export const SITE_GITHUB = 'https://github.com/mzworthington/agent-lifecycle-kit';

export type PageSeo = {
  path: string;
  title: string;
  headline: string;
  description: string;
  excerpt: string;
  canonicalUrl: string;
  ogImageUrl: string;
  ogType: 'website' | 'article';
  indexable: boolean;
  markdownUrl?: string;
  softwareName?: string;
  articleMarkdown?: string;
  breadcrumbs: Array<{ name: string; path: string }>;
};

export type ResolvePageSeoOptions = {
  headline?: string;
  markdown?: string;
  file?: string;
  missing?: boolean;
};

type SeoOverride = {
  headline: string;
  description: string;
  title?: string;
  softwareName?: string;
  indexable?: boolean;
};

const PAGE_SEO: Record<string, SeoOverride> = {
  '/': {
    headline: SITE_NAME,
    title: `${SITE_NAME}: ${HOME_HEADLINE.charAt(0).toLowerCase()}${HOME_HEADLINE.slice(1)}`,
    description: HOME_LEDE,
    softwareName: SITE_NAME
  },
  '/docs': {
    headline: 'Product guide',
    description:
      'Start, practice, and reference for Agent Lifecycle Kit: install, Eval-Driven Development, SOPs, ADRs, and the kit map.'
  },
  '/docs/start': {
    headline: 'Getting started',
    description:
      'Install Agent Lifecycle Kit in about 10 minutes: link ~/.agents, run kit init, execute the demo eval suite, and hold the 95% routing bar. No API key.'
  },
  '/docs/jobs': {
    headline: 'Jobs for today',
    description:
      'Pick a job for today: wrong-tool routing, prompt or schema changes, fat always-on context, or starting a product feature with the kit lifecycle.'
  },
  '/docs/faq': {
    headline: 'Common questions',
    description:
      'Answers for Agent Lifecycle Kit: why EDD, how the 95% gate works, which MCP profile to install, and what stays out of always-on context.'
  },
  '/docs/edd': {
    headline: 'EDD guide',
    description:
      'Eval-Driven Development is TDD for prompts, MCP schemas, and routing: write cases, mock tools, gate PRs at 95% routing accuracy, and turn misses into the next eval.'
  },
  '/docs/kit': {
    headline: 'What kit gives you',
    description:
      'What Agent Lifecycle Kit installs: thin AGENTS.md handshake, skills, SOPs, one MCP profile per session, kit check, and the EDD harness.'
  },
  '/docs/lifecycle': {
    headline: 'Feature lifecycle',
    description:
      'Route product work through grill, spec, TDD, XFN, review, and release skills without dumping every SOP into always-on context.'
  },
  '/docs/map': {
    headline: 'Kit map',
    description:
      'Map of Agent Lifecycle Kit skills, SOPs, MCP profiles, and ontology links so you can load the right chunk instead of the whole kit.'
  },
  '/docs/sops': {
    headline: 'SOPs',
    description:
      'Operator procedures for Agent Lifecycle Kit: behavior catalog, context budget, conventional commits, evals, and Cloudflare analytics ops.'
  },
  '/docs/ADRs': {
    headline: 'Architecture Decision Records',
    description:
      'Sparse MADRs for Agent Lifecycle Kit: hexagonal defaults, Unlicense, EDD contracts, thin bootstrap, ontology memory, and the Vite docs site.'
  },
  '/evals/edd': {
    headline: 'Eval suites',
    description:
      'Offline and live Eval-Driven Development suites for Agent Lifecycle Kit: routing, schemas, Cloudflare ops, and the teaching demo you can paste into a PR.'
  },
  '/mcps': {
    headline: 'MCP library',
    description:
      'Named MCP profiles for Agent Lifecycle Kit sessions: default, cloud, cloudflare-ops, and how to install one profile without stacking tools.'
  },
  '/ontology': {
    headline: 'Author the kit map',
    description:
      'How to add skills, SOPs, and evals to the kit map: which files become nodes, how to regenerate the index, and why this is not a product architecture diagram.'
  }
};

const NOINDEX_PATHS = new Set(['/docs/kit-review-backlog', '/404']);

function normalizePathname(pathname: string): string {
  const bare = pathname.split(/[?#]/)[0] ?? pathname;
  return bare.replace(/\/$/, '') || '/';
}

function stripMarkdownChrome(markdown: string): string {
  return markdown.replace(/^---[\s\S]*?---\s*/, '');
}

function firstParagraph(markdown: string): string | undefined {
  const body = stripMarkdownChrome(markdown);
  let inFence = false;
  for (const raw of body.split('\n')) {
    const row = raw.trim();
    if (row.startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    if (inFence || !row) continue;
    if (
      row.startsWith('#') ||
      row.startsWith('>') ||
      row.startsWith('|') ||
      row.startsWith('-[') ||
      row.startsWith('*') ||
      row.startsWith('- ')
    ) {
      continue;
    }
    const cleaned = row.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_`]/g, '');
    if (cleaned.length > 40) return cleaned;
  }
  return undefined;
}

export function markdownExcerpt(markdown: string, max = 420): string {
  const body = stripMarkdownChrome(markdown);
  const lines: string[] = [];
  let inFence = false;
  for (const raw of body.split('\n')) {
    const row = raw.trim();
    if (row.startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    if (inFence || !row || row.startsWith('#') || row.startsWith('|')) continue;
    lines.push(row);
  }
  const text = lines
    .join(' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).replace(/\s+\S*$/, '')}…`;
}

function titleFor(headline: string, explicit?: string): string {
  if (explicit) return explicit;
  return `${headline} | ${SITE_NAME}`;
}

function humanizeSegment(segment: string): string {
  return segment.replace(/[-_]/g, ' ');
}

export function breadcrumbsFor(path: string, headline: string): Array<{ name: string; path: string }> {
  const crumbs = [{ name: SITE_NAME, path: '/' }];
  if (path === '/') return crumbs;
  const parts = path.split('/').filter(Boolean);
  let acc = '';
  for (const [index, part] of parts.entries()) {
    acc += `/${part}`;
    const override = PAGE_SEO[acc];
    const isLast = index === parts.length - 1;
    crumbs.push({
      name: isLast ? headline : override?.headline ?? humanizeSegment(part),
      path: acc
    });
  }
  return crumbs;
}

const PUBLISHED_PREFIXES = ['/docs/', '/SOPs/', '/evals/', '/mcps/', '/ontology/'] as const;

function isPublishedKitPath(path: string): boolean {
  if (path === '/' || PAGE_SEO[path]) return true;
  return PUBLISHED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function isKnownPath(path: string, opts?: ResolvePageSeoOptions): boolean {
  if (isPublishedKitPath(path)) return true;
  if (opts?.markdown || opts?.file) return true;
  return false;
}

export function canonicalUrlForPath(path: string): string {
  const normalized = normalizePathname(path);
  if (normalized === '/') return `${SITE_ORIGIN}/`;
  return `${SITE_ORIGIN}${normalized}/`;
}

export function notFoundPageSeo(): PageSeo {
  return {
    path: '/404',
    headline: 'That page is not here',
    title: `That page is not here | ${SITE_NAME}`,
    description: 'This URL is not a published kit page. Use the docs overview or the home page.',
    excerpt: 'Try the home page or the docs overview.',
    canonicalUrl: '',
    ogImageUrl: SITE_SOCIAL_IMAGE,
    ogType: 'website',
    indexable: false,
    breadcrumbs: [
      { name: SITE_NAME, path: '/' },
      { name: 'That page is not here', path: '/404' }
    ]
  };
}

export function resolvePageSeo(pathname: string, opts?: ResolvePageSeoOptions): PageSeo {
  const path = normalizePathname(pathname);
  if (opts?.missing || path === '/404') return notFoundPageSeo();

  const known = isKnownPath(path, opts);
  if (!known) {
    return {
      ...notFoundPageSeo(),
      path
    };
  }

  const override = PAGE_SEO[path];
  const headline = override?.headline ?? opts?.headline ?? SITE_NAME;
  const excerptText = opts?.markdown ? markdownExcerpt(opts.markdown) : undefined;
  const derived = opts?.markdown ? firstParagraph(opts.markdown) : undefined;
  const description =
    override?.description ??
    derived ??
    (excerptText && excerptText.length > 20 ? excerptText : undefined) ??
    `${headline} in Agent Lifecycle Kit operator docs.`;
  const excerpt = excerptText ?? description;
  const indexable = override?.indexable !== false && !NOINDEX_PATHS.has(path);

  return {
    path,
    headline,
    title: titleFor(headline, override?.title),
    description,
    excerpt,
    canonicalUrl: canonicalUrlForPath(path),
    ogImageUrl: SITE_SOCIAL_IMAGE,
    ogType: path === '/' ? 'website' : 'article',
    indexable,
    markdownUrl: opts?.file ? `${SITE_ORIGIN}/${opts.file}` : undefined,
    softwareName: override?.softwareName,
    articleMarkdown: opts?.markdown,
    breadcrumbs: breadcrumbsFor(path, headline)
  };
}

export function listIndexableSeoPaths(paths: readonly string[]): string[] {
  return paths
    .filter((path) => {
      const normalized = normalizePathname(path);
      if (!isPublishedKitPath(normalized)) return false;
      return resolvePageSeo(normalized).indexable;
    })
    .sort((a, b) => {
      if (a === '/') return -1;
      if (b === '/') return 1;
      return a.localeCompare(b);
    });
}

function sitemapPriority(path: string): string {
  if (path === '/') return '1.0';
  if (path === '/docs/start' || path === '/docs/edd' || path === '/evals/edd') return '0.9';
  if (path === '/docs' || path === '/docs/map' || path === '/docs/jobs' || path === '/docs/faq') {
    return '0.8';
  }
  if (path.startsWith('/docs/ADRs/')) return '0.4';
  return '0.6';
}

export function buildSitemapXml(paths: readonly string[], lastmod: string): string {
  const urls = paths
    .map((path) => {
      const loc = canonicalUrlForPath(path);
      return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${sitemapPriority(path)}</priority>
  </url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

export function buildJsonLdGraph(seo: PageSeo): Record<string, unknown> {
  const organization = {
    '@type': 'Organization',
    '@id': `${SITE_ORIGIN}/#organization`,
    name: SITE_NAME,
    url: `${SITE_ORIGIN}/`,
    sameAs: [SITE_GITHUB]
  };

  const website = {
    '@type': 'WebSite',
    '@id': `${SITE_ORIGIN}/#website`,
    name: SITE_NAME,
    url: `${SITE_ORIGIN}/`,
    description: resolvePageSeo('/').description,
    publisher: { '@id': `${SITE_ORIGIN}/#organization` }
  };

  const graph: Array<Record<string, unknown>> = [organization, website];

  if (seo.path === '/' && seo.softwareName) {
    graph.push({
      '@type': 'SoftwareApplication',
      '@id': `${SITE_ORIGIN}/#software`,
      name: seo.softwareName,
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Web',
      url: `${SITE_ORIGIN}/`,
      description: resolvePageSeo('/').description,
      image: SITE_SOCIAL_IMAGE,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      publisher: { '@id': `${SITE_ORIGIN}/#organization` }
    });
  }

  graph.push({
    '@type': seo.path === '/' ? 'WebPage' : 'TechArticle',
    '@id': `${seo.canonicalUrl}#webpage`,
    url: seo.canonicalUrl,
    name: seo.title,
    description: seo.description,
    isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
    primaryImageOfPage: seo.ogImageUrl
  });

  if (seo.breadcrumbs.length > 1) {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: seo.breadcrumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: canonicalUrlForPath(crumb.path)
      }))
    });
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph
  };
}
