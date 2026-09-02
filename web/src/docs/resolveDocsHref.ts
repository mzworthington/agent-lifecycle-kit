/**
 * Resolve a Markdown href to an in-app route when the target is a published
 * docs page (including SOPs and eval write-ups).
 */
export function resolveDocsHref(
  href: string | undefined,
  fromDir: string,
  knownPaths: ReadonlySet<string>
): string | null {
  if (!href || href.startsWith('mailto:') || /^[a-z]+:\/\//i.test(href)) {
    return null;
  }
  if (href.startsWith('#')) return href;

  const hashIndex = href.indexOf('#');
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : '';
  let target = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  if (!target) return hash || null;

  if (target.endsWith('.html')) {
    target = target.replace(/\.html$/, '');
  }

  let joined: string;
  if (target.startsWith('/')) {
    joined = target.replace(/\/$/, '') || '/';
    joined = joined.replace(/\.md$/i, '');
  } else {
    const baseSegments = fromDir ? fromDir.split('/').filter(Boolean) : [];
    for (const part of target.split('/')) {
      if (part === '.' || part === '') continue;
      if (part === '..') {
        baseSegments.pop();
        continue;
      }
      baseSegments.push(part);
    }
    joined = `/${baseSegments.join('/')}`;
    joined = joined.replace(/\.md$/i, '');
    joined = joined.replace(/\/$/, '') || '/';
  }

  if (joined.endsWith('/index')) {
    joined = joined.slice(0, -'/index'.length) || '/';
  }
  if (joined.endsWith('/README') || joined === '/README') {
    joined = joined.replace(/\/?README$/i, '') || '/';
  }

  if (joined === '/' || knownPaths.has(joined)) {
    return `${joined}${hash}`;
  }
  return null;
}
