import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { initDebugBoardSession, slugifyTitle } from './init_debug_board.js';

describe('slugifyTitle', () => {
  it('lowercases and hyphenates', () => {
    assert.equal(slugifyTitle('Initial Load Layout Overlap'), 'initial-load-layout-overlap');
  });

  it('strips leading and trailing hyphens', () => {
    assert.equal(slugifyTitle('  Hello!!!  '), 'hello');
  });
});

describe('initDebugBoardSession', () => {
  it('writes a board from the template and a handover when missing', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-debug-'));
    const template = path.join(root, 'templates', 'debug-board.md');
    fs.mkdirSync(path.dirname(template), { recursive: true });
    fs.writeFileSync(template, '# Debug board: <short title>\nProject `<project-name>` on YYYY-MM-DD\n', 'utf8');

    const result = initDebugBoardSession({
      repoDir: root,
      project: 'archlens',
      title: 'initial load',
      now: new Date(Date.UTC(2026, 7, 31))
    });

    assert.equal(result.createdHandover, true);
    assert.match(result.boardPath, /debug-board-2026-08-31-initial-load\.md$/);
    const board = fs.readFileSync(result.boardPath, 'utf8');
    assert.match(board, /initial load/);
    assert.match(board, /archlens/);
    assert.match(board, /2026-08-31/);
    assert.equal(fs.existsSync(result.handoverPath), true);
  });

  it('refuses to overwrite an existing board', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-debug-'));
    const template = path.join(root, 'templates', 'debug-board.md');
    fs.mkdirSync(path.dirname(template), { recursive: true });
    fs.writeFileSync(template, 'template\n', 'utf8');
    const opts = {
      repoDir: root,
      project: 'archlens',
      title: 'dup',
      now: new Date(Date.UTC(2026, 7, 31))
    };
    initDebugBoardSession(opts);
    assert.throws(() => initDebugBoardSession(opts), /already exists/);
  });

  it('throws when the template is missing and does not overwrite an existing handover', () => {
    const missing = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-debug-'));
    assert.throws(
      () => initDebugBoardSession({ repoDir: missing, project: 'p', title: 't' }),
      /missing template/
    );

    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-debug-'));
    const template = path.join(root, 'templates', 'debug-board.md');
    fs.mkdirSync(path.dirname(template), { recursive: true });
    fs.writeFileSync(template, 'template\n', 'utf8');
    const handoverDir = path.join(root, 'handover', 'archlens');
    fs.mkdirSync(handoverDir, { recursive: true });
    const handoverPath = path.join(handoverDir, 'handover_debug.md');
    fs.writeFileSync(handoverPath, 'keep\n', 'utf8');
    const result = initDebugBoardSession({
      repoDir: root,
      project: 'archlens',
      title: 'keep-handover',
      now: new Date(Date.UTC(2026, 7, 31))
    });
    assert.equal(result.createdHandover, false);
    assert.equal(fs.readFileSync(handoverPath, 'utf8'), 'keep\n');
  });
});
