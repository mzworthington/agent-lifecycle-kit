import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { PAGES_SITE_ENTRIES } from './assemble.js';
import { kitRootFrom } from '../shared/paths.js';

const kitRoot = kitRootFrom(import.meta.url);
const SITE_ORIGIN = 'https://eval-driven-development.dev/';

/** Written into the artifact by the Vite build rather than committed. */
const GENERATED = new Set(['', 'sitemap.xml', 'llms-full.txt']);

function extractLinks(markdown: string): string[] {
  return [...markdown.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)].map((match) => match[1]);
}

function isPublished(rel: string): boolean {
  const covered = PAGES_SITE_ENTRIES.some((entry) => rel === entry || rel.startsWith(`${entry}/`));
  return covered && fs.existsSync(path.join(kitRoot, rel));
}

describe('llms.txt', () => {
  const llms = fs.readFileSync(path.join(kitRoot, 'llms.txt'), 'utf8');
  const siteLinks = extractLinks(llms)
    .filter((href) => href.startsWith(SITE_ORIGIN))
    .map((href) => href.slice(SITE_ORIGIN.length).split('#')[0]);

  it('points at the site rather than only GitHub', () => {
    assert.ok(siteLinks.length > 5, `expected several site links, found ${siteLinks.length}`);
  });

  it('advertises only URLs the build publishes', () => {
    const broken = siteLinks.filter((rel) => !GENERATED.has(rel) && !isPublished(rel));
    assert.deepEqual(broken, []);
  });

  it('offers the full corpus to model crawlers', () => {
    assert.ok(siteLinks.includes('llms-full.txt'));
    assert.ok(siteLinks.includes('sitemap.xml'));
  });
});
