import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildSitemapEntries,
  groupSitemapEntries,
  isSitemapCandidate,
  renderSitemapPage,
  serializeSitemapXml,
  type SitemapFile
} from './sitemap.js';

const files: SitemapFile[] = [
  { rel: 'index.html', lastmod: '2026-09-01' },
  { rel: '404.html', lastmod: '2026-09-01' },
  { rel: 'docs/index.html', lastmod: '2026-08-31', title: 'Public docs' },
  { rel: 'docs/edd.html', lastmod: '2026-08-31', title: 'Eval-Driven Development' },
  { rel: 'docs/edd.md', lastmod: '2026-08-31' },
  { rel: 'docs/ADRs/0001-hexagonal.html', lastmod: '2026-05-01', title: 'Hexagonal default' },
  { rel: 'SOPs/release.html', lastmod: '2026-07-01', title: 'Release checklist' },
  { rel: 'evals/edd/demo.yaml', lastmod: '2026-08-01' },
  { rel: 'assets/site.css', lastmod: '2026-08-01' },
  { rel: 'llms.txt', lastmod: '2026-09-01' },
  { rel: 'llms-full.txt', lastmod: '2026-09-01' },
  { rel: 'sitemap.html', lastmod: '2026-09-01' },
  { rel: 'CNAME' }
];

describe('isSitemapCandidate', () => {
  it('lists rendered HTML and the machine-readable indexes', () => {
    assert.ok(isSitemapCandidate('docs/edd.html'));
    assert.ok(isSitemapCandidate('llms.txt'));
    assert.ok(isSitemapCandidate('llms-full.txt'));
  });

  it('skips raw Markdown, data files, assets, and the 404 page', () => {
    assert.ok(!isSitemapCandidate('docs/edd.md'));
    assert.ok(!isSitemapCandidate('evals/edd/demo.yaml'));
    assert.ok(!isSitemapCandidate('assets/site.css'));
    assert.ok(!isSitemapCandidate('404.html'));
    assert.ok(!isSitemapCandidate('CNAME'));
  });
});

describe('buildSitemapEntries', () => {
  const entries = buildSitemapEntries(files);
  const byPath = new Map(entries.map((entry) => [entry.urlPath, entry]));

  it('covers every indexable page and nothing else', () => {
    assert.deepEqual(
      entries.map((entry) => entry.urlPath).sort(),
      [
        '/',
        '/SOPs/release.html',
        '/docs/',
        '/docs/ADRs/0001-hexagonal.html',
        '/docs/edd.html',
        '/llms-full.txt',
        '/llms.txt',
        '/sitemap.html'
      ]
    );
  });

  it('ranks the homepage first and ADRs last', () => {
    assert.equal(entries[0].urlPath, '/');
    assert.equal(byPath.get('/')?.priority, '1.0');
    assert.equal(byPath.get('/docs/edd.html')?.priority, '0.8');
    assert.equal(byPath.get('/SOPs/release.html')?.priority, '0.6');
    assert.equal(byPath.get('/docs/ADRs/0001-hexagonal.html')?.priority, '0.4');
  });

  it('carries lastmod and page titles through', () => {
    assert.equal(byPath.get('/docs/edd.html')?.lastmod, '2026-08-31');
    assert.equal(byPath.get('/docs/edd.html')?.title, 'Eval-Driven Development');
  });

  it('keeps the homepage image entry', () => {
    assert.equal(byPath.get('/')?.images?.[0].loc, 'https://eval-driven-development.dev/assets/og.jpg');
  });

  it('derives a readable title when a file has none', () => {
    assert.equal(buildSitemapEntries([{ rel: 'SOPs/context-budget.html' }])[0].title, 'Context budget');
  });
});

describe('serializeSitemapXml', () => {
  const xml = serializeSitemapXml(buildSitemapEntries(files));

  it('emits a valid urlset with absolute locations', () => {
    assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    assert.match(xml, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/);
    assert.match(xml, /<loc>https:\/\/eval-driven-development\.dev\/docs\/edd\.html<\/loc>/);
    assert.match(xml, /<lastmod>2026-08-31<\/lastmod>/);
    assert.ok(xml.trim().endsWith('</urlset>'));
  });

  it('keeps the image extension for the homepage', () => {
    assert.match(xml, /<image:loc>https:\/\/eval-driven-development\.dev\/assets\/og\.jpg<\/image:loc>/);
  });

  it('never lists a raw Markdown URL', () => {
    assert.doesNotMatch(xml, /\.md</);
  });
});

describe('groupSitemapEntries', () => {
  it('orders groups from start-here to machine-readable', () => {
    const groups = groupSitemapEntries(buildSitemapEntries(files));
    assert.deepEqual(
      groups.map((group) => group.group),
      ['Start here', 'Architecture decisions', 'Docs', 'SOPs', 'Machine-readable']
    );
  });
});

describe('renderSitemapPage', () => {
  const html = renderSitemapPage(buildSitemapEntries(files), '2026-09-01');

  it('links every indexable URL from one crawlable hub', () => {
    assert.match(html, /<a href="\/docs\/edd\.html">Eval-Driven Development<\/a>/);
    assert.match(html, /<a href="\/SOPs\/release\.html">Release checklist<\/a>/);
    assert.match(html, /<a href="\/llms-full\.txt">/);
  });

  it('is a self-canonical CollectionPage', () => {
    assert.match(html, /<link rel="canonical" href="https:\/\/eval-driven-development\.dev\/sitemap\.html">/);
    assert.match(html, /"@type": "CollectionPage"/);
    assert.match(html, /<meta property="og:type" content="website">/);
    assert.doesNotMatch(html, /text\/markdown/);
  });
});
