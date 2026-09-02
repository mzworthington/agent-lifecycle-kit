---
title: Search visibility - crawlability, indexing, and verification
kind: sop
triggers:
  - seo
  - search console
  - sitemap
  - robots.txt
  - crawlability
  - indexing
tools:
  - shell
---
# Standard Operating Procedure: Search visibility

The public site is a Vite/React app ([ADR 0006](../docs/ADRs/0006-vite-markdown-docs-site.md)) deployed to GitHub Pages. A SPA is invisible to a crawler that does not execute JavaScript, so the crawl surface is a **build output**, not something to hand-maintain: `emitSiteSeo` prerenders a real HTML file per route and derives the machine indexes from the same route list.

## What the build guarantees

| Artifact | Produced by | Why it exists |
|----------|-------------|---------------|
| `<route>/index.html` per published Markdown file | `web/vite/emitSiteSeo.ts` | A crawlable document with a unique title, description, canonical URL, Open Graph tags, and JSON-LD, before any JavaScript runs |
| `sitemap.xml` | derived from the same route list | Every route, with `lastmod` from git history and priority by section |
| `llms-full.txt` | concatenated Markdown corpus | One file with every page for model crawlers; `llms.txt` stays the short index |
| Raw `.md` next to every route | `overlayKitPublic` in `kit/src/site/assemble.ts` | Agents read Markdown directly and do not depend on the SPA |
| `CNAME`, `.nojekyll` | `overlayKitPublic` | Custom domain. DNS lives in [edge-dns](https://github.com/mzworthington/edge-dns) |

Rules the build enforces, covered by tests in `web/src/seo` and `kit/src/site`:

- **Freshness comes from git, not the build clock.** A build date on every URL tells a crawler nothing, because everything looks equally new on every deploy.
- **Priority follows reader value.** Hubs and guides rank above procedures; decision records rank last.
- **HTML is canonical.** Markdown stays published and is linked as `rel="alternate"`, so the two representations do not compete.
- **Structured data matches the page.** Doc routes emit `TechArticle` plus a `BreadcrumbList`; the home page emits `WebSite`.

## Publish

```bash
pnpm --dir web build     # prerenders routes, writes sitemap.xml and llms-full.txt
pnpm kit site assemble   # overlays raw Markdown, CNAME, robots.txt into site/
pnpm test                # includes the SEO checks in web/src/seo
```

CI runs the same two steps in [deploy-pages.yml](https://github.com/mzworthington/agent-lifecycle-kit/blob/main/.github/workflows/deploy-pages.yml) and uploads `site/` as the Pages artifact.

## Verify ownership (one-off, per search engine)

Both engines accept an HTML file at the site root. Drop the file in the repo root; the assembler copies anything matching `google<token>.html`, `BingSiteAuth.xml`, or an IndexNow key file (`<hex>.txt`) onto the artifact.

1. **Google Search Console** - add a URL-prefix property for `https://eval-driven-development.dev/`, choose the HTML file method, commit the file, wait for the Pages deploy, then verify.
2. **Bing Webmaster Tools** - import the verified Google property, or verify separately with `BingSiteAuth.xml`.
3. Submit `https://eval-driven-development.dev/sitemap.xml` in both.

Do not commit a verification file for a property nobody owns; it is dead weight in the artifact.

## Monitor

| Check | Where | What good looks like |
|-------|-------|----------------------|
| Indexed pages | Search Console → Pages | Count tracks the URL count in `sitemap.xml` |
| Sitemap health | Search Console → Sitemaps | "Success", discovered URLs matches the build |
| Rendering | Search Console → URL Inspection → Test live URL | The rendered HTML shows real content, not an empty `#root` |
| Rich results | [Rich Results Test](https://search.google.com/test/rich-results) | Doc routes report an article and breadcrumbs |
| Crawl access | `curl -sI https://eval-driven-development.dev/sitemap.xml` | `200`, `content-type: application/xml` |

If a route is indexed but thin, the prerendered body is the thing to grow: it currently carries the heading, description, and nav, and the rest arrives with the client bundle. If Markdown URLs start showing as duplicates, the fix is a stronger internal-linking signal toward the route, not blocking `.md` in `robots.txt` - agents and LLM crawlers depend on those files.

## Related

- [Context budget](./context-budget.md) - the same discipline applied to agent prompts
- [Cloudflare analytics ops](./cloudflare-analytics-ops.md) - traffic data after the crawl works
- [Release checklist](./release.md) - ship the site with the rest of the kit
