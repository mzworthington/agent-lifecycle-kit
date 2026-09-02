import { Link, useLocation } from 'wouter';
import { DocsShell } from '../components/DocsShell';
import { MarkdownView } from '../components/MarkdownView';
import { docsNeighbors, findPublishedPage } from '../docs/pages';
import { docsToc } from '../docs/outline';
import { resolvePageSeo } from '../seo/siteSeo.ts';

export function DocsPage() {
  const [location] = useLocation();
  const pathname = location.replace(/\/$/, '') || '/';
  const page = findPublishedPage(pathname);

  if (!page) {
    return (
      <DocsShell>
        <article className="docs-panel">
          <h1>That page is not here</h1>
          <p>
            Try the <Link href="/">home page</Link> or the <Link href="/docs">docs overview</Link>.
          </p>
        </article>
      </DocsShell>
    );
  }

  const toc = docsToc(page.markdown).filter((item) => item.level === 2);
  const { prev, next } = docsNeighbors(page.path);
  const wide = page.path === '/docs/map';
  const crumbs = resolvePageSeo(page.path, {
    headline: page.title,
    markdown: page.markdown,
    file: page.file
  }).breadcrumbs;

  return (
    <DocsShell wide={wide}>
      <article className={`docs-panel${wide ? ' docs-panel--wide' : ''}`}>
        {crumbs.length > 1 ? (
          <nav className="docs-breadcrumb" aria-label="Breadcrumb">
            <ol>
              {crumbs.map((crumb, index) => {
                const last = index === crumbs.length - 1;
                return (
                  <li key={crumb.path}>
                    {last ? (
                      <span aria-current="page">{crumb.name}</span>
                    ) : (
                      <Link href={crumb.path}>{crumb.name}</Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        ) : null}
        <MarkdownView markdown={page.markdown} fromDir={page.dir} />
        {prev || next ? (
          <nav className="docs-pager" aria-label="Nearby pages">
            {prev ? (
              <Link href={prev.path} className="docs-pager-prev">
                <span>Previous</span>
                {prev.label}
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link href={next.path} className="docs-pager-next">
                <span>Next</span>
                {next.label}
              </Link>
            ) : null}
          </nav>
        ) : null}
        <p className="docs-source">
          <a href={`/${page.file}`}>Markdown source</a>
        </p>
      </article>
      {toc.length > 1 && !wide ? (
        <nav className="docs-toc" aria-label="On this page">
          <p className="docs-toc-title">On this page</p>
          <ol>
            {toc.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`}>{item.label}</a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
    </DocsShell>
  );
}
