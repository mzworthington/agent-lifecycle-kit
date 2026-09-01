import { Link, useLocation } from 'wouter';
import { type ReactNode, useState } from 'react';
import { docsSidebar, isDocsNavActive, SITE_NAV } from '../docs/pages';

const GITHUB = 'https://github.com/mzworthington/agent-lifecycle-kit';

type Props = {
  children: ReactNode;
  layout?: 'docs' | 'landing';
  wide?: boolean;
};

export function DocsShell({ children, layout = 'docs', wide = false }: Props) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const sidebar = docsSidebar(location);
  const isLanding = layout === 'landing';

  return (
    <div className={`site${isLanding ? ' site--landing' : ''}`}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="nav-container">
          <Link href="/" className="brand">
            <picture>
              <source srcSet="/assets/kit_logo_256.webp" type="image/webp" />
              <img src="/assets/kit_logo.png" alt="" width={36} height={36} />
            </picture>
            <span>Agent Lifecycle Kit</span>
          </Link>
          <nav id="site-nav" className={`nav-links${open ? ' is-open' : ''}`} aria-label="Site">
            <ul>
              {SITE_NAV.map((item) => {
                const active = isDocsNavActive(location, item);
                return (
                  <li key={item.path}>
                    <Link
                      href={item.path}
                      className={`nav-link${active ? ' is-active' : ''}`}
                      aria-current={active ? 'page' : undefined}
                      onClick={() => setOpen(false)}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <a href={GITHUB} className="btn-github" rel="noopener noreferrer">
            GitHub
          </a>
          <button
            type="button"
            className="nav-toggle"
            aria-controls="site-nav"
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((value) => !value)}
          >
            <span className="nav-toggle-bar" aria-hidden="true" />
            <span className="nav-toggle-bar" aria-hidden="true" />
            <span className="nav-toggle-bar" aria-hidden="true" />
          </button>
        </div>
      </header>
      {!isLanding ? (
        <nav className="docs-mobile-nav" aria-label="Documentation chapters">
          {sidebar.map((section) => (
            <nav key={section.title} className="docs-mobile-group" aria-label={section.title}>
              <p className="docs-mobile-label">{section.title}</p>
              <ul>
                {section.items.map((item) => {
                  const active = location === item.path;
                  return (
                    <li key={item.path}>
                      <Link href={item.path} className={active ? 'is-active' : undefined}>
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          ))}
        </nav>
      ) : null}
      <div
        className={
          isLanding ? 'landing-shell' : `docs-shell${wide ? ' docs-shell--wide' : ''}`
        }
      >
        {!isLanding ? (
          <aside className="docs-sidebar" aria-label="Documentation">
            {sidebar.map((section) => (
              <section key={section.title} aria-labelledby={`nav-${section.title}`}>
                <h2 id={`nav-${section.title}`} className="docs-sidebar-title">
                  {section.title}
                </h2>
                <ul className="docs-nav">
                  {section.items.map((item) => {
                    const active = location === item.path;
                    return (
                      <li key={item.path}>
                        <Link
                          href={item.path}
                          className={active ? 'is-active' : undefined}
                          aria-current={active ? 'page' : undefined}
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </aside>
        ) : null}
        <main id="main">{children}</main>
      </div>
      <footer className="site-footer">
        <nav aria-label="Footer">
          <ul>
            <li>
              <Link href="/docs/start">Start</Link>
            </li>
            <li>
              <Link href="/docs">Guide</Link>
            </li>
            <li>
              <Link href="/evals/edd">Evals</Link>
            </li>
            <li>
              <Link href="/docs/map">Map</Link>
            </li>
            <li>
              <a href={GITHUB} rel="noopener noreferrer">
                GitHub
              </a>
            </li>
          </ul>
        </nav>
        <p>
          Made by{' '}
          <a href="https://mzworthington.co.uk" rel="noopener noreferrer">
            Matthew Z Worthington
          </a>
        </p>
      </footer>
    </div>
  );
}
