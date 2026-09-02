import { buildJsonLdGraph, SITE_ORIGIN, type PageSeo } from './siteSeo.ts';

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

function removeCanonical(html: string): string {
  return html.replace(/<link\s+rel="canonical"[^>]*>\s*/gi, '');
}

function upsertCanonical(html: string, href: string): string {
  if (!href) return removeCanonical(html);
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

function inlineMarkdown(text: string): string {
  const chunks: string[] = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    chunks.push(escapeHtml(text.slice(last, match.index)));
    if (match[1] !== undefined && match[2] !== undefined) {
      chunks.push(`<a href="${escapeHtml(match[2])}">${escapeHtml(match[1])}</a>`);
    } else if (match[3] !== undefined) {
      chunks.push(`<code>${escapeHtml(match[3])}</code>`);
    }
    last = match.index + match[0].length;
  }
  chunks.push(escapeHtml(text.slice(last)));
  return chunks.join('');
}

/** Static HTML for crawlers that do not execute the SPA. Not a full CommonMark port. */
export function markdownToCrawlerHtml(markdown: string): string {
  const body = markdown.replace(/^---[\s\S]*?---\s*/, '');
  const blocks: string[] = [];
  let skippedH1 = false;
  let fence: string | null = null;
  let fenceLines: string[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (list.length === 0) return;
    const items = list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join('');
    blocks.push(`<ul>${items}</ul>`);
    list = [];
  };

  const lines = body.split('\n');
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (fence !== null) {
      if (line.trim().startsWith('```')) {
        if (fence !== 'widget') {
          blocks.push(`<pre><code>${escapeHtml(fenceLines.join('\n'))}</code></pre>`);
        }
        fence = null;
        fenceLines = [];
      } else {
        fenceLines.push(raw);
      }
      continue;
    }
    if (line.trim().startsWith('```')) {
      flushParagraph();
      flushList();
      fence = line.trim().slice(3).trim() || 'text';
      fenceLines = [];
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1]!.length;
      if (level === 1 && !skippedH1) {
        skippedH1 = true;
        continue;
      }
      blocks.push(`<h${level}>${inlineMarkdown(heading[2]!.trim())}</h${level}>`);
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      list.push(bullet[1]);
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }
    flushList();
    paragraph.push(line.trim());
  }
  flushParagraph();
  flushList();
  return blocks.join('\n');
}

function prerenderBody(seo: PageSeo, navLinks: Array<{ href: string; label: string }>): string {
  const links = navLinks
    .map((link) => `            <li><a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a></li>`)
    .join('\n');
  const article = seo.articleMarkdown ? markdownToCrawlerHtml(seo.articleMarkdown) : '';
  const excerpt =
    !article && seo.excerpt && seo.excerpt !== seo.description
      ? `        <p>${escapeHtml(seo.excerpt)}</p>\n`
      : '';
  const articleBlock = article ? `        <article>\n${article}\n        </article>\n` : '';
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
${excerpt}${articleBlock}      </main>
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
  html = replaceMetaContent(html, 'property', 'og:url', seo.canonicalUrl || SITE_ORIGIN);
  html = replaceMetaContent(html, 'property', 'og:title', seo.title);
  html = replaceMetaContent(html, 'property', 'og:description', seo.description);
  html = replaceMetaContent(html, 'property', 'og:image', seo.ogImageUrl);
  html = replaceMetaContent(html, 'property', 'og:type', seo.ogType);
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
