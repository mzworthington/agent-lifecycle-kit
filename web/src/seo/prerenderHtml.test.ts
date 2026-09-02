import { describe, expect, it } from 'vitest';
import { injectPrerenderedPageHtml } from './prerenderHtml.ts';
import { notFoundPageSeo, resolvePageSeo } from './siteSeo.ts';

const shell = `<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Agent Lifecycle Kit: test the tools your agents call</title>
    <meta name="description" content="placeholder" />
    <link rel="canonical" href="https://eval-driven.dev/" />
    <meta name="robots" content="index,follow" />
    <meta property="og:url" content="https://eval-driven.dev/" />
    <meta property="og:title" content="placeholder" />
    <meta property="og:description" content="placeholder" />
    <meta property="og:image" content="https://eval-driven.dev/assets/og.jpg" />
    <meta name="twitter:title" content="placeholder" />
    <meta name="twitter:description" content="placeholder" />
    <meta name="twitter:image" content="https://eval-driven.dev/assets/og.jpg" />
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

const nav = [
  { href: '/', label: 'Home' },
  { href: '/docs/start', label: 'Start' }
];

describe('injectPrerenderedPageHtml', () => {
  it('writes crawler landmarks, breadcrumbs, and hub metadata into the SPA shell', () => {
    const seo = resolvePageSeo('/docs/start');
    const html = injectPrerenderedPageHtml(shell, seo, nav);
    expect(html).toContain(`<title>${seo.title}</title>`);
    expect(html).toContain(`content="${seo.description}"`);
    expect(html).toContain('Skip to content');
    expect(html).toContain('<header>');
    expect(html).toContain('id="main"');
    expect(html).toContain(`<h1>${seo.headline}</h1>`);
    expect(html).toContain('aria-label="Breadcrumb"');
    expect(html).toContain('href="/docs/start"');
    expect(html).toContain('application/ld+json');
    expect(html).toContain('index,follow');
  });

  it('omits JSON-LD and sets noindex on the Pages 404 shell', () => {
    const html = injectPrerenderedPageHtml(shell, notFoundPageSeo(), nav);
    expect(html).toContain('noindex,nofollow');
    expect(html).not.toContain('application/ld+json');
    expect(html).not.toMatch(/rel="canonical"/);
    expect(html).toMatch(/not here|not found/i);
  });

  it('prerenders article HTML so crawlers receive headings, links, and body copy', () => {
    const seo = resolvePageSeo('/SOPs/context-budget', {
      headline: 'Context budget',
      markdown:
        '# Context budget\n\nAlways-on agent context is a budget, not a dump of every SOP.\n\n## Next\n\nKeep the handshake thin. See [EDD](/docs/edd).\n\n```widget\nontology\n```\n'
    });
    const html = injectPrerenderedPageHtml(shell, seo, nav);
    expect(html).toContain('Keep the handshake thin.');
    expect(html).toContain('<h2>');
    expect(html).toContain('href="/docs/edd"');
    expect(html).not.toContain('ontology');
    expect(html).toContain('property="og:type" content="article"');
  });
});
