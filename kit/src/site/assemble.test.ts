import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import {
  assemblePagesSite,
  isRenderableDoc,
  isVerificationFile,
  PAGES_SITE_ENTRIES,
  PAGES_SITE_HOST
} from './assemble.js';
import { extractLlmsLinks } from './llms.js';
import { kitRootFrom } from '../shared/paths.js';

const kitRoot = kitRootFrom(import.meta.url);

function writeTree(root: string, files: Record<string, string>): void {
  for (const [rel, body] of Object.entries(files)) {
    const dest = path.join(root, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, body, 'utf8');
  }
}

function listRel(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of fs.readdirSync(dir)) {
      const abs = path.join(dir, name);
      const rel = path.relative(root, abs).split(path.sep).join('/');
      if (fs.statSync(abs).isDirectory()) walk(abs);
      else out.push(rel);
    }
  };
  walk(root);
  return out.sort();
}

const MINIMAL_TREE: Record<string, string> = {
  'index.html': '<html></html>',
  '404.html': '<html></html>',
  '.nojekyll': '',
  'llms.txt': '# kit',
  'robots.txt': 'Allow: /',
  LICENSE: 'Unlicense',
  'assets/site.css': 'body{}',
  'assets/site.js': 'void 0;',
  'docs/README.md': '# Public docs\n\nIndex of docs.\n\nSee [the guide](./edd.md).\n',
  'docs/edd.md': '# EDD\n\nRed, green, refactor.\n\n## Loop\n\nSee [the suite](../evals/edd/demo.yaml) and [a skill](../skills/agent-tdd/SKILL.md).\n',
  'evals/edd/demo.yaml': 'name: demo',
  'SOPs/context-budget.md': '---\ntitle: Context budget\nkind: sop\n---\n# Budget\n\nKeep always-on context small.\n',
  'mcps/README.md': '# MCP\n\nServer catalog.\n',
  'ontology/README.md': '# Ontology\n\nMetamodel notes.\n'
};

const fixedLastmod = () => '2026-09-01';

function assembleFixture(extra: Record<string, string> = {}) {
  const src = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-site-src-'));
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-site-dest-'));
  writeTree(src, { ...MINIMAL_TREE, ...extra });
  const result = assemblePagesSite({ kitRoot: src, dest, lastmodFor: fixedLastmod });
  return {
    src,
    dest,
    result,
    files: listRel(dest),
    read: (rel: string) => fs.readFileSync(path.join(dest, rel), 'utf8'),
    cleanup: () => {
      fs.rmSync(src, { recursive: true, force: true });
      fs.rmSync(dest, { recursive: true, force: true });
    }
  };
}

describe('PAGES_SITE_ENTRIES', () => {
  it('allowlists the public landing, markdown docs, and linked eval/SOP paths', () => {
    assert.ok(PAGES_SITE_ENTRIES.includes('index.html'));
    assert.ok(PAGES_SITE_ENTRIES.includes('docs'));
    assert.ok(PAGES_SITE_ENTRIES.includes('evals/edd'));
    assert.ok(PAGES_SITE_ENTRIES.includes('SOPs'));
    assert.ok(PAGES_SITE_ENTRIES.includes('ontology'));
    assert.ok(!PAGES_SITE_ENTRIES.includes('skills'));
    assert.ok(!PAGES_SITE_ENTRIES.includes('node_modules'));
  });

  it('does not require a committed sitemap, since assemble generates it', () => {
    assert.ok(!PAGES_SITE_ENTRIES.includes('sitemap.xml'));
    assert.equal(fs.existsSync(path.join(kitRoot, 'sitemap.xml')), false);
  });
});

describe('isRenderableDoc', () => {
  it('renders docs, SOPs, and eval write-ups', () => {
    assert.ok(isRenderableDoc('docs/edd.md'));
    assert.ok(isRenderableDoc('SOPs/release.md'));
    assert.ok(isRenderableDoc('evals/edd/examples/before-after.md'));
  });

  it('leaves eval prompt fixtures as raw Markdown', () => {
    assert.ok(!isRenderableDoc('evals/edd/system_prompt.md'));
    assert.ok(!isRenderableDoc('evals/edd/kit_knowledge_prompt.md'));
    assert.ok(!isRenderableDoc('evals/edd/demo.yaml'));
  });
});

describe('isVerificationFile', () => {
  it('recognises Search Console, Bing, and IndexNow ownership proofs', () => {
    assert.ok(isVerificationFile('google1a2b3c4d5e6f.html'));
    assert.ok(isVerificationFile('BingSiteAuth.xml'));
    assert.ok(isVerificationFile('0123456789abcdef.txt'));
    assert.ok(!isVerificationFile('llms.txt'));
    assert.ok(!isVerificationFile('index.html'));
  });
});

describe('assemblePagesSite', () => {
  it('copies only allowlisted paths and writes the Pages CNAME', () => {
    const fixture = assembleFixture({
      'skills/agent-tdd/SKILL.md': '# secret',
      'package.json': '{}'
    });
    try {
      const { files, result, dest } = fixture;
      assert.equal(result.dest, dest);
      assert.equal(fs.readFileSync(path.join(dest, 'CNAME'), 'utf8').trim(), PAGES_SITE_HOST);
      assert.ok(files.includes('docs/edd.md'));
      assert.ok(files.includes('evals/edd/demo.yaml'));
      assert.ok(!files.includes('skills/agent-tdd/SKILL.md'));
      assert.ok(!files.includes('package.json'));
    } finally {
      fixture.cleanup();
    }
  });

  it('fails when a required entry is missing', () => {
    const src = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-site-missing-'));
    const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-site-dest-'));
    try {
      writeTree(src, { 'index.html': '<html></html>' });
      assert.throws(() => assemblePagesSite({ kitRoot: src, dest }), /index.html|404.html|required/i);
    } finally {
      fs.rmSync(src, { recursive: true, force: true });
      fs.rmSync(dest, { recursive: true, force: true });
    }
  });

  it('replaces an existing dest so stale files do not leak into the artifact', () => {
    const src = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-site-src-'));
    const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-site-dest-'));
    try {
      writeTree(src, MINIMAL_TREE);
      fs.writeFileSync(path.join(dest, 'stale.txt'), 'leak');
      assemblePagesSite({ kitRoot: src, dest, lastmodFor: fixedLastmod });
      assert.equal(fs.existsSync(path.join(dest, 'stale.txt')), false);
    } finally {
      fs.rmSync(src, { recursive: true, force: true });
      fs.rmSync(dest, { recursive: true, force: true });
    }
  });

  it('renders every published Markdown file to an indexable HTML page', () => {
    const fixture = assembleFixture();
    try {
      const { files, read, result } = fixture;
      assert.ok(files.includes('docs/edd.html'));
      assert.ok(files.includes('docs/index.html'));
      assert.ok(files.includes('SOPs/context-budget.html'));
      assert.ok(files.includes('mcps/index.html'));
      assert.ok(files.includes('docs/edd.md'), 'Markdown stays published for agents');
      assert.deepEqual(result.renderedPages.sort(), [
        'SOPs/context-budget.html',
        'docs/edd.html',
        'docs/index.html',
        'mcps/index.html',
        'ontology/index.html'
      ]);

      const edd = read('docs/edd.html');
      assert.match(edd, /<title>EDD - Agent Lifecycle Kit<\/title>/);
      assert.match(edd, /<meta name="description" content="Red, green, refactor\.">/);
      assert.match(edd, /<link rel="canonical" href="https:\/\/eval-driven-development\.dev\/docs\/edd\.html">/);
      assert.match(edd, /"@type": "TechArticle"/);
      assert.match(edd, /<meta property="article:modified_time" content="2026-09-01">/);
      assert.match(read('SOPs/context-budget.html'), /<title>Context budget - Agent Lifecycle Kit<\/title>/);
    } finally {
      fixture.cleanup();
    }
  });

  it('rewrites doc links to published pages, raw files, or GitHub', () => {
    const fixture = assembleFixture();
    try {
      const edd = fixture.read('docs/edd.html');
      assert.match(edd, /href="\/evals\/edd\/demo\.yaml"/);
      assert.match(edd, /href="https:\/\/github\.com\/mzworthington\/agent-lifecycle-kit\/blob\/main\/skills\/agent-tdd\/SKILL\.md"/);
      assert.match(fixture.read('docs/index.html'), /href="\/docs\/edd\.html"/);
    } finally {
      fixture.cleanup();
    }
  });

  it('generates sitemap.xml covering the rendered pages and no raw Markdown', () => {
    const fixture = assembleFixture();
    try {
      const xml = fixture.read('sitemap.xml');
      assert.match(xml, /<loc>https:\/\/eval-driven-development\.dev\/<\/loc>/);
      assert.match(xml, /<loc>https:\/\/eval-driven-development\.dev\/docs\/edd\.html<\/loc>/);
      assert.match(xml, /<loc>https:\/\/eval-driven-development\.dev\/docs\/<\/loc>/);
      assert.match(xml, /<loc>https:\/\/eval-driven-development\.dev\/llms-full\.txt<\/loc>/);
      assert.doesNotMatch(xml, /\.md</);
      assert.doesNotMatch(xml, /404\.html/);
      assert.equal(fixture.result.sitemapUrls, (xml.match(/<loc>/g) ?? []).length);
    } finally {
      fixture.cleanup();
    }
  });

  it('generates an HTML sitemap hub that links the rendered pages', () => {
    const fixture = assembleFixture();
    try {
      const html = fixture.read('sitemap.html');
      assert.match(html, /<a href="\/docs\/edd\.html">EDD<\/a>/);
      assert.match(html, /<a href="\/SOPs\/context-budget\.html">Context budget<\/a>/);
    } finally {
      fixture.cleanup();
    }
  });

  it('generates llms-full.txt with the whole published corpus', () => {
    const fixture = assembleFixture();
    try {
      const full = fixture.read('llms-full.txt');
      assert.match(full, /url: https:\/\/eval-driven-development\.dev\/docs\/edd\.html/);
      assert.match(full, /Red, green, refactor\./);
      assert.match(full, /Keep always-on context small\./);
      assert.doesNotMatch(full, /kind: sop/, 'source frontmatter is stripped');
    } finally {
      fixture.cleanup();
    }
  });

  it('copies search-engine verification files from the repo root', () => {
    const fixture = assembleFixture({ 'google1a2b3c4d.html': 'google-site-verification' });
    try {
      assert.ok(fixture.files.includes('google1a2b3c4d.html'));
    } finally {
      fixture.cleanup();
    }
  });

  it('assembles the real kit tree without kit source, skills, or package metadata', () => {
    const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-site-real-'));
    try {
      assemblePagesSite({ kitRoot, dest });
      const files = listRel(dest);
      assert.ok(files.includes('index.html'));
      assert.ok(files.includes('docs/edd.md'));
      assert.ok(files.includes('docs/edd.html'));
      assert.ok(files.includes('docs/kit.html'));
      assert.ok(files.includes('docs/today-jobs.html'));
      assert.ok(files.includes('docs/index.html'));
      assert.ok(files.includes('SOPs/context-budget.html'));
      assert.ok(files.includes('sitemap.xml'));
      assert.ok(files.includes('sitemap.html'));
      assert.ok(files.includes('llms-full.txt'));
      assert.ok(files.includes('evals/edd/system_prompt.md'));
      assert.ok(!files.includes('evals/edd/system_prompt.html'), 'eval fixtures are not pages');
      assert.ok(files.includes('assets/site.css'));
      assert.ok(files.includes('assets/site.js'));
      assert.ok(files.includes('assets/doc-page.js'));
      assert.ok(files.includes('assets/today-jobs.js'));
      assert.ok(files.includes('assets/ontology-map.js'));
      assert.ok(files.includes('evals/edd/demo.yaml'));
      assert.ok(!files.some((f) => f.startsWith('kit/')));
      assert.ok(!files.some((f) => f.startsWith('skills/')));
      assert.ok(!files.includes('package.json'));
      assert.ok(!files.some((f) => f.startsWith('node_modules/')));
    } finally {
      fs.rmSync(dest, { recursive: true, force: true });
    }
  });

  it('publishes every URL that llms.txt advertises', () => {
    const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-site-llms-'));
    try {
      assemblePagesSite({ kitRoot, dest });
      const published = new Set(listRel(dest));
      const links = extractLlmsLinks(fs.readFileSync(path.join(dest, 'llms.txt'), 'utf8'));
      const siteLinks = links.filter((href) => href.startsWith('https://eval-driven-development.dev/'));
      assert.ok(siteLinks.length > 5, 'llms.txt should point at the site');
      const broken = siteLinks.filter((href) => {
        const urlPath = href.replace('https://eval-driven-development.dev/', '').split('#')[0];
        if (urlPath === '') return false;
        const candidate = urlPath.endsWith('/') ? `${urlPath}index.html` : urlPath;
        return !published.has(candidate);
      });
      assert.deepEqual(broken, []);
    } finally {
      fs.rmSync(dest, { recursive: true, force: true });
    }
  });
});

describe('landing page assets', () => {
  it('keeps CSS and page chrome JS in assets instead of inlining them', () => {
    const html = fs.readFileSync(path.join(kitRoot, 'index.html'), 'utf8');
    assert.match(html, /href="\.\/assets\/site\.css"/);
    assert.match(html, /type="module" src="\.\/assets\/site\.js"/);
    assert.match(html, /docs\/today-jobs\.md/);
    assert.doesNotMatch(html, /function initSiteNav/);
    assert.doesNotMatch(html, /<style>\s*:root/);
  });

  it('Pages workflow uploads the assembled site directory', () => {
    const yml = fs.readFileSync(
      path.join(kitRoot, '.github/workflows/deploy-pages.yml'),
      'utf8'
    );
    assert.match(yml, /pnpm kit site assemble/);
    assert.match(yml, /path: 'site'/);
    assert.doesNotMatch(yml, /path: '\.'/);
  });

  it('gitignores only the repo-root assemble output, not kit/src/site', () => {
    const gi = fs.readFileSync(path.join(kitRoot, '.gitignore'), 'utf8');
    assert.match(gi, /^\/site\/$/m);
    assert.doesNotMatch(gi, /^site\/$/m);
  });
});
