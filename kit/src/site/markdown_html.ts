import { marked } from 'marked';
import {
  githubBlobUrl,
  htmlOutputPath,
  isExternalHref,
  publicUrlPath,
  resolveRelativePath
} from './urls.js';

/** Markdown -> HTML body for the published docs. Pure: callers supply the published file set. */

export interface DocMeta {
  title: string;
  description: string;
}

export interface LinkContext {
  /** Repo-relative path of the Markdown source being rendered. */
  fromRel: string;
  /** Files that exist in the assembled Pages tree (raw assets, Markdown, rendered HTML). */
  publishedFiles: ReadonlySet<string>;
  /** Markdown sources that get an HTML rendering, so `.md` links can point at the page. */
  renderedMarkdown: ReadonlySet<string>;
}

export interface TocEntry {
  id: string;
  text: string;
  depth: number;
}

export interface RenderedBody {
  html: string;
  toc: TocEntry[];
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function stripFrontmatter(markdown: string): { body: string; frontmatter: string } {
  const match = FRONTMATTER.exec(markdown);
  if (!match) return { body: markdown, frontmatter: '' };
  return { body: markdown.slice(match[0].length), frontmatter: match[1] };
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Flatten inline Markdown to plain prose for titles, descriptions, and TOC labels. */
export function plainText(markdown: string): string {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1$2')
    .replace(/_{1,2}([^_]+)_{1,2}/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Prefer a whole sentence, fall back to a word boundary, so snippets do not end mid-clause. */
export function truncateDescription(text: string, limit = 158): string {
  if (text.length <= limit) return text;
  const clipped = text.slice(0, limit);
  const lastSentence = Math.max(clipped.lastIndexOf('. '), clipped.lastIndexOf('? '), clipped.lastIndexOf('! '));
  if (lastSentence > 80) return clipped.slice(0, lastSentence + 1);
  const lastSpace = clipped.lastIndexOf(' ');
  return `${clipped.slice(0, lastSpace > 60 ? lastSpace : limit).replace(/[,;:.\s]+$/, '')}…`;
}

function frontmatterTitle(frontmatter: string): string | undefined {
  const line = /^title:\s*(.+)$/m.exec(frontmatter);
  return line ? line[1].trim().replace(/^["']|["']$/g, '') : undefined;
}

/** Title from frontmatter or the first heading; description from the first real paragraph. */
export function extractDocMeta(markdown: string, fallbackTitle: string): DocMeta {
  const { body, frontmatter } = stripFrontmatter(markdown);
  const heading = /^#\s+(.+)$/m.exec(body);
  const title = frontmatterTitle(frontmatter) ?? (heading ? plainText(heading[1]) : fallbackTitle);

  const afterHeading = heading ? body.slice(body.indexOf(heading[0]) + heading[0].length) : body;
  const paragraph = afterHeading
    .split(/\r?\n\r?\n/)
    .map((block) => block.trim())
    .find(
      (block) =>
        block.length > 0 &&
        !block.startsWith('#') &&
        !block.startsWith('>') &&
        !block.startsWith('|') &&
        !block.startsWith('```') &&
        !/^[-*+]\s/.test(block) &&
        !/^\d+\.\s/.test(block) &&
        plainText(block).length > 0
    );

  return {
    title,
    description: paragraph ? truncateDescription(plainText(paragraph)) : `${title} - ${'Agent Lifecycle Kit'}`
  };
}

export function slugify(text: string): string {
  return plainText(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Map a Markdown link to the published page, the raw published file, or GitHub. */
export function resolveDocHref(href: string, ctx: LinkContext): string {
  if (href.length === 0 || href.startsWith('#') || href.startsWith('/') || isExternalHref(href)) {
    return href;
  }
  const [pathPart, ...suffixParts] = href.split(/(?=[#?])/);
  const suffix = suffixParts.join('');
  const target = resolveRelativePath(ctx.fromRel, pathPart);
  if (target.length === 0) return href;
  if (ctx.renderedMarkdown.has(target)) {
    return `${publicUrlPath(htmlOutputPath(target))}${suffix}`;
  }
  if (ctx.publishedFiles.has(target)) {
    return `${publicUrlPath(target)}${suffix}`;
  }
  return `${githubBlobUrl(target)}${suffix}`;
}

function rewriteHrefs(html: string, ctx: LinkContext): string {
  return html.replace(/href="([^"]*)"/g, (_match, href: string) => {
    const decoded = href.replace(/&amp;/g, '&');
    return `href="${escapeHtml(resolveDocHref(decoded, ctx)).replace(/&#39;/g, "'")}"`;
  });
}

function addHeadingIds(html: string): { html: string; toc: TocEntry[] } {
  const toc: TocEntry[] = [];
  const used = new Map<string, number>();
  const out = html.replace(
    /<h([1-6])>([\s\S]*?)<\/h\1>/g,
    (_match, level: string, inner: string) => {
      const depth = Number(level);
      const text = plainText(inner);
      const base = slugify(text) || `section-${toc.length + 1}`;
      const seen = used.get(base) ?? 0;
      used.set(base, seen + 1);
      const id = seen === 0 ? base : `${base}-${seen + 1}`;
      if (depth === 2 || depth === 3) toc.push({ id, text, depth });
      return `<h${depth} id="${id}">${inner}<a class="heading-anchor" href="#${id}" aria-label="Link to this section">#</a></h${depth}>`;
    }
  );
  return { html: out, toc };
}

function wrapTables(html: string): string {
  return html.replace(/<table>[\s\S]*?<\/table>/g, (table) => `<div class="table-wrapper">${table}</div>`);
}

/** Mermaid fences stay readable without JS and upgrade to diagrams when the CDN script loads. */
function upgradeMermaidBlocks(html: string): string {
  return html.replace(
    /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
    (_match, code: string) => `<pre class="mermaid">${code}</pre>`
  );
}

export function renderMarkdownBody(markdown: string, ctx: LinkContext): RenderedBody {
  const { body } = stripFrontmatter(markdown);
  const parsed = marked.parse(body, { gfm: true, async: false }) as string;
  const linked = rewriteHrefs(parsed, ctx);
  const { html, toc } = addHeadingIds(linked);
  return { html: upgradeMermaidBlocks(wrapTables(html)).trim(), toc };
}
