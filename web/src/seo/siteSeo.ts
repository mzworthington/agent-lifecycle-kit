export const SITE_ORIGIN = 'https://eval-driven-development.dev';
export const SITE_NAME = 'Agent Lifecycle Kit';
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

const HOME_DESCRIPTION =
  'Pick the job for today: fix wrong-tool routing, gate prompt changes at 95%, or run your first offline eval. Eval-Driven Development from Agent Lifecycle Kit.';

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

export function buildSitemapXml(paths: readonly string[], lastmod: string): string {
  const urls = paths
    .map((path) => {
      const loc = path === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${path}`;
      const priority = path === '/' ? '1.0' : '0.7';
      return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

export function buildJsonLdGraph(seo: PageSeo): unknown {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: seo.headline,
    url: seo.canonicalUrl,
    description: seo.description,
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: `${SITE_ORIGIN}/`
    }
  };
}
