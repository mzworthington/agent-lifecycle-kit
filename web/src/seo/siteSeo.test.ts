import { describe, expect, it } from 'vitest';
import {
  buildJsonLdGraph,
  buildSitemapXml,
  rankRoute,
  resolvePageSeo,
  type SitemapRoute
} from './siteSeo.ts';

describe('rankRoute', () => {
  it('puts the home page first', () => {
    expect(rankRoute('/')).toEqual({ priority: '1.0', changefreq: 'weekly' });
  });

  it('ranks guides above procedures and ADRs last', () => {
    expect(rankRoute('/docs/edd').priority).toBe('0.8');
    expect(rankRoute('/SOPs/release').priority).toBe('0.6');
    expect(rankRoute('/docs/ADRs/0002-unlicense').priority).toBe('0.4');
  });

  it('treats section indexes as hubs', () => {
    expect(rankRoute('/docs').priority).toBe('0.9');
    expect(rankRoute('/SOPs').priority).toBe('0.7');
  });

  it('changes less often the further from the guides you get', () => {
    expect(rankRoute('/docs/edd').changefreq).toBe('weekly');
    expect(rankRoute('/docs/ADRs/0002-unlicense').changefreq).toBe('monthly');
  });
});

describe('buildSitemapXml', () => {
  const routes: SitemapRoute[] = [
    { path: '/', lastmod: '2026-09-01' },
    { path: '/docs/edd', lastmod: '2026-08-31' },
    { path: '/SOPs/release', lastmod: '2026-07-01' },
    { path: '/docs/ADRs/0002-unlicense', lastmod: '2026-05-01' }
  ];
  const xml = buildSitemapXml(routes);

  it('emits absolute locations with per-route lastmod', () => {
    expect(xml).toContain('<loc>https://eval-driven-development.dev/docs/edd</loc>');
    expect(xml).toContain('<lastmod>2026-08-31</lastmod>');
    expect(xml).toContain('<lastmod>2026-07-01</lastmod>');
  });

  it('gives the home page a trailing slash and the top priority', () => {
    expect(xml).toContain('<loc>https://eval-driven-development.dev/</loc>');
    expect(xml).toContain('<priority>1.0</priority>');
  });

  it('orders by priority so the most important URLs come first', () => {
    const order = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
    expect(order).toEqual([
      'https://eval-driven-development.dev/',
      'https://eval-driven-development.dev/docs/edd',
      'https://eval-driven-development.dev/SOPs/release',
      'https://eval-driven-development.dev/docs/ADRs/0002-unlicense'
    ]);
  });

  it('is a well-formed urlset', () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml.trimEnd().endsWith('</urlset>')).toBe(true);
  });
});

describe('buildJsonLdGraph', () => {
  const seo = resolvePageSeo('/docs/edd', 'Eval-Driven Development', '# EDD\n\nRed, green, refactor.\n');

  it('describes a doc page as a TechArticle inside the site', () => {
    const graph = buildJsonLdGraph(seo, { lastmod: '2026-08-31' }) as {
      '@graph': Array<Record<string, unknown>>;
    };
    const article = graph['@graph'][0];
    expect(article['@type']).toBe('TechArticle');
    expect(article.url).toBe('https://eval-driven-development.dev/docs/edd');
    expect(article.dateModified).toBe('2026-08-31');
    expect(article.isPartOf).toEqual({ '@id': 'https://eval-driven-development.dev/#website' });
  });

  it('adds a breadcrumb trail from home through the section', () => {
    const graph = buildJsonLdGraph(seo) as { '@graph': Array<Record<string, unknown>> };
    const crumbs = graph['@graph'][1] as {
      '@type': string;
      itemListElement: Array<{ name: string; item: string; position: number }>;
    };
    expect(crumbs['@type']).toBe('BreadcrumbList');
    expect(crumbs.itemListElement.map((item) => item.name)).toEqual([
      'Agent Lifecycle Kit',
      'Docs',
      'Eval-Driven Development'
    ]);
    expect(crumbs.itemListElement[1].item).toBe('https://eval-driven-development.dev/docs');
  });

  it('describes the home page as a WebSite rather than an article', () => {
    const graph = buildJsonLdGraph(resolvePageSeo('/', 'Agent Lifecycle Kit')) as {
      '@graph': Array<Record<string, unknown>>;
    };
    expect(graph['@graph'][0]['@type']).toBe('WebSite');
    expect(graph['@graph'].some((node) => node['@type'] === 'BreadcrumbList')).toBe(false);
  });
});
