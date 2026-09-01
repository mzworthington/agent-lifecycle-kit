import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  cliffCommitRange,
  formatBullet,
  renderNotesForRange,
  renderReleaseNotes,
  resolveCliffRange,
  stripGroupTags,
  type CliffRelease,
} from './release_notes.js';

const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function releaseWith(commits: CliffRelease['commits']): CliffRelease[] {
  return [{ version: null, commits }];
}

describe('cliffCommitRange', () => {
  it('uses until-ref alone for the first release (empty since)', () => {
    assert.equal(cliffCommitRange(undefined, 'v1.0.0'), 'v1.0.0');
    assert.equal(cliffCommitRange('', 'v1.0.0'), 'v1.0.0');
  });

  it('scopes subsequent releases to since..until', () => {
    assert.equal(cliffCommitRange('v1.0.0', 'v1.1.0'), 'v1.0.0..v1.1.0');
    assert.equal(cliffCommitRange('v1.0.0'), 'v1.0.0..HEAD');
  });
});

describe('resolveCliffRange', () => {
  it('resolves tags to SHA ranges so git-cliff accepts them', () => {
    const first = resolveCliffRange(undefined, 'v1.0.0', { root: kitRoot });
    assert.match(first, /^[0-9a-f]{40}$/);
    const next = resolveCliffRange('v1.0.0', 'v1.1.0', { root: kitRoot });
    assert.match(next, /^[0-9a-f]{40}\.\.[0-9a-f]{40}$/);
  });
});

describe('renderReleaseNotes', () => {
  it('does not include [unreleased] for a ranged release', () => {
    const notes = renderReleaseNotes(
      releaseWith([
        {
          message: 'add install SHA pin',
          raw_message: 'feat(install): add install SHA pin',
          scope: 'install',
          group: '<!-- 0 -->🚀 Features',
        },
      ]),
    );
    assert.equal(notes.toLowerCase().includes('[unreleased]'), false);
    assert.equal(notes.includes('## ['), false);
  });

  it('groups Features etc. from conventional commits', () => {
    const notes = renderReleaseNotes(
      releaseWith([
        {
          message: 'ship sync notes',
          raw_message: 'feat(release): ship sync notes',
          scope: 'release',
          group: '<!-- 0 -->🚀 Features',
        },
        {
          message: 'scope release notes',
          raw_message: 'fix(release): scope release notes',
          scope: 'release',
          group: '<!-- 1 -->🐛 Bug Fixes',
        },
      ]),
    );
    assert.match(notes, /### 🚀 Features/);
    assert.match(notes, /### 🐛 Bug Fixes/);
    assert.match(notes, /\*\(release\)\* Ship sync notes/);
    assert.match(notes, /\*\(release\)\* Scope release notes/);
  });

  it('skips chore(changelog) / release / derived commits', () => {
    const notes = renderReleaseNotes(
      releaseWith([
        {
          message: 'regenerate from conventional commits',
          raw_message: 'chore(changelog): regenerate from conventional commits',
          scope: 'changelog',
          group: '<!-- 3 -->🧰 Maintenance & Dependencies',
        },
        {
          message: 'cut v1.1.0',
          raw_message: 'chore(release): cut v1.1.0',
          scope: 'release',
          group: '<!-- 3 -->🧰 Maintenance & Dependencies',
        },
        {
          message: 'rebuild pages',
          raw_message: 'chore(derived): rebuild pages',
          scope: 'derived',
          group: '<!-- 3 -->🧰 Maintenance & Dependencies',
        },
        {
          message: 'keep this fix',
          raw_message: 'fix: keep this fix',
          group: '<!-- 1 -->🐛 Bug Fixes',
        },
      ]),
    );
    assert.equal(notes.includes('regenerate'), false);
    assert.equal(notes.includes('cut v1.1.0'), false);
    assert.equal(notes.includes('rebuild pages'), false);
    assert.match(notes, /Keep this fix/);
  });

  it('first-release fixture can include early history while subsequent stays scoped', () => {
    const early = renderReleaseNotes(
      releaseWith([
        {
          message: 'bootstrap kit',
          raw_message: 'feat: bootstrap kit',
          group: '<!-- 0 -->🚀 Features',
        },
        {
          message: 'add release pipeline',
          raw_message: 'feat(ci): add release pipeline',
          scope: 'ci',
          group: '<!-- 0 -->🚀 Features',
        },
      ]),
    );
    const later = renderReleaseNotes(
      releaseWith([
        {
          message: 'pin install to commit SHA',
          raw_message: 'feat(install): pin install to commit SHA',
          scope: 'install',
          group: '<!-- 0 -->🚀 Features',
        },
      ]),
    );
    assert.match(early, /Bootstrap kit/);
    assert.match(early, /Add release pipeline/);
    assert.equal(early.includes('pin install'), false);
    assert.match(later, /Pin install to commit SHA/);
    assert.equal(later.includes('Bootstrap kit'), false);
    assert.ok(later.length < early.length);
  });

  it('strips HTML comment prefixes from groups', () => {
    assert.equal(stripGroupTags('<!-- 0 -->🚀 Features'), '🚀 Features');
    assert.equal(formatBullet({ message: 'hello world', scope: 'core' }), '- *(core)* Hello world');
  });
});

describe('renderNotesForRange (git integration)', () => {
  it('renders version-scoped notes without [unreleased]', () => {
    const v100 = renderNotesForRange(undefined, 'v1.0.0', { root: kitRoot });
    const v110 = renderNotesForRange('v1.0.0', 'v1.1.0', { root: kitRoot });
    assert.equal(v100.toLowerCase().includes('[unreleased]'), false);
    assert.equal(v110.toLowerCase().includes('[unreleased]'), false);
    assert.match(v100, /### 🚀 Features/);
    assert.match(v110, /### 🚀 Features/);
    assert.match(v110, /SHA-256 verified install/i);
    assert.ok(v110.length < v100.length / 2, 'v1.1.0 notes should be much smaller than v1.0.0');
  });
});
