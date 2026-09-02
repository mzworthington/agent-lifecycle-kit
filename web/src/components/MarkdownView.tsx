import { Children, isValidElement, lazy, Suspense, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link } from 'wouter';
import { DOC_PATHS } from '../docs/pages';
import { splitDocsMarkdown } from '../docs/presentDocsMarkdown';
import { resolveDocsHref } from '../docs/resolveDocsHref';
import { DocsFrontmatterMeta } from './DocsFrontmatterMeta';
import { EvalDemo } from './EvalDemo';
import { HomeCtas } from './HomeCtas';
import { OntologyExplorer } from './OntologyExplorer';
import { TodayJobs } from './TodayJobs';
import { headingId } from '../docs/outline';

const MermaidPreview = lazy(() =>
  import('./MermaidPreview').then((m) => ({ default: m.MermaidPreview }))
);

type Props = {
  markdown: string;
  fromDir: string;
};

function extractCodeText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractCodeText).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return extractCodeText(node.props.children);
  }
  return '';
}

function Widget({ name }: { name: string }) {
  if (name === 'today-jobs') return <TodayJobs />;
  if (name === 'demo') return <EvalDemo />;
  if (name === 'ontology') return <OntologyExplorer />;
  if (name === 'ctas') return <HomeCtas />;
  return null;
}

export function MarkdownView({ markdown, fromDir }: Props) {
  const { frontmatter, body } = splitDocsMarkdown(markdown);
  const headingCounts = new Map<string, number>();

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
            const resolved = resolveDocsHref(href, fromDir, DOC_PATHS);
            if (resolved) {
              if (resolved.startsWith('#')) {
                return <a href={resolved}>{children}</a>;
              }
              return (
                <Link href={resolved} className="docs-link">
                  {children}
                </Link>
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
            if (/\blanguage-widget\b/.test(className)) {
              const name = extractCodeText(codeEl).replace(/\n$/, '').trim();
              return <Widget name={name} />;
            }
            if (/\blanguage-mermaid\b/.test(className)) {
              const code = extractCodeText(codeEl).replace(/\n$/, '');
              return (
                <Suspense
                  fallback={
                    <div className="docs-mermaid docs-mermaid-loading" aria-busy="true">
                      Loading diagram…
                    </div>
                  }
                >
                  <MermaidPreview code={code} />
                </Suspense>
              );
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
