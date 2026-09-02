import { afterEach, describe, expect, it } from 'vitest';
import { applyDocumentHead, resetDocumentHeadManagedNodes } from './applyDocumentHead.ts';
import { resolvePageSeo } from './siteSeo.ts';

describe('applyDocumentHead', () => {
  afterEach(() => {
    resetDocumentHeadManagedNodes();
    document.title = '';
  });

  it('updates title, description, canonical, robots, and social tags', () => {
    applyDocumentHead(resolvePageSeo('/docs/start'));
    expect(document.title.toLowerCase()).toMatch(/getting started/);
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')?.length).toBeGreaterThan(
      40
    );
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://eval-driven.dev/docs/start'
    );
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('index,follow');
    expect(document.head.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(document.title);
    expect(document.head.querySelector('script[type="application/ld+json"]')?.textContent).toContain(
      'SoftwareApplication'
    );
  });

  it('sets noindex and skips JSON-LD on unknown routes', () => {
    applyDocumentHead(resolvePageSeo('/missing'));
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex,nofollow');
    expect(document.head.querySelector('script[type="application/ld+json"]')).toBeNull();
  });

  it('exposes markdown source as an alternate for published pages', () => {
    applyDocumentHead(
      resolvePageSeo('/docs/edd', { headline: 'EDD guide', markdown: '# EDD\n\nBody.\n', file: 'docs/edd.md' })
    );
    expect(document.head.querySelector('link[rel="alternate"][type="text/markdown"]')?.getAttribute('href')).toBe(
      'https://eval-driven.dev/docs/edd.md'
    );
  });
});
