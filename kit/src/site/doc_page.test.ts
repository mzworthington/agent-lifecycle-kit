import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { breadcrumbsFor, renderDocPage, type DocPageInput } from './doc_page.js';

const base: DocPageInput = {
  outputRel: 'docs/edd.html',
  sourceRel: 'docs/edd.md',
  title: 'Eval-Driven Development',
  description: 'TDD for agents that call tools.',
  bodyHtml: '<h2 id="loop">Loop</h2>\n<p>Red, green, refactor.</p>',
  toc: [
    { id: 'loop', text: 'Loop', depth: 2 },
    { id: 'ci', text: 'CI gate', depth: 2 }
  ],
  lastmod: '2026-08-31',
  sectionLabel: 'Docs',
  sectionUrlPath: '/docs/'
};

describe('breadcrumbsFor', () => {
  it('builds home / section / page', () => {
    assert.deepEqual(breadcrumbsFor(base), [
      { name: 'Agent Lifecycle Kit', urlPath: '/' },
      { name: 'Docs', urlPath: '/docs/' },
      { name: 'Eval-Driven Development', urlPath: '/docs/edd.html' }
    ]);
  });

  it('drops the section crumb on the section index itself', () => {
    const crumbs = breadcrumbsFor({
      ...base,
      outputRel: 'docs/index.html',
      sourceRel: 'docs/README.md',
      title: 'Public docs'
    });
    assert.deepEqual(
      crumbs.map((c) => c.urlPath),
      ['/', '/docs/']
    );
  });
});

describe('renderDocPage', () => {
  const html = renderDocPage(base);

  it('emits a unique title, description, and canonical URL', () => {
    assert.match(html, /<title>Eval-Driven Development - Agent Lifecycle Kit<\/title>/);
    assert.match(html, /<meta name="description" content="TDD for agents that call tools\.">/);
    assert.match(html, /<link rel="canonical" href="https:\/\/eval-driven-development\.dev\/docs\/edd\.html">/);
  });

  it('keeps the Markdown source discoverable as an alternate representation', () => {
    assert.match(
      html,
      /<link rel="alternate" type="text\/markdown"[^>]*href="https:\/\/eval-driven-development\.dev\/docs\/edd\.md">/
    );
    assert.match(html, /<a href="\/docs\/edd\.md">Read as Markdown<\/a>/);
  });

  it('ships Open Graph, Twitter, and article freshness metadata', () => {
    assert.match(html, /<meta property="og:type" content="article">/);
    assert.match(html, /<meta property="og:url" content="https:\/\/eval-driven-development\.dev\/docs\/edd\.html">/);
    assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
    assert.match(html, /<meta property="article:modified_time" content="2026-08-31">/);
  });

  it('emits TechArticle and BreadcrumbList structured data', () => {
    const ld = /<script type="application\/ld\+json">\n([\s\S]*?)\n  <\/script>/.exec(html);
    assert.ok(ld, 'expected a JSON-LD block');
    const graph = JSON.parse(ld[1]) as { '@graph': Array<Record<string, unknown>> };
    const types = graph['@graph'].map((node) => node['@type']);
    assert.deepEqual(types, ['TechArticle', 'BreadcrumbList']);
    const article = graph['@graph'][0];
    assert.equal(article.dateModified, '2026-08-31');
    assert.equal(article.url, 'https://eval-driven-development.dev/docs/edd.html');
    const breadcrumb = graph['@graph'][1] as { itemListElement: Array<{ item: string; position: number }> };
    assert.equal(breadcrumb.itemListElement.length, 3);
    assert.equal(breadcrumb.itemListElement[2].item, 'https://eval-driven-development.dev/docs/edd.html');
  });

  it('renders a table of contents and a breadcrumb trail', () => {
    assert.match(html, /<nav class="doc-toc"/);
    assert.match(html, /<a href="#loop">Loop<\/a>/);
    assert.match(html, /<nav class="doc-breadcrumb" aria-label="Breadcrumb">/);
  });

  it('omits the table of contents when there is nothing to jump to', () => {
    const thin = renderDocPage({ ...base, toc: [{ id: 'only', text: 'Only', depth: 2 }] });
    assert.doesNotMatch(thin, /doc-toc/);
  });

  it('loads mermaid only for pages that contain diagrams', () => {
    assert.doesNotMatch(html, /mermaid/);
    const diagram = renderDocPage({ ...base, bodyHtml: '<pre class="mermaid">flowchart LR</pre>' });
    assert.match(diagram, /mermaid@10/);
    assert.match(diagram, /\/assets\/doc-page\.js/);
  });

  it('escapes user content in metadata', () => {
    const risky = renderDocPage({ ...base, title: 'A "quoted" <title>', description: 'x " y' });
    assert.match(risky, /<title>A &quot;quoted&quot; &lt;title&gt; - Agent Lifecycle Kit<\/title>/);
    assert.doesNotMatch(risky, /content="x " y"/);
  });

  it('links the site nav and footer to crawlable index pages', () => {
    assert.match(html, /<a href="\/sitemap\.html" class="nav-link">All pages<\/a>/);
    assert.match(html, /<a href="\/llms\.txt">llms\.txt<\/a>/);
  });
});
