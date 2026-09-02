import { describe, expect, it } from 'vitest';
import { injectPrerenderedPageHtml } from './prerenderHtml.ts';
import { resolvePageSeo } from './siteSeo.ts';

const shell = `<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Agent Lifecycle Kit</title>
    <meta name="description" content="placeholder" />
    <meta property="og:type" content="website" />
    <script type="application/ld+json">{"@type":"WebSite"}</script>
  </head>
  <body><div id="root"></div></body>
</html>`;

const nav = [{ href: '/docs', label: 'Guide' }];
const seo = resolvePageSeo('/SOPs/release', 'Release checklist', '# Release\n\nShip it carefully.\n');

describe('injectPrerenderedPageHtml', () => {
  const html = injectPrerenderedPageHtml(shell, seo, nav, {
    lastmod: '2026-07-01',
    markdownUrl: 'https://eval-driven-development.dev/SOPs/release.md'
  });

  it('replaces the shell title, description, and canonical', () => {
    expect(html).toContain('<title>Release checklist | Agent Lifecycle Kit</title>');
    expect(html).toContain('content="Ship it carefully."');
    expect(html).toContain('<link rel="canonical" href="https://eval-driven-development.dev/SOPs/release" />');
    expect(html).not.toContain('placeholder');
  });

  it('marks doc routes as articles rather than the site shell', () => {
    expect(html).toContain('<meta property="og:type" content="article" />');
    expect(html).not.toContain('<meta property="og:type" content="website" />');
  });

  it('publishes freshness and the Markdown alternate', () => {
    expect(html).toContain('<meta property="article:modified_time" content="2026-07-01" />');
    expect(html).toContain(
      '<link rel="alternate" type="text/markdown" href="https://eval-driven-development.dev/SOPs/release.md" />'
    );
  });

  it('replaces the shell JSON-LD with the page graph', () => {
    const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    expect(scripts).toHaveLength(1);
    const graph = JSON.parse(scripts[0][1]) as { '@graph': Array<{ '@type': string }> };
    expect(graph['@graph'].map((node) => node['@type'])).toEqual([
      'TechArticle',
      'BreadcrumbList',
      'Person'
    ]);
  });

  it('prerenders readable content into the empty SPA root', () => {
    expect(html).toContain('<h1>Release checklist</h1>');
    expect(html).toContain('<a href="/docs">Guide</a>');
    expect(html).not.toContain('<div id="root"></div>');
  });

  it('keeps the home page a website with no article metadata', () => {
    const home = injectPrerenderedPageHtml(shell, resolvePageSeo('/', 'Agent Lifecycle Kit'), nav);
    expect(home).toContain('<meta property="og:type" content="website" />');
    expect(home).not.toContain('article:modified_time');
    expect(home).not.toContain('text/markdown');
  });
});
