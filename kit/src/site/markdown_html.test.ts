import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  extractDocMeta,
  plainText,
  renderMarkdownBody,
  resolveDocHref,
  slugify,
  stripFrontmatter,
  truncateDescription,
  type LinkContext
} from './markdown_html.js';

const ctx: LinkContext = {
  fromRel: 'docs/edd.md',
  publishedFiles: new Set(['docs/edd.md', 'docs/kit.md', 'SOPs/release.md', 'evals/edd/demo.yaml']),
  renderedMarkdown: new Set(['docs/edd.md', 'docs/kit.md', 'docs/README.md', 'SOPs/release.md'])
};

describe('stripFrontmatter', () => {
  it('separates YAML frontmatter from the body', () => {
    const { body, frontmatter } = stripFrontmatter('---\ntitle: Release checklist\nkind: sop\n---\n# Heading\n');
    assert.equal(body, '# Heading\n');
    assert.match(frontmatter, /kind: sop/);
  });

  it('leaves plain Markdown untouched', () => {
    assert.equal(stripFrontmatter('# Heading\n').body, '# Heading\n');
  });
});

describe('extractDocMeta', () => {
  it('takes the title from the H1 and the description from the first paragraph', () => {
    const meta = extractDocMeta('# Eval-Driven Development\n\nEDD treats prompts as `contracts`.\n', 'fallback');
    assert.equal(meta.title, 'Eval-Driven Development');
    assert.equal(meta.description, 'EDD treats prompts as contracts.');
  });

  it('prefers the frontmatter title used by SOPs', () => {
    const meta = extractDocMeta('---\ntitle: Release checklist\n---\n# SOP: Release\n\nShip it.\n', 'fallback');
    assert.equal(meta.title, 'Release checklist');
  });

  it('skips lists, quotes, and tables when picking a description', () => {
    const meta = extractDocMeta('# T\n\n> quote\n\n- bullet\n\n| a |\n|---|\n\nReal prose here.\n', 'fallback');
    assert.equal(meta.description, 'Real prose here.');
  });

  it('falls back to the supplied title when there is no heading', () => {
    assert.equal(extractDocMeta('just text\n', 'Fallback').title, 'Fallback');
  });
});

describe('truncateDescription', () => {
  it('clips long prose on a word boundary', () => {
    const long = `${'word '.repeat(60)}end`;
    const out = truncateDescription(long);
    assert.ok(out.length <= 159, out.length.toString());
    assert.ok(out.endsWith('…'));
    assert.ok(!out.includes('  '));
  });

  it('ends on a sentence when one fits', () => {
    const text =
      'Connecting an LLM to MCP tools turns a chatbot into a decision-maker. Failures rarely look like stack traces. They look like a wrong tool, a hallucinated parameter, or an infinite retry loop.';
    assert.equal(
      truncateDescription(text),
      'Connecting an LLM to MCP tools turns a chatbot into a decision-maker. Failures rarely look like stack traces.'
    );
  });

  it('leaves short prose alone', () => {
    assert.equal(truncateDescription('Short enough.'), 'Short enough.');
  });
});

describe('plainText and slugify', () => {
  it('flattens inline Markdown', () => {
    assert.equal(plainText('**Bold** `code` and [a link](./x.md)'), 'Bold code and a link');
  });

  it('slugifies headings for anchors', () => {
    assert.equal(slugify('The loop (same shape as TDD)'), 'the-loop-same-shape-as-tdd');
    assert.equal(slugify('`kit check`'), 'kit-check');
  });
});

describe('resolveDocHref', () => {
  it('points Markdown links at the rendered HTML page', () => {
    assert.equal(resolveDocHref('./kit.md', ctx), '/docs/kit.html');
    assert.equal(resolveDocHref('../SOPs/release.md', ctx), '/SOPs/release.html');
  });

  it('keeps anchors on rewritten links', () => {
    assert.equal(resolveDocHref('../SOPs/release.md#gates', ctx), '/SOPs/release.html#gates');
  });

  it('maps a README link to the directory index URL', () => {
    assert.equal(resolveDocHref('./README.md', ctx), '/docs/');
  });

  it('keeps published non-Markdown files at their raw URL', () => {
    assert.equal(resolveDocHref('../evals/edd/demo.yaml', ctx), '/evals/edd/demo.yaml');
  });

  it('sends unpublished repo paths to GitHub so links do not 404', () => {
    assert.equal(
      resolveDocHref('../skills/agent-tdd/SKILL.md', ctx),
      'https://github.com/mzworthington/agent-lifecycle-kit/blob/main/skills/agent-tdd/SKILL.md'
    );
  });

  it('leaves external, root-absolute, and in-page links alone', () => {
    assert.equal(resolveDocHref('https://example.com/x', ctx), 'https://example.com/x');
    assert.equal(resolveDocHref('/docs/kit.html', ctx), '/docs/kit.html');
    assert.equal(resolveDocHref('#the-loop', ctx), '#the-loop');
  });
});

describe('renderMarkdownBody', () => {
  const markdown = [
    '# Title',
    '',
    'Intro with a [sibling](./kit.md) link.',
    '',
    '## First section',
    '',
    '| a | b |',
    '|---|---|',
    '| 1 | 2 |',
    '',
    '```mermaid',
    'flowchart LR',
    '  a --> b',
    '```',
    '',
    '### Nested heading',
    '',
    '```bash',
    'kit check',
    '```',
    ''
  ].join('\n');

  it('adds heading ids and a table of contents for h2/h3', () => {
    const { html, toc } = renderMarkdownBody(markdown, ctx);
    assert.match(html, /<h2 id="first-section">/);
    assert.match(html, /<h3 id="nested-heading">/);
    assert.deepEqual(toc, [
      { id: 'first-section', text: 'First section', depth: 2 },
      { id: 'nested-heading', text: 'Nested heading', depth: 3 }
    ]);
  });

  it('rewrites relative Markdown links to published page URLs', () => {
    assert.match(renderMarkdownBody(markdown, ctx).html, /href="\/docs\/kit\.html"/);
  });

  it('wraps tables so wide content scrolls instead of breaking layout', () => {
    assert.match(renderMarkdownBody(markdown, ctx).html, /<div class="table-wrapper"><table>/);
  });

  it('turns mermaid fences into mermaid blocks that still read as text', () => {
    const { html } = renderMarkdownBody(markdown, ctx);
    assert.match(html, /<pre class="mermaid">flowchart LR/);
    assert.doesNotMatch(html, /language-mermaid/);
    assert.match(html, /<code class="language-bash">/);
  });

  it('de-duplicates repeated heading slugs', () => {
    const { toc } = renderMarkdownBody('## Same\n\n## Same\n', ctx);
    assert.deepEqual(
      toc.map((t) => t.id),
      ['same', 'same-2']
    );
  });
});
