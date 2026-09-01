import { describe, expect, it } from 'vitest';
import {
  buildDocsCatalog,
  fileToRoute,
  findDocsPage,
  globKeyToRel,
  shouldPublishMarkdown,
  titleFromMarkdown
} from './catalog';

describe('globKeyToRel', () => {
  it('strips Vite relative prefixes', () => {
    expect(globKeyToRel('../../../docs/edd.md')).toBe('docs/edd.md');
    expect(globKeyToRel('../../../SOPs/context-budget.md')).toBe('SOPs/context-budget.md');
  });
});

describe('fileToRoute', () => {
  it('maps markdown files to stable public paths', () => {
    expect(fileToRoute('docs/edd.md')).toBe('/docs/edd');
    expect(fileToRoute('docs/ADRs/README.md')).toBe('/docs/ADRs');
    expect(fileToRoute('docs/README.md')).toBe('/docs');
    expect(fileToRoute('SOPs/context-budget.md')).toBe('/SOPs/context-budget');
    expect(fileToRoute('evals/edd/examples/before-after.md')).toBe(
      '/evals/edd/examples/before-after'
    );
  });
});

describe('buildDocsCatalog', () => {
  const files = {
    '../../../docs/edd.md': '# EDD guide\n\nBody',
    '../../../docs/home.md': '# Landing\n',
    '../../../docs/landing/demo.md': '# Demo\n',
    '../../../docs/today-jobs.md': '# Jobs source\n',
    '../../../docs/ADRs/README.md': '# Architecture Decision Records\n',
    '../../../SOPs/context-budget.md': '# Context budget\n'
  };

  it('skips landing-only markdown and titles from headings', () => {
    const pages = buildDocsCatalog(files);
    expect(pages.map((p) => p.path).sort()).toEqual(
      ['/SOPs/context-budget', '/docs/ADRs', '/docs/edd'].sort()
    );
    expect(findDocsPage(pages, '/docs/edd')?.title).toBe('EDD guide');
    expect(shouldPublishMarkdown('docs/home.md')).toBe(false);
    expect(shouldPublishMarkdown('docs/today-jobs.md')).toBe(false);
    expect(titleFromMarkdown('# Hello\n', 'x')).toBe('Hello');
  });
});
