import { describe, expect, it } from 'vitest';
import { docsToc, headingId, slugifyHeading } from './outline.ts';

describe('docsToc', () => {
  it('collects h2/h3 ids and skips fenced headings', () => {
    const toc = docsToc(`# Title

## Before and after one miss

Intro

\`\`\`
## not a heading
\`\`\`

### Nested

## Install kit
`);
    expect(toc.map((item) => item.id)).toEqual(['proof', 'nested', 'install']);
    expect(toc[0]?.level).toBe(2);
    expect(toc[1]?.level).toBe(3);
  });
});

describe('headingId', () => {
  it('slugifies and suffixes duplicates', () => {
    expect(slugifyHeading('What kit gives you')).toBe('what-kit-gives-you');
    const used = new Map<string, number>();
    expect(headingId('Install kit', used)).toBe('install');
    expect(headingId('Other', used)).toBe('other');
    expect(headingId('Other', used)).toBe('other-1');
  });
});
