import { buildJsonLdGraph, type PageSeo } from './siteSeo.ts';

const SEO_ATTR = 'data-kit-seo';

function upsertMeta(attr: 'name' | 'property', key: string, content: string): HTMLMetaElement {
  const selector = `meta[${attr}="${key}"]`;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    el.setAttribute(SEO_ATTR, '1');
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
  return el;
}

function upsertLink(rel: string, href: string, type?: string): HTMLLinkElement {
  const typeSelector = type ? `[type="${type}"]` : '';
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]${typeSelector}`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    if (type) el.setAttribute('type', type);
    el.setAttribute(SEO_ATTR, '1');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
  return el;
}

function upsertJsonLd(seo: PageSeo): void {
  document.head.querySelectorAll('script[type="application/ld+json"]').forEach((node) => node.remove());
  if (!seo.indexable) return;

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.setAttribute(SEO_ATTR, '1');
  script.textContent = JSON.stringify(buildJsonLdGraph(seo));
  document.head.appendChild(script);
}

export function resetDocumentHeadManagedNodes(): void {
  document.head.querySelectorAll(`[${SEO_ATTR}]`).forEach((node) => node.remove());
}

export function applyDocumentHead(seo: PageSeo): void {
  document.title = seo.title;
  upsertMeta('name', 'description', seo.description);
  upsertMeta('name', 'robots', seo.indexable ? 'index,follow' : 'noindex,nofollow');
  upsertLink('canonical', seo.canonicalUrl);

  upsertMeta('property', 'og:type', 'website');
  upsertMeta('property', 'og:url', seo.canonicalUrl);
  upsertMeta('property', 'og:title', seo.title);
  upsertMeta('property', 'og:description', seo.description);
  upsertMeta('property', 'og:image', seo.ogImageUrl);
  upsertMeta('property', 'og:site_name', 'Agent Lifecycle Kit');

  upsertMeta('name', 'twitter:card', 'summary_large_image');
  upsertMeta('name', 'twitter:url', seo.canonicalUrl);
  upsertMeta('name', 'twitter:title', seo.title);
  upsertMeta('name', 'twitter:description', seo.description);
  upsertMeta('name', 'twitter:image', seo.ogImageUrl);

  const existingAlternate = document.head.querySelector<HTMLLinkElement>(
    'link[rel="alternate"][type="text/markdown"]'
  );
  if (seo.markdownUrl) {
    upsertLink('alternate', seo.markdownUrl, 'text/markdown');
  } else if (existingAlternate?.getAttribute(SEO_ATTR) === '1') {
    existingAlternate.remove();
  }

  upsertJsonLd(seo);
}
