import { describe, expect, it } from 'vitest';
import {
  DOC_PATHS,
  SITE_NAV,
  docsNeighbors,
  docsReadingOrder,
  docsSidebar,
  findPublishedPage,
  isDocsNavActive
} from './pages.ts';

describe('published markdown catalog', () => {
  it('registers operator docs, SOPs, and ADRs from the glob', () => {
    expect(DOC_PATHS.has('/docs/edd')).toBe(true);
    expect(DOC_PATHS.has('/docs/kit')).toBe(true);
    expect(DOC_PATHS.has('/SOPs/context-budget')).toBe(true);
    expect(DOC_PATHS.has('/docs/ADRs/0006-vite-markdown-docs-site')).toBe(true);
    expect(findPublishedPage('/docs/home')).toBeUndefined();
    expect(findPublishedPage('/docs/edd')?.title).toMatch(/EDD|Eval/i);
    expect(findPublishedPage('/ontology')?.title).toBe('Author the kit map');
  });
});

describe('site information architecture', () => {
  it('keeps header hubs to Start, Guide, Evals, and Map', () => {
    expect(SITE_NAV.map((item) => item.label)).toEqual(['Start', 'Guide', 'Evals', 'Map']);
  });

  it('marks Guide for operator pages without stealing Start or Map', () => {
    const guide = SITE_NAV.find((item) => item.label === 'Guide')!;
    const start = SITE_NAV.find((item) => item.label === 'Start')!;
    const map = SITE_NAV.find((item) => item.label === 'Map')!;
    expect(isDocsNavActive('/docs', guide)).toBe(true);
    expect(isDocsNavActive('/docs/edd', guide)).toBe(true);
    expect(isDocsNavActive('/docs/ADRs/0006-vite-markdown-docs-site', guide)).toBe(true);
    expect(isDocsNavActive('/docs/start', guide)).toBe(false);
    expect(isDocsNavActive('/docs/start', start)).toBe(true);
    expect(isDocsNavActive('/docs/map', map)).toBe(true);
    expect(isDocsNavActive('/ontology', map)).toBe(true);
    expect(isDocsNavActive('/docs/map', guide)).toBe(false);
  });

  it('uses a curated sidebar and expands procedures on SOP routes', () => {
    const overview = docsSidebar('/docs');
    expect(overview.map((section) => section.title)).toEqual(['Start', 'Practice', 'Reference']);
    expect(overview[0]?.items[0]).toEqual({ label: 'Overview', path: '/docs' });

    const sopNav = docsSidebar('/SOPs/context-budget');
    expect(sopNav.some((section) => section.title === 'Procedures')).toBe(true);
    expect(
      sopNav.flatMap((section) => section.items).some((item) => item.path === '/SOPs/context-budget')
    ).toBe(true);
  });

  it('walks prev/next along the curated reading order', () => {
    const fromStart = docsNeighbors('/docs/start');
    expect(fromStart.prev?.path).toBe('/docs');
    expect(fromStart.next?.path).toBe('/docs/jobs');
    const order = docsReadingOrder();
    expect(order.slice(0, 4)).toEqual(['/docs', '/docs/start', '/docs/jobs', '/docs/faq']);
  });
});
