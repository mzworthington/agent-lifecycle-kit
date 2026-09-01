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

The public site is a static GitHub Pages artifact built by `kit site assemble`. Crawl surface is a build output, not something to hand-maintain: the assembler renders every published Markdown file to HTML, then derives `sitemap.xml`, `sitemap.html`, and `llms-full.txt` from the tree it just produced.

## What the build guarantees

| Artifact | Produced by | Why it exists |
|----------|-------------|---------------|
| `<doc>.html` beside every `<doc>.md` | `kit site assemble` | Indexable HTML with a unique title, description, canonical URL, and structured data. `text/markdown` is a poor indexing surface. |
| `sitemap.xml` | derived from the assembled tree | Lists only canonical HTML plus the text indexes, with `lastmod` from git history. |
| `sitemap.html` | derived from the same entries | A crawlable hub page linking everything, for readers and for crawlers that follow links rather than sitemaps. |
| `llms-full.txt` | concatenated Markdown corpus | One file with every page for model crawlers; `llms.txt` stays the short index. |
| `CNAME` | assembler | Custom domain. DNS lives in [edge-dns](https://github.com/mzworthington/edge-dns). |

Rules the build enforces, covered by tests in `kit/src/site`:

- **HTML is canonical.** Markdown sources stay published and linked as `rel="alternate"`, but never appear in `sitemap.xml`, so the two representations do not compete.
- **No fragment-only URLs in the sitemap.** `#today` and friends are one document to a crawler; discovery goes through real paths.
- **Links resolve.** Doc links point at the published page, the published raw file, or the GitHub blob when the target is not published.
- **`llms.txt` cannot drift.** A test fails if it advertises a URL the build does not publish.

## Publish

```bash
pnpm kit site assemble          # writes ./site
pnpm test                       # includes the crawlability checks in kit/src/site
```

CI runs the same assemble in [deploy-pages.yml](https://github.com/mzworthington/agent-lifecycle-kit/blob/main/.github/workflows/deploy-pages.yml) and uploads `site/` as the Pages artifact.

## Verify ownership (one-off, per search engine)

Both engines accept an HTML file at the site root. Drop the file in the repo root; the assembler copies anything matching `google<token>.html`, `BingSiteAuth.xml`, or an IndexNow key file (`<hex>.txt`) into the artifact.

1. **Google Search Console** - add a URL-prefix property for `https://eval-driven-development.dev/`, choose the HTML file method, commit the file, wait for the Pages deploy, then verify.
2. **Bing Webmaster Tools** - import the verified Google property, or verify separately with `BingSiteAuth.xml`.
3. Submit `https://eval-driven-development.dev/sitemap.xml` in both.

Do not commit a verification file for a property nobody owns; it is dead weight in the artifact.

## Monitor

| Check | Where | What good looks like |
|-------|-------|----------------------|
| Indexed pages | Search Console → Pages | Count tracks the URL count in `sitemap.xml` |
| Sitemap health | Search Console → Sitemaps | "Success", discovered URLs matches the build |
| Soft 404s / duplicates | Search Console → Pages → Why not indexed | No "Duplicate without user-selected canonical" on `.md` URLs |
| Rich results | [Rich Results Test](https://search.google.com/test/rich-results) | Homepage reports FAQ and HowTo; doc pages report TechArticle and breadcrumbs |
| Crawl access | `curl -sI https://eval-driven-development.dev/sitemap.xml` | `200`, `content-type: application/xml` |

If Markdown URLs start showing as duplicates, the fix is a stronger internal-linking signal toward the HTML page, not blocking `.md` in `robots.txt` - agents and LLM crawlers depend on those files.

## Related

- [Context budget](./context-budget.md) - the same discipline applied to agent prompts
- [Cloudflare analytics ops](./cloudflare-analytics-ops.md) - traffic data after the crawl works
- [Release checklist](./release.md) - ship the site with the rest of the kit
