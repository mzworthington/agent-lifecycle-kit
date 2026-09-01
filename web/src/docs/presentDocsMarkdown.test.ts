import { describe, expect, it } from 'vitest';
import { presentDocsMarkdown, splitDocsMarkdown } from './presentDocsMarkdown';

describe('splitDocsMarkdown', () => {
  it('parses frontmatter fields and returns the body without fences', () => {
    const { frontmatter, body } = splitDocsMarkdown(
      "---\nstatus: Accepted\ndate: 2026-09-01\ndeciders: ['kit maintainers']\n---\n\n# Title\n"
    );
    expect(frontmatter).toEqual({
      status: 'Accepted',
      date: '2026-09-01',
      deciders: 'kit maintainers'
    });
    expect(body).toContain('# Title');
    expect(presentDocsMarkdown('---\nstatus: Accepted\n---\n\n# Title\n')).toBe('\n# Title\n');
  });

  it('leaves markdown without frontmatter unchanged', () => {
    expect(splitDocsMarkdown('# Hello\n')).toEqual({ frontmatter: null, body: '# Hello\n' });
  });
});
