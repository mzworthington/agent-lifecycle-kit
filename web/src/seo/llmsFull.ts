import { SITE_NAME, SITE_ORIGIN } from './siteSeo.ts';

/**
 * One file with the full text of every published page. `llms.txt` is the short
 * index; this is the corpus, for crawlers that would rather not follow links.
 */

export type LlmsFullDoc = {
  /** Route of the rendered page, e.g. `/docs/edd`. */
  path: string;
  /** Repo-relative Markdown source, e.g. `docs/edd.md`. */
  file: string;
  title: string;
  markdown: string;
};

function stripFrontmatter(markdown: string): string {
  return markdown.replace(/^---[\s\S]*?\n---\s*/, '');
}

export function buildLlmsFull(docs: readonly LlmsFullDoc[]): string {
  const header = `# ${SITE_NAME} - full text

> Every public page of ${SITE_ORIGIN}/ in one file: Eval-Driven Development guides, operator docs, SOPs, eval write-ups, and the kit ontology. Each section starts with the canonical URL of the page it came from.

> Shorter index: ${SITE_ORIGIN}/llms.txt. Machine sitemap: ${SITE_ORIGIN}/sitemap.xml.
`;

  const sections = docs.map(
    (doc) => `---
title: ${doc.title}
url: ${SITE_ORIGIN}${doc.path}
markdown: ${SITE_ORIGIN}/${doc.file}
---

${stripFrontmatter(doc.markdown).trim()}
`
  );

  return [header, ...sections].join('\n');
}

/** Every link target in an `llms.txt`, for drift checks against the published tree. */
export function extractLlmsLinks(llmsTxt: string): string[] {
  return [...llmsTxt.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)].map((match) => match[1]);
}
