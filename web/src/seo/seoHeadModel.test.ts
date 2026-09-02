import { describe, expect, it } from 'vitest';
import { seoHeadModel } from './siteSeo.ts';
import { resolvePageSeo } from './siteSeo.ts';

describe('seoHeadModel', () => {
  it('maps title, description, canonical, robots, and social tags', () => {
    const head = seoHeadModel(resolvePageSeo('/docs/start'));
    expect(head.title.toLowerCase()).toMatch(/getting started/);
    expect(head.description.length).toBeGreaterThan(40);
    expect(head.canonicalUrl).toBe('https://eval-driven.dev/docs/start/');
    expect(head.robots).toBe('index,follow');
    expect(head.ogType).toBe('article');
    expect(head.ogTitle).toBe(head.title);
    expect(JSON.stringify(head.jsonLd)).toContain('TechArticle');
    expect(JSON.stringify(head.jsonLd)).not.toContain('SoftwareApplication');
  });

  it('sets noindex and skips JSON-LD on unknown routes', () => {
    const head = seoHeadModel(resolvePageSeo('/missing'));
    expect(head.robots).toBe('noindex,nofollow');
    expect(head.jsonLd).toBeUndefined();
    expect(head.canonicalUrl).toBeUndefined();
  });

  it('exposes markdown source as an alternate for published pages', () => {
    const head = seoHeadModel(
      resolvePageSeo('/docs/edd', { headline: 'EDD guide', markdown: '# EDD\n\nBody.\n', file: 'docs/edd.md' })
    );
    expect(head.markdownUrl).toBe('https://eval-driven.dev/docs/edd.md');
  });
});
