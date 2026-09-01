import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildLlmsFull, extractLlmsLinks, type LlmsDoc } from './llms.js';

const docs: LlmsDoc[] = [
  {
    urlPath: '/docs/edd.html',
    sourceUrlPath: '/docs/edd.md',
    title: 'Eval-Driven Development',
    markdown: '# Eval-Driven Development\n\nRed, green, refactor.\n'
  },
  {
    urlPath: '/SOPs/release.html',
    sourceUrlPath: '/SOPs/release.md',
    title: 'Release checklist',
    markdown: '---\ntitle: Release checklist\nkind: sop\n---\n# SOP: Release\n\nShip it.\n'
  }
];

describe('extractLlmsLinks', () => {
  it('pulls every Markdown link target', () => {
    const links = extractLlmsLinks('- [Home](https://x.dev/)\n- [Guide](https://x.dev/docs/edd.html)\n');
    assert.deepEqual(links, ['https://x.dev/', 'https://x.dev/docs/edd.html']);
  });
});

describe('buildLlmsFull', () => {
  const out = buildLlmsFull(docs);

  it('opens with a header pointing at the shorter index and the sitemap', () => {
    assert.match(out, /^# Agent Lifecycle Kit - full text/);
    assert.match(out, /https:\/\/eval-driven-development\.dev\/llms\.txt/);
    assert.match(out, /https:\/\/eval-driven-development\.dev\/sitemap\.xml/);
  });

  it('attaches the canonical HTML and Markdown URL to each section', () => {
    assert.match(out, /url: https:\/\/eval-driven-development\.dev\/docs\/edd\.html/);
    assert.match(out, /markdown: https:\/\/eval-driven-development\.dev\/docs\/edd\.md/);
  });

  it('includes the full body and drops YAML frontmatter', () => {
    assert.match(out, /Red, green, refactor\./);
    assert.match(out, /Ship it\./);
    assert.doesNotMatch(out, /kind: sop/);
  });

  it('keeps the order the caller passed', () => {
    assert.ok(out.indexOf('/docs/edd.html') < out.indexOf('/SOPs/release.html'));
  });
});
