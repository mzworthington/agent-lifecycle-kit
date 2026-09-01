import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { assemblePagesSite, PAGES_SITE_ENTRIES, PAGES_SITE_HOST } from './assemble.js';
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
});

describe('assemblePagesSite', () => {
  it('copies only allowlisted paths and writes the Pages CNAME', () => {
    const src = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-site-src-'));
    const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-site-dest-'));
    try {
      writeTree(src, {
        'index.html': '<html></html>',
        '404.html': '<html></html>',
        '.nojekyll': '',
        'llms.txt': '# kit',
        'robots.txt': 'Allow: /',
        'sitemap.xml': '<urlset></urlset>',
        LICENSE: 'Unlicense',
        'assets/site.css': 'body{}',
        'assets/site.js': 'void 0;',
        'docs/edd.md': '# edd',
        'evals/edd/demo.yaml': 'name: demo',
        'SOPs/context-budget.md': '# budget',
        'mcps/README.md': '# mcp',
        'ontology/README.md': '# ontology',
        'skills/agent-tdd/SKILL.md': '# secret',
        'package.json': '{}'
      });
      const result = assemblePagesSite({ kitRoot: src, dest });
      const files = listRel(dest);
      assert.equal(result.dest, dest);
      assert.ok(result.fileCount >= files.length);
      assert.deepEqual(
        files.filter((f) => f === 'CNAME' || f === 'index.html' || f === 'skills/agent-tdd/SKILL.md' || f === 'package.json'),
        ['CNAME', 'index.html']
      );
      assert.equal(fs.readFileSync(path.join(dest, 'CNAME'), 'utf8').trim(), PAGES_SITE_HOST);
      assert.ok(files.includes('docs/edd.md'));
      assert.ok(files.includes('evals/edd/demo.yaml'));
      assert.ok(!files.includes('skills/agent-tdd/SKILL.md'));
      assert.ok(!files.includes('package.json'));
    } finally {
      fs.rmSync(src, { recursive: true, force: true });
      fs.rmSync(dest, { recursive: true, force: true });
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
      writeTree(src, {
        'index.html': '<html></html>',
        '404.html': '<html></html>',
        '.nojekyll': '',
        'llms.txt': '# kit',
        'robots.txt': 'Allow: /',
        'sitemap.xml': '<urlset></urlset>',
        LICENSE: 'Unlicense',
        'assets/site.css': 'body{}',
        'docs/edd.md': '# edd',
        'evals/edd/demo.yaml': 'name: demo',
        'SOPs/context-budget.md': '# budget',
        'mcps/README.md': '# mcp',
        'ontology/README.md': '# ontology'
      });
      fs.writeFileSync(path.join(dest, 'stale.txt'), 'leak');
      assemblePagesSite({ kitRoot: src, dest });
      assert.equal(fs.existsSync(path.join(dest, 'stale.txt')), false);
    } finally {
      fs.rmSync(src, { recursive: true, force: true });
      fs.rmSync(dest, { recursive: true, force: true });
    }
  });

  it('assembles the real kit tree without kit source, skills, or package metadata', () => {
    const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-site-real-'));
    try {
      assemblePagesSite({ kitRoot, dest });
      const files = listRel(dest);
      assert.ok(files.includes('index.html'));
      assert.ok(files.includes('docs/edd.md'));
      assert.ok(files.includes('docs/kit.md'));
      assert.ok(files.includes('docs/today-jobs.md'));
      assert.ok(files.includes('assets/site.css'));
      assert.ok(files.includes('assets/site.js'));
      assert.ok(files.includes('assets/today-jobs.js'));
      assert.ok(files.includes('assets/ontology-map.js'));
      assert.ok(files.includes('evals/edd/demo.yaml'));
      assert.ok(files.includes('SOPs/context-budget.md'));
      assert.ok(files.includes('ontology/README.md'));
      assert.ok(!files.some((f) => f.startsWith('kit/')));
      assert.ok(!files.some((f) => f.startsWith('skills/')));
      assert.ok(!files.includes('package.json'));
      assert.ok(!files.some((f) => f.startsWith('node_modules/')));
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
