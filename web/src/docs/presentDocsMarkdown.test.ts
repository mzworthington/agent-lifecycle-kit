import { describe, expect, it } from 'vitest';
import { presentDocsMarkdown, splitDocsMarkdown, splitFenceSegments } from './presentDocsMarkdown';

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

describe('splitFenceSegments', () => {
  it('keeps ordinary markdown as one segment and lifts widget and mermaid fences', () => {
    const segments = splitFenceSegments(
      '# Title\n\nHello\n\n```widget\nontology\n```\n\nMore\n\n```mermaid\nflowchart LR\n  a --> b\n```\n\n```bash\nkit check\n```\n'
    );
    expect(segments).toEqual([
      { kind: 'markdown', text: '# Title\n\nHello\n' },
      { kind: 'widget', name: 'ontology' },
      { kind: 'markdown', text: '\nMore\n' },
      { kind: 'mermaid', code: 'flowchart LR\n  a --> b' },
      { kind: 'markdown', text: '\n```bash\nkit check\n```\n' }
    ]);
  });
});
