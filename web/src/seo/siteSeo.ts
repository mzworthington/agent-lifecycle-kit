export const SITE_ORIGIN = 'https://eval-driven-development.dev';
export const SITE_NAME = 'Agent Lifecycle Kit';
export const SITE_AUTHOR = 'mzworthington';
export const SITE_SOCIAL_IMAGE = `${SITE_ORIGIN}/assets/og.jpg`;

export type PageSeo = {
  path: string;
  title: string;
  headline: string;
  description: string;
  canonicalUrl: string;
  ogImageUrl: string;
  indexable: boolean;
};

export type SitemapRoute = {
  path: string;
  /** ISO date (YYYY-MM-DD) of the last content change. */
  lastmod: string;
};

export type RouteRank = {
  priority: string;
  changefreq: 'daily' | 'weekly' | 'monthly';
};

const HOME_DESCRIPTION =
  'Pick the job for today: fix wrong-tool routing, gate prompt changes at 95%, or run your first offline eval. Eval-Driven Development from Agent Lifecycle Kit.';

/** Section hubs and their breadcrumb labels, longest prefix first. */
const SECTIONS: ReadonlyArray<{ prefix: string; label: string }> = [
  { prefix: '/docs/ADRs', label: 'Architecture decisions' },
  { prefix: '/docs', label: 'Docs' },
  { prefix: '/SOPs', label: 'SOPs' },
  { prefix: '/evals/edd', label: 'Evals' },
  { prefix: '/ontology', label: 'Ontology' },
  { prefix: '/mcps', label: 'MCP servers' }
];

function sectionFor(path: string): { prefix: string; label: string } | undefined {
  return SECTIONS.find((section) => path === section.prefix || path.startsWith(`${section.prefix}/`));
}

function firstParagraph(markdown: string): string {
  const body = markdown.replace(/^---[\s\S]*?---\s*/, '');
  const line = body
    .split('\n')
    .map((row) => row.trim())
    .find((row) => row && !row.startsWith('#') && !row.startsWith('```') && !row.startsWith('>'));
  if (!line) return HOME_DESCRIPTION;
  return line.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').slice(0, 220);
}

export function resolvePageSeo(path: string, headline: string, markdown?: string): PageSeo {
  const isHome = path === '/';
  const description = isHome ? HOME_DESCRIPTION : firstParagraph(markdown ?? headline);
  const title = isHome
    ? `${SITE_NAME}: test the tools your agents call`
    : `${headline} | ${SITE_NAME}`;
  return {
    path,
    title,
    headline: isHome ? SITE_NAME : headline,
    description,
    canonicalUrl: path === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${path}`,
    ogImageUrl: SITE_SOCIAL_IMAGE,
    indexable: true
  };
}

/**
 * Crawl priority follows how much a page is worth to a first-time reader:
 * hubs and guides above procedures, decision records last.
 */
export function rankRoute(path: string): RouteRank {
  if (path === '/') return { priority: '1.0', changefreq: 'weekly' };
  const section = sectionFor(path);
  if (!section) return { priority: '0.5', changefreq: 'monthly' };
  const isHub = path === section.prefix;
  switch (section.prefix) {
    case '/docs':
      return { priority: isHub ? '0.9' : '0.8', changefreq: 'weekly' };
    case '/SOPs':
      return { priority: isHub ? '0.7' : '0.6', changefreq: 'monthly' };
    case '/docs/ADRs':
      return { priority: isHub ? '0.5' : '0.4', changefreq: 'monthly' };
    default:
      return { priority: isHub ? '0.6' : '0.5', changefreq: 'monthly' };
  }
}

export function buildSitemapXml(routes: readonly SitemapRoute[]): string {
  const urls = [...routes]
    .map((route) => ({ ...route, ...rankRoute(route.path) }))
    .sort((a, b) => Number(b.priority) - Number(a.priority) || a.path.localeCompare(b.path))
    .map((route) => {
      const loc = route.path === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${route.path}`;
      return `  <url>
    <loc>${loc}</loc>
    <lastmod>${route.lastmod}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

export function buildJsonLdGraph(seo: PageSeo, opts: { lastmod?: string } = {}): unknown {
  const website = {
    '@type': 'WebSite',
    '@id': `${SITE_ORIGIN}/#website`,
    name: SITE_NAME,
    url: `${SITE_ORIGIN}/`,
    description: seo.description,
    inLanguage: 'en',
    publisher: { '@id': `${SITE_ORIGIN}/#person` }
  };
  const person = {
    '@type': 'Person',
    '@id': `${SITE_ORIGIN}/#person`,
    name: SITE_AUTHOR,
    url: `https://github.com/${SITE_AUTHOR}`
  };

  if (seo.path === '/') {
    return { '@context': 'https://schema.org', '@graph': [website, person] };
  }

  const section = sectionFor(seo.path);
  const crumbs = [
    { name: SITE_NAME, item: `${SITE_ORIGIN}/` },
    ...(section && section.prefix !== seo.path
      ? [{ name: section.label, item: `${SITE_ORIGIN}${section.prefix}` }]
      : []),
    { name: seo.headline, item: seo.canonicalUrl }
  ];

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'TechArticle',
        '@id': `${seo.canonicalUrl}#article`,
        headline: seo.headline,
        description: seo.description,
        url: seo.canonicalUrl,
        inLanguage: 'en',
        ...(opts.lastmod ? { dateModified: opts.lastmod } : {}),
        author: { '@id': `${SITE_ORIGIN}/#person` },
        publisher: { '@id': `${SITE_ORIGIN}/#person` },
        isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
        mainEntityOfPage: seo.canonicalUrl,
        image: seo.ogImageUrl
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${seo.canonicalUrl}#breadcrumb`,
        itemListElement: crumbs.map((crumb, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: crumb.name,
          item: crumb.item
        }))
      },
      person
    ]
  };
}
