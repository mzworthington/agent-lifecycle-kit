import { stripFrontmatter } from './markdown_html.js';
import { absoluteUrl, SITE_NAME } from './urls.js';

/** Machine-readable text indexes for LLM crawlers. Pure - callers read the files. */

export interface LlmsDoc {
  /** Canonical HTML URL path of the rendered page. */
  urlPath: string;
  /** URL path of the Markdown source. */
  sourceUrlPath: string;
  title: string;
  markdown: string;
}

/** Every link target in an `llms.txt` file, for drift checks against the published tree. */
export function extractLlmsLinks(llmsTxt: string): string[] {
  return [...llmsTxt.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)].map((match) => match[1]);
}

/**
 * One file with the full text of every published page. Crawlers that cannot follow
 * links (or would rather not) get the whole corpus with canonical URLs attached.
 */
export function buildLlmsFull(docs: readonly LlmsDoc[]): string {
  const header = `# ${SITE_NAME} - full text

> Every public page of ${absoluteUrl('/')} in one file: Eval-Driven Development guides, operator docs, SOPs, eval suites, and the kit ontology. Each section starts with the canonical URL of the page it came from.

> Shorter index: ${absoluteUrl('/llms.txt')}. Machine sitemap: ${absoluteUrl('/sitemap.xml')}.
`;

  const sections = docs.map((doc) => {
    const body = stripFrontmatter(doc.markdown).body.trim();
    return `---
title: ${doc.title}
url: ${absoluteUrl(doc.urlPath)}
markdown: ${absoluteUrl(doc.sourceUrlPath)}
---

${body}
`;
  });

  return [header, ...sections].join('\n');
}
