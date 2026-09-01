import { describe, expect, it } from 'vitest';
import { resolveDocsHref } from './resolveDocsHref';

const known = new Set(['/docs/edd', '/docs/kit', '/docs/ADRs', '/SOPs/context-budget']);

describe('resolveDocsHref', () => {
  it('resolves relative markdown links from a docs directory', () => {
    expect(resolveDocsHref('./kit.md', 'docs', known)).toBe('/docs/kit');
    expect(resolveDocsHref('../SOPs/context-budget.md', 'docs', known)).toBe(
      '/SOPs/context-budget'
    );
    expect(resolveDocsHref('./0001-hexagonal.md', 'docs/ADRs', known)).toBeNull();
  });

  it('maps README and hash fragments', () => {
    expect(resolveDocsHref('./ADRs/README.md', 'docs', known)).toBe('/docs/ADRs');
    expect(resolveDocsHref('./edd.md#loop', 'docs', known)).toBe('/docs/edd#loop');
    expect(resolveDocsHref('#today', 'docs', known)).toBe('#today');
  });

  it('leaves unknown and external hrefs to the browser', () => {
    expect(resolveDocsHref('https://github.com/x', 'docs', known)).toBeNull();
    expect(resolveDocsHref('./evals/edd/demo.yaml', 'docs', known)).toBeNull();
  });
});
