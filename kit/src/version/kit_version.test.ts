import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  STALE_AFTER_SECONDS,
  formatKitVersion,
  isOriginWeeksAhead,
  type KitVersionSnapshot
} from './kit_version.js';

const base: KitVersionSnapshot = {
  packageVersion: '1.0.0',
  gitDescribe: 'v1.2.3-4-gabcdef',
  agentsPath: '/home/me/.agents',
  kitRepoDir: '/work/waykit',
  agentsIsSymlink: true,
  agentsResolvesToKit: true
};

describe('isOriginWeeksAhead', () => {
  it('is false when origin is not ahead', () => {
    assert.equal(
      isOriginWeeksAhead({
        aheadCount: 0,
        localTipUnix: 1_000_000,
        originTipUnix: 1_000_000 + STALE_AFTER_SECONDS * 2
      }),
      false
    );
  });

  it('is false when origin is ahead by less than two weeks of tip age', () => {
    assert.equal(
      isOriginWeeksAhead({
        aheadCount: 3,
        localTipUnix: 1_000_000,
        originTipUnix: 1_000_000 + STALE_AFTER_SECONDS - 1
      }),
      false
    );
  });

  it('is true when origin is ahead and the tip is at least two weeks newer', () => {
    assert.equal(
      isOriginWeeksAhead({
        aheadCount: 12,
        localTipUnix: 1_000_000,
        originTipUnix: 1_000_000 + STALE_AFTER_SECONDS
      }),
      true
    );
  });
});

describe('formatKitVersion', () => {
  it('prints package version, git describe, and symlink-to-clone', () => {
    const text = formatKitVersion(base);
    assert.match(text, /waykit 1\.0\.0/);
    assert.match(text, /git: v1\.2\.3-4-gabcdef/);
    assert.match(text, /~\/\.agents -> \/work\/waykit \(symlink to this clone\)/);
  });

  it('says when ~/.agents is not a symlink to this clone', () => {
    const text = formatKitVersion({
      ...base,
      gitDescribe: undefined,
      agentsIsSymlink: false,
      agentsResolvesToKit: false
    });
    assert.doesNotMatch(text, /git:/);
    assert.match(text, /~\/\.agents is \/home\/me\/\.agents \(not a symlink to this clone\)/);
  });

  it('warns with a one-line pull recipe and does not pull', () => {
    const text = formatKitVersion(base, { stale: true });
    assert.match(text, /origin is weeks ahead/);
    assert.match(text, /git -C ~\/\.agents pull --ff-only/);
    assert.doesNotMatch(text, /auto-pull/i);
  });
});
