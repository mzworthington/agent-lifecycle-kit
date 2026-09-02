import { describe, expect, it } from 'vitest';
import { buildLlmsFull, extractLlmsLinks, type LlmsFullDoc } from './llmsFull.ts';

const docs: LlmsFullDoc[] = [
  {
    path: '/docs/edd',
    file: 'docs/edd.md',
    title: 'Eval-Driven Development',
    markdown: '# Eval-Driven Development\n\nRed, green, refactor.\n'
  },
  {
    path: '/SOPs/release',
    file: 'SOPs/release.md',
    title: 'Release',
    markdown: '---\ntitle: Release checklist\nkind: sop\n---\n# SOP: Release\n\nShip it.\n'
  }
];

describe('buildLlmsFull', () => {
  const out = buildLlmsFull(docs);

  it('points at the shorter index and the machine sitemap', () => {
    expect(out.startsWith('# Agent Lifecycle Kit - full text')).toBe(true);
    expect(out).toContain('https://eval-driven-development.dev/llms.txt');
    expect(out).toContain('https://eval-driven-development.dev/sitemap.xml');
  });

  it('attaches the page route and the Markdown URL to each section', () => {
    expect(out).toContain('url: https://eval-driven-development.dev/docs/edd');
    expect(out).toContain('markdown: https://eval-driven-development.dev/docs/edd.md');
  });

  it('includes full bodies and drops source frontmatter', () => {
    expect(out).toContain('Red, green, refactor.');
    expect(out).toContain('Ship it.');
    expect(out).not.toContain('kind: sop');
  });

  it('keeps the order the caller passed', () => {
    expect(out.indexOf('/docs/edd')).toBeLessThan(out.indexOf('/SOPs/release'));
  });
});

describe('extractLlmsLinks', () => {
  it('pulls every Markdown link target', () => {
    expect(extractLlmsLinks('- [Home](https://x.dev/)\n- [Guide](https://x.dev/docs/edd.md)\n')).toEqual([
      'https://x.dev/',
      'https://x.dev/docs/edd.md'
    ]);
  });
});
