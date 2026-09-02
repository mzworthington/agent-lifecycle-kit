import { Children, isValidElement, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { headingId } from '../docs/outline';
import { splitDocsMarkdown } from '../docs/presentDocsMarkdown';
import { resolveDocsHref } from '../docs/resolveDocsHref';
import { DocsFrontmatterMeta } from './DocsFrontmatterMeta';

type Props = {
  markdown: string;
  fromDir: string;
  docPaths: readonly string[];
  headingStart?: Record<string, number>;
};

function extractCodeText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractCodeText).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return extractCodeText(node.props.children);
  }
  return '';
}

export function MarkdownView({ markdown, fromDir, docPaths, headingStart }: Props) {
  const { frontmatter, body } = splitDocsMarkdown(markdown);
  const headingCounts = new Map(Object.entries(headingStart ?? {}));
  const knownPaths = new Set(docPaths);

  return (
    <div className="docs-prose docs-content">
      {frontmatter ? <DocsFrontmatterMeta fields={frontmatter} /> : null}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => {
            const text = extractCodeText(children);
            const id = headingId(text, headingCounts);
            return <h1 id={id}>{children}</h1>;
          },
          h2: ({ children }) => {
            const text = extractCodeText(children);
            const id = headingId(text, headingCounts);
            return <h2 id={id}>{children}</h2>;
          },
          h3: ({ children }) => {
            const text = extractCodeText(children);
            const id = headingId(text, headingCounts);
            return <h3 id={id}>{children}</h3>;
          },
          a: ({ href, children }) => {
            const resolved = resolveDocsHref(href, fromDir, knownPaths);
            if (resolved) {
              if (resolved.startsWith('#')) {
                return <a href={resolved}>{children}</a>;
              }
              return (
                <a href={resolved} className="docs-link">
                  {children}
                </a>
              );
            }
            return (
              <a
                href={href}
                target={href?.startsWith('http') ? '_blank' : undefined}
                rel={href?.startsWith('http') ? 'noreferrer' : undefined}
              >
                {children}
              </a>
            );
          },
          pre: ({ children }) => {
            const codeEl = Children.toArray(children).find((child) => isValidElement(child));
            const className =
              isValidElement<{ className?: string }>(codeEl) && codeEl.props.className
                ? codeEl.props.className
                : '';
            if (/\blanguage-widget\b/.test(className) || /\blanguage-mermaid\b/.test(className)) {
              return null;
            }
            return (
              <figure className="docs-code">
                <pre>{children}</pre>
              </figure>
            );
          },
          table: ({ children }) => (
            <div className="table-wrapper">
              <table>{children}</table>
            </div>
          )
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}
