import { escapeHtml, type TocEntry } from './markdown_html.js';
import {
  absoluteUrl,
  githubBlobUrl,
  publicUrlPath,
  SITE_AUTHOR,
  SITE_NAME,
  SITE_OG_IMAGE,
  SITE_ORIGIN
} from './urls.js';

/** HTML shell for a rendered Markdown doc: full head metadata, breadcrumb, TOC, body. Pure. */

export const SITE_BEACON_SRC = 'https://insights.eval-driven-development.dev/beacon.min.js';
export const SITE_BEACON_TOKEN = 'e311ddff5c974fd1a530df102462cb1f';

export interface DocPageInput {
  /** Path of the page inside the assembled tree, e.g. `docs/edd.html`. */
  outputRel: string;
  /** Markdown source that stays published for agents, e.g. `docs/edd.md`. Absent on generated pages. */
  sourceRel?: string;
  title: string;
  description: string;
  bodyHtml: string;
  toc: TocEntry[];
  /** ISO date (YYYY-MM-DD) of the last content change. */
  lastmod?: string;
  sectionLabel?: string;
  sectionUrlPath?: string;
  ogType?: 'article' | 'website';
}

export interface Breadcrumb {
  name: string;
  urlPath: string;
}

export function breadcrumbsFor(input: DocPageInput): Breadcrumb[] {
  const crumbs: Breadcrumb[] = [{ name: SITE_NAME, urlPath: '/' }];
  const canonicalPath = publicUrlPath(input.outputRel);
  if (input.sectionLabel && input.sectionUrlPath && input.sectionUrlPath !== canonicalPath) {
    crumbs.push({ name: input.sectionLabel, urlPath: input.sectionUrlPath });
  }
  crumbs.push({ name: input.title, urlPath: canonicalPath });
  return crumbs;
}

/**
 * `<title>` must be unique per page. Docs own the plain form; other sections carry
 * their label, which both disambiguates (an EDD guide and an EDD SOP exist) and
 * tells a searcher what kind of page they are about to open.
 */
export function pageTitle(input: DocPageInput): string {
  if (input.title.includes(SITE_NAME)) return input.title;
  const section = input.sectionLabel && input.sectionLabel !== 'Docs' ? ` - ${input.sectionLabel}` : '';
  return `${input.title}${section} - ${SITE_NAME}`;
}

function jsonLd(input: DocPageInput, canonical: string, crumbs: Breadcrumb[]): string {
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': input.sourceRel ? 'TechArticle' : 'CollectionPage',
        '@id': `${canonical}#article`,
        headline: input.title,
        description: input.description,
        url: canonical,
        inLanguage: 'en',
        ...(input.lastmod ? { dateModified: input.lastmod } : {}),
        author: { '@type': 'Person', name: SITE_AUTHOR, url: `https://github.com/${SITE_AUTHOR}` },
        publisher: { '@id': `${SITE_ORIGIN}/#person` },
        isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
        mainEntityOfPage: canonical,
        image: SITE_OG_IMAGE
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonical}#breadcrumb`,
        itemListElement: crumbs.map((crumb, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: crumb.name,
          item: absoluteUrl(crumb.urlPath)
        }))
      }
    ]
  };
  return JSON.stringify(graph, null, 2);
}

function renderToc(toc: TocEntry[]): string {
  if (toc.length < 2) return '';
  const items = toc
    .map(
      (entry) =>
        `        <li class="toc-depth-${entry.depth}"><a href="#${entry.id}">${escapeHtml(entry.text)}</a></li>`
    )
    .join('\n');
  return `      <nav class="doc-toc" aria-labelledby="toc-heading">
        <h2 id="toc-heading">On this page</h2>
        <ol>
${items}
        </ol>
      </nav>
`;
}

function renderBreadcrumbNav(crumbs: Breadcrumb[]): string {
  const items = crumbs
    .map((crumb, index) =>
      index === crumbs.length - 1
        ? `<li aria-current="page">${escapeHtml(crumb.name)}</li>`
        : `<li><a href="${crumb.urlPath}">${escapeHtml(crumb.name)}</a></li>`
    )
    .join('\n          ');
  return `      <nav class="doc-breadcrumb" aria-label="Breadcrumb">
        <ol>
          ${items}
        </ol>
      </nav>
`;
}

export function renderDocPage(input: DocPageInput): string {
  const canonicalPath = publicUrlPath(input.outputRel);
  const canonical = absoluteUrl(canonicalPath);
  const crumbs = breadcrumbsFor(input);
  const title = escapeHtml(pageTitle(input));
  const description = escapeHtml(input.description);
  const needsMermaid = input.bodyHtml.includes('<pre class="mermaid">');
  const markdownAlternate = input.sourceRel
    ? `  <link rel="alternate" type="text/markdown" title="${escapeHtml(input.title)} (Markdown)" href="${absoluteUrl(publicUrlPath(input.sourceRel))}">\n`
    : '';
  const sourceActions = input.sourceRel
    ? `<a href="${publicUrlPath(input.sourceRel)}">Read as Markdown</a> · <a href="${githubBlobUrl(input.sourceRel)}">Edit on GitHub</a>`
    : `<a href="/llms.txt">llms.txt</a> · <a href="/sitemap.xml">XML sitemap</a>`;

  return `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta name="author" content="${SITE_AUTHOR}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <meta name="theme-color" content="#0c1017">
  <meta name="color-scheme" content="dark">
  <link rel="canonical" href="${canonical}">
${markdownAlternate}  <link rel="alternate" type="text/plain" title="llms.txt" href="${SITE_ORIGIN}/llms.txt">
  <link rel="sitemap" type="application/xml" href="${SITE_ORIGIN}/sitemap.xml">
  <link rel="icon" type="image/webp" href="/assets/kit_logo_256.webp" sizes="256x256">
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png" sizes="180x180">

  <meta property="og:locale" content="en_GB">
  <meta property="og:type" content="${input.ogType ?? (input.sourceRel ? 'article' : 'website')}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${SITE_OG_IMAGE}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Eval-Driven Development: TDD for tool-using AI agents">
  <meta property="og:site_name" content="${SITE_NAME}">
${input.lastmod ? `  <meta property="article:modified_time" content="${input.lastmod}">\n` : ''}  <meta property="article:author" content="https://github.com/${SITE_AUTHOR}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${SITE_OG_IMAGE}">

  <script type="application/ld+json">
${jsonLd(input, canonical, crumbs)}
  </script>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link
    href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap"
    rel="stylesheet">
  <link rel="stylesheet" href="/assets/site.css">
${needsMermaid ? `  <script defer src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>\n  <script type="module" src="/assets/doc-page.js"></script>\n` : ''}</head>

<body class="doc-body">
  <a class="skip-link" href="#main">Skip to content</a>

  <header>
    <div class="nav-container">
      <a href="/" class="brand">
        <picture>
          <source srcset="/assets/kit_logo_256.webp" type="image/webp">
          <img src="/assets/kit_logo.png" alt="" width="36" height="36">
        </picture>
        <span>${SITE_NAME}</span>
      </a>
      <nav class="nav-links" aria-label="Site">
        <ul>
          <li><a href="/#today" class="nav-link">Today</a></li>
          <li><a href="/#onboard" class="nav-link">10 minutes</a></li>
          <li><a href="/docs/" class="nav-link">Docs</a></li>
          <li><a href="/SOPs/" class="nav-link">SOPs</a></li>
          <li><a href="/sitemap.html" class="nav-link">All pages</a></li>
        </ul>
      </nav>
    </div>
  </header>

  <main id="main" class="doc-main">
    <div class="doc-shell">
${renderBreadcrumbNav(crumbs)}      <article class="docs-content doc-article">
        <h1>${escapeHtml(input.title)}</h1>
        <p class="doc-meta">${input.lastmod ? `Updated <time datetime="${input.lastmod}">${input.lastmod}</time> · ` : ''}${sourceActions}</p>
${renderToc(input.toc)}${input.bodyHtml}
      </article>
    </div>
  </main>

  <footer>
    <p>
      <a href="/">Home</a> ·
      <a href="/docs/">Docs</a> ·
      <a href="/sitemap.html">All pages</a> ·
      <a href="/llms.txt">llms.txt</a> ·
      <a href="https://github.com/mzworthington/agent-lifecycle-kit">GitHub</a>
    </p>
    <p>Made by <a href="https://mzworthington.co.uk" rel="noopener noreferrer">Matthew Z Worthington</a></p>
  </footer>

  <script type="module" src="${SITE_BEACON_SRC}" data-cf-beacon='{"token":"${SITE_BEACON_TOKEN}"}'></script>
</body>

</html>
`;
}
