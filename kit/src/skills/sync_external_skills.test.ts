import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import {
  parseSyncArgs,
  syncExternalSkills,
  mirrorUserSkills,
  type CommandRunner
} from './sync_external_skills.js';

describe('parseSyncArgs', () => {
  it('defaults to install', () => {
    assert.deepEqual(parseSyncArgs([]), { mode: 'install', dryRun: false, force: false, help: false });
  });

  it('parses update, dry-run, and force', () => {
    assert.deepEqual(parseSyncArgs(['--update', '--dry-run', '--force']), {
      mode: 'update',
      dryRun: true,
      force: true,
      help: false
    });
  });
});

function lockRoot(skills = [{ id: 'cloudflare', repository: 'cloudflare/skills', skill: 'skills/cloudflare', pin: 'v1.0.0' }]): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-sync-'));
  const dir = path.join(root, 'skills');
  fs.mkdirSync(dir);
  fs.writeFileSync(
    path.join(dir, 'external.lock.json'),
    JSON.stringify({ agent: 'cursor', scope: 'user', skills }),
    'utf8'
  );
  return root;
}

const FAKE_CURSOR_SKILLS = '/tmp/cursor-user-skills';

function capturingRunner(): { runner: CommandRunner; ran: string[][] } {
  const ran: string[][] = [];
  return {
    ran,
    runner: {
      exists: () => true,
      skillAvailable: () => true,
      userSkillsDir: () => FAKE_CURSOR_SKILLS,
      run: (bin, args) => {
        ran.push([bin, ...args]);
        return { status: 0 };
      }
    }
  };
}

describe('syncExternalSkills', () => {
  it('dry-run install logs without running gh', () => {
    const { runner, ran } = capturingRunner();
    const code = syncExternalSkills(lockRoot(), ['--install', '--dry-run'], runner);
    assert.equal(code, 0);
    assert.deepEqual(ran, []);
  });

  it('installs with pin, agent, and scope', () => {
    const { runner, ran } = capturingRunner();
    const code = syncExternalSkills(lockRoot(), ['--install'], runner);
    assert.equal(code, 0);
    assert.deepEqual(ran, [
      [
        'gh',
        'skill',
        'install',
        'cloudflare/skills',
        'skills/cloudflare',
        '--agent',
        'cursor',
        '--scope',
        'user',
        '--pin',
        'refs/tags/v1.0.0'
      ]
    ]);
  });

  it('passes --force on install and dry-run update still invokes gh', () => {
    const { runner, ran } = capturingRunner();
    assert.equal(syncExternalSkills(lockRoot(), ['--install', '--force'], runner), 0);
    assert.ok(ran[0]?.includes('--force'));
    ran.length = 0;
    assert.equal(syncExternalSkills(lockRoot(), ['--update', '--dry-run'], runner), 0);
    assert.deepEqual(ran, [
      ['gh', 'skill', 'update', '--dir', FAKE_CURSOR_SKILLS, '--dry-run', 'cloudflare']
    ]);
  });

  it('updates only lockfile skill names in Cursor user scope, never --all', () => {
    const { runner, ran } = capturingRunner();
    const root = lockRoot([
      { id: 'cloudflare', repository: 'cloudflare/skills', skill: 'skills/cloudflare', pin: 'latest' },
      { id: 'wrangler', repository: 'cloudflare/skills', skill: 'skills/wrangler', pin: 'latest' }
    ]);
    assert.equal(syncExternalSkills(root, ['--update'], runner), 0);
    assert.deepEqual(ran, [
      ['gh', 'skill', 'update', '--dir', FAKE_CURSOR_SKILLS, 'cloudflare', 'wrangler']
    ]);
    assert.ok(!ran[0]?.includes('--all'));
  });

  it('defaults update --dir to ~/.cursor/skills when the runner omits userSkillsDir', () => {
    const ran: string[][] = [];
    const runner: CommandRunner = {
      exists: () => true,
      skillAvailable: () => true,
      run: (bin, args) => {
        ran.push([bin, ...args]);
        return { status: 0 };
      }
    };
    assert.equal(syncExternalSkills(lockRoot(), ['--update'], runner), 0);
    assert.deepEqual(ran, [
      ['gh', 'skill', 'update', '--dir', path.join(os.homedir(), '.cursor', 'skills'), 'cloudflare']
    ]);
  });

  it('returns 0 for help and empty lockfiles', () => {
    const { runner } = capturingRunner();
    assert.equal(syncExternalSkills(lockRoot(), ['--help'], runner), 0);
    assert.equal(syncExternalSkills(lockRoot([]), ['--install'], runner), 0);
  });

  it('fails when gh or gh skill is missing, or the option is unknown', () => {
    const root = lockRoot();
    assert.equal(
      syncExternalSkills(root, [], { exists: () => false, skillAvailable: () => true, run: () => ({ status: 0 }) }),
      1
    );
    assert.equal(
      syncExternalSkills(root, [], { exists: () => true, skillAvailable: () => false, run: () => ({ status: 0 }) }),
      1
    );
    assert.equal(syncExternalSkills(root, ['--bogus'], capturingRunner().runner), 1);
  });

  it('omits --pin for latest so install is by tagged release, not a commit SHA', () => {
    const { runner, ran } = capturingRunner();
    const code = syncExternalSkills(
      lockRoot([{ id: 'cloudflare', repository: 'cloudflare/skills', skill: 'skills/cloudflare', pin: 'latest' }]),
      ['--install'],
      runner
    );
    assert.equal(code, 0);
    assert.deepEqual(ran, [
      ['gh', 'skill', 'install', 'cloudflare/skills', 'skills/cloudflare', '--agent', 'cursor', '--scope', 'user']
    ]);
  });
});

describe('mirrorUserSkills', () => {
  it('symlinks skill folders into Claude and Antigravity dirs without overwriting', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-skills-'));
    const cursor = path.join(root, '.cursor', 'skills');
    const claude = path.join(root, '.claude', 'skills');
    fs.mkdirSync(path.join(cursor, 'cloudflare'), { recursive: true });
    fs.writeFileSync(path.join(cursor, 'cloudflare', 'SKILL.md'), '# cf\n', 'utf8');
    fs.mkdirSync(claude, { recursive: true });
    fs.writeFileSync(path.join(claude, 'keep-me'), 'x', 'utf8');
    const linked = mirrorUserSkills(cursor, [claude, path.join(root, '.gemini', 'skills')]);
    assert.equal(linked.length, 2);
    assert.equal(fs.readFileSync(path.join(claude, 'cloudflare', 'SKILL.md'), 'utf8'), '# cf\n');
    assert.equal(fs.readFileSync(path.join(root, '.gemini', 'skills', 'cloudflare', 'SKILL.md'), 'utf8'), '# cf\n');
    assert.equal(mirrorUserSkills(cursor, [claude]).length, 0);
  });
});
