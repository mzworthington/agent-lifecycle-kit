import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { exportIDERules } from './export_ide_rules.js';

function kitWithTemplates(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-ide-'));
  const templates = path.join(root, 'templates');
  fs.mkdirSync(templates);
  fs.writeFileSync(path.join(templates, 'project-GEMINI.md'), '# gemini-from-template\n', 'utf8');
  fs.writeFileSync(path.join(templates, 'project-CLAUDE.md'), '# claude-from-template\n', 'utf8');
  fs.writeFileSync(path.join(templates, 'project-windsurfrules'), '# windsurf-from-template\n', 'utf8');
  fs.writeFileSync(path.join(templates, 'project-cursorrules'), '# cursor-from-template\n', 'utf8');
  fs.writeFileSync(path.join(templates, 'project-copilot-instructions.md'), '# copilot-from-template\n', 'utf8');
  return root;
}

describe('exportIDERules', () => {
  it('writes template contents into the target directory', () => {
    const kit = kitWithTemplates();
    const target = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-app-'));
    const ok = exportIDERules(target, false, kit);
    assert.equal(ok, true);
    assert.equal(fs.readFileSync(path.join(target, 'GEMINI.md'), 'utf8'), '# gemini-from-template\n');
    assert.equal(fs.readFileSync(path.join(target, 'CLAUDE.md'), 'utf8'), '# claude-from-template\n');
    assert.equal(fs.readFileSync(path.join(target, '.windsurfrules'), 'utf8'), '# windsurf-from-template\n');
    assert.equal(fs.readFileSync(path.join(target, '.cursorrules'), 'utf8'), '# cursor-from-template\n');
    assert.equal(
      fs.readFileSync(path.join(target, '.github', 'copilot-instructions.md'), 'utf8'),
      '# copilot-from-template\n'
    );
  });

  it('falls back when a template file is missing', () => {
    const kit = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-ide-'));
    fs.mkdirSync(path.join(kit, 'templates'));
    const target = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-app-'));
    exportIDERules(target, false, kit);
    assert.match(fs.readFileSync(path.join(target, 'CLAUDE.md'), 'utf8'), /canonical bootstrap lives in \[AGENTS.md\]/);
  });

  it('check-only passes when all entry points exist', () => {
    const kit = kitWithTemplates();
    const target = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-app-'));
    exportIDERules(target, false, kit);
    assert.equal(exportIDERules(target, true, kit), true);
  });

  it('check-only fails when an entry point is missing', () => {
    const kit = kitWithTemplates();
    const target = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-app-'));
    assert.equal(exportIDERules(target, true, kit), false);
  });
});
