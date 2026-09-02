import { buildJsonLdGraph, type PageSeo } from './siteSeo.ts';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function replaceMetaContent(
  html: string,
  attr: 'name' | 'property',
  key: string,
  content: string
): string {
  const re = new RegExp(`<meta\\s+${attr}="${key}"\\s+content="[^"]*"\\s*/?>`, 'i');
  const tag = `<meta ${attr}="${key}" content="${escapeHtml(content)}" />`;
  if (re.test(html)) return html.replace(re, tag);
  return html.replace(/<\/head>/i, `    ${tag}\n  </head>`);
}

function upsertCanonical(html: string, href: string): string {
  const tag = `<link rel="canonical" href="${escapeHtml(href)}" />`;
  if (/<link\s+rel="canonical"/i.test(html)) {
    return html.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, tag);
  }
  return html.replace(/<\/head>/i, `    ${tag}\n  </head>`);
}

function upsertAlternateMarkdown(html: string, href: string | undefined): string {
  const re = /<link\s+rel="alternate"\s+type="text\/markdown"[^>]*>/i;
  if (!href) {
    return html.replace(re, '');
  }
  const tag = `<link rel="alternate" type="text/markdown" href="${escapeHtml(href)}" />`;
  if (re.test(html)) return html.replace(re, tag);
  return html.replace(/<\/head>/i, `    ${tag}\n  </head>`);
}

function stripJsonLdScripts(html: string): string {
  let result = '';
  let i = 0;
  const lower = html.toLowerCase();

  while (i < html.length) {
    const open = lower.indexOf('<script', i);
    if (open === -1) {
      result += html.slice(i);
      break;
    }
    const tagEnd = html.indexOf('>', open);
    if (tagEnd === -1) {
      result += html.slice(i);
      break;
    }
    const openTag = html.slice(open, tagEnd + 1);
    if (!/\btype\s*=\s*["']application\/ld\+json["']/i.test(openTag)) {
      result += html.slice(i, tagEnd + 1);
      i = tagEnd + 1;
      continue;
    }
    result += html.slice(i, open);
    const close = lower.indexOf('</script>', tagEnd + 1);
    if (close === -1) break;
    i = close + '</script>'.length;
  }
  return result;
}

function upsertJsonLd(html: string, seo: PageSeo): string {
  const without = stripJsonLdScripts(html);
  if (!seo.indexable) return without;
  const script = `<script type="application/ld+json">${JSON.stringify(buildJsonLdGraph(seo))}</script>`;
  return without.replace(/<\/head>/i, `    ${script}\n  </head>`);
}

function breadcrumbNav(seo: PageSeo): string {
  if (seo.breadcrumbs.length < 2) return '';
  const items = seo.breadcrumbs
    .map((crumb) => `            <li><a href="${escapeHtml(crumb.path)}">${escapeHtml(crumb.name)}</a></li>`)
    .join('\n');
  return `        <nav aria-label="Breadcrumb">
          <ol>
${items}
          </ol>
        </nav>
`;
}

function prerenderBody(seo: PageSeo, navLinks: Array<{ href: string; label: string }>): string {
  const links = navLinks
    .map((link) => `            <li><a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a></li>`)
    .join('\n');
  const excerpt =
    seo.excerpt && seo.excerpt !== seo.description
      ? `        <p>${escapeHtml(seo.excerpt)}</p>\n`
      : '';
  return `      <a class="skip-link" href="#main">Skip to content</a>
      <header>
        <a href="/">Agent Lifecycle Kit</a>
        <nav aria-label="Site">
          <ul>
${links}
          </ul>
        </nav>
      </header>
      <main id="main" data-kit-prerender="1">
${breadcrumbNav(seo)}        <h1>${escapeHtml(seo.headline)}</h1>
        <p>${escapeHtml(seo.description)}</p>
${excerpt}      </main>
`;
}

export function injectPrerenderedPageHtml(
  shellHtml: string,
  seo: PageSeo,
  navLinks: Array<{ href: string; label: string }>
): string {
  let html = shellHtml;
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(seo.title)}</title>`);
  html = replaceMetaContent(html, 'name', 'description', seo.description);
  html = replaceMetaContent(html, 'name', 'robots', seo.indexable ? 'index,follow' : 'noindex,nofollow');
  html = upsertCanonical(html, seo.canonicalUrl);
  html = upsertAlternateMarkdown(html, seo.markdownUrl);
  html = replaceMetaContent(html, 'property', 'og:url', seo.canonicalUrl);
  html = replaceMetaContent(html, 'property', 'og:title', seo.title);
  html = replaceMetaContent(html, 'property', 'og:description', seo.description);
  html = replaceMetaContent(html, 'property', 'og:image', seo.ogImageUrl);
  html = replaceMetaContent(html, 'name', 'twitter:url', seo.canonicalUrl);
  html = replaceMetaContent(html, 'name', 'twitter:title', seo.title);
  html = replaceMetaContent(html, 'name', 'twitter:description', seo.description);
  html = replaceMetaContent(html, 'name', 'twitter:image', seo.ogImageUrl);
  html = upsertJsonLd(html, seo);

  const body = prerenderBody(seo, navLinks);
  if (/<div id="root"><\/div>/i.test(html)) {
    html = html.replace(/<div id="root"><\/div>/i, `<div id="root">\n${body}    </div>`);
  }
  return html;
}
