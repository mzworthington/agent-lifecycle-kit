import { useEffect } from 'react';
import { findPublishedPage } from '../docs/pages.ts';
import { applyDocumentHead } from './applyDocumentHead.ts';
import { resolvePageSeo } from './siteSeo.ts';

/** Keep document head in sync with the active client route. */
export function usePageSeo(pathname: string): void {
  useEffect(() => {
    const page = findPublishedPage(pathname);
    applyDocumentHead(
      resolvePageSeo(pathname, {
        headline: page?.title,
        markdown: page?.markdown,
        file: page?.file
      })
    );
  }, [pathname]);
}
