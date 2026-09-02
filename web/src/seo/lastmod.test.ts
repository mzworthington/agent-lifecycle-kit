import { describe, expect, it } from 'vitest';
import { parseGitLastModified, resolveLastmod } from './lastmod.ts';

const log = [
  '@2026-09-01',
  'docs/edd.md',
  'robots.txt',
  '',
  '@2026-07-14',
  'docs/edd.md',
  'SOPs/release.md'
].join('\n');

describe('parseGitLastModified', () => {
  it('keeps the most recent commit date per path', () => {
    const dates = parseGitLastModified(log);
    expect(dates.get('docs/edd.md')).toBe('2026-09-01');
    expect(dates.get('SOPs/release.md')).toBe('2026-07-14');
    expect(dates.get('robots.txt')).toBe('2026-09-01');
  });

  it('returns nothing for an empty history', () => {
    expect(parseGitLastModified('').size).toBe(0);
  });
});

describe('resolveLastmod', () => {
  it('falls back when a file is untracked', () => {
    const dates = parseGitLastModified(log);
    expect(resolveLastmod('docs/edd.md', dates, '2026-01-01')).toBe('2026-09-01');
    expect(resolveLastmod('docs/new.md', dates, '2026-01-01')).toBe('2026-01-01');
  });
});
