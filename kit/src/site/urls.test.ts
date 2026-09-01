import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  absoluteUrl,
  githubBlobUrl,
  htmlOutputPath,
  isExternalHref,
  publicUrlPath,
  resolveRelativePath,
  sectionLabelFor,
  sectionUrlPathFor,
  SITE_ORIGIN
} from './urls.js';

describe('htmlOutputPath', () => {
  it('renders a doc beside its Markdown source', () => {
    assert.equal(htmlOutputPath('docs/edd.md'), 'docs/edd.html');
    assert.equal(htmlOutputPath('SOPs/context-budget.md'), 'SOPs/context-budget.html');
  });

  it('renders README as the directory index so /docs/ resolves', () => {
    assert.equal(htmlOutputPath('docs/README.md'), 'docs/index.html');
    assert.equal(htmlOutputPath('evals/edd/README.md'), 'evals/edd/index.html');
    assert.equal(htmlOutputPath('mcps/README.md'), 'mcps/index.html');
  });
});

describe('publicUrlPath', () => {
  it('maps index pages to directory URLs', () => {
    assert.equal(publicUrlPath('index.html'), '/');
    assert.equal(publicUrlPath('docs/index.html'), '/docs/');
    assert.equal(publicUrlPath('evals/edd/index.html'), '/evals/edd/');
  });

  it('keeps leaf pages and raw files at their path', () => {
    assert.equal(publicUrlPath('docs/edd.html'), '/docs/edd.html');
    assert.equal(publicUrlPath('llms.txt'), '/llms.txt');
    assert.equal(absoluteUrl('/docs/edd.html'), `${SITE_ORIGIN}/docs/edd.html`);
  });
});

describe('resolveRelativePath', () => {
  it('resolves sibling, parent, and same-directory links', () => {
    assert.equal(resolveRelativePath('docs/edd.md', './kit.md'), 'docs/kit.md');
    assert.equal(resolveRelativePath('docs/edd.md', '../SOPs/release.md'), 'SOPs/release.md');
    assert.equal(resolveRelativePath('docs/ADRs/0001-x.md', '../../README.md'), 'README.md');
    assert.equal(resolveRelativePath('SOPs/release.md', 'context-budget.md'), 'SOPs/context-budget.md');
  });
});

describe('isExternalHref', () => {
  it('detects absolute and protocol-relative links', () => {
    assert.ok(isExternalHref('https://example.com'));
    assert.ok(isExternalHref('mailto:a@b.c'));
    assert.ok(isExternalHref('//cdn.example.com/x.js'));
    assert.ok(!isExternalHref('./kit.md'));
    assert.ok(!isExternalHref('../SOPs/release.md'));
  });
});

describe('sections', () => {
  it('labels docs, SOPs, evals, ontology, and MCP paths', () => {
    assert.equal(sectionLabelFor('docs/edd.md'), 'Docs');
    assert.equal(sectionLabelFor('docs/ADRs/0001-x.md'), 'Architecture decisions');
    assert.equal(sectionLabelFor('SOPs/release.md'), 'SOPs');
    assert.equal(sectionLabelFor('evals/edd/README.md'), 'Evals');
    assert.equal(sectionLabelFor('index.html'), undefined);
    assert.equal(sectionUrlPathFor('SOPs/release.md'), '/SOPs/');
  });
});

describe('githubBlobUrl', () => {
  it('points unpublished repo paths at the GitHub blob view', () => {
    assert.equal(
      githubBlobUrl('skills/agent-tdd/SKILL.md'),
      'https://github.com/mzworthington/agent-lifecycle-kit/blob/main/skills/agent-tdd/SKILL.md'
    );
  });
});
