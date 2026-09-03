import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  listAgentSkills,
  loadHostOverlay,
  loadModelCatalog,
  resolveHostModel,
  resolveModelClass
} from './catalog.js';

const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

describe('model catalog', () => {
  it('covers every agent-* skill and resolves Cursor slugs', () => {
    const catalog = loadModelCatalog(kitRoot);
    const skills = listAgentSkills(kitRoot);
    assert.ok(skills.length >= 20);
    for (const name of skills) {
      assert.ok(catalog.skills[name], `missing catalog.skills.${name}`);
    }
    assert.equal(resolveModelClass(catalog, { skill: 'agent-tdd', specComplete: false }), 'plan');
    assert.equal(resolveModelClass(catalog, { skill: 'agent-tdd', specComplete: true }), 'implement');
    assert.equal(resolveModelClass(catalog, { skill: 'agent-tdd' }), 'implement');
    assert.equal(resolveModelClass(catalog, { skill: 'agent-security' }), 'review');
    assert.equal(resolveModelClass(catalog, { skill: 'agent-pre-commit' }), 'cheap');
    assert.equal(
      resolveModelClass(catalog, { skill: 'agent-tdd', specComplete: true, blocked: true }),
      'plan'
    );
    assert.equal(resolveModelClass(catalog, { phase: 'spec' }), 'plan');
    assert.equal(resolveModelClass(catalog, {}), 'plan');

    const overlay = loadHostOverlay(kitRoot, 'cursor');
    assert.equal(overlay.models.plan, 'cursor-grok-4.6-medium');
    assert.equal(overlay.models.review, 'cursor-grok-4.6-medium');
    assert.equal(resolveHostModel(kitRoot, 'implement', 'cursor').model, 'cursor-grok-4.6-medium');
    assert.equal(resolveHostModel(kitRoot, 'cheap', 'cursor').model, 'composer-2.5-fast');
    assert.equal(resolveHostModel(kitRoot, 'plan', 'claude').model, 'opus');
    assert.equal(resolveHostModel(kitRoot, 'implement', 'copilot').model, 'gpt-4.1');
    assert.equal(resolveHostModel(kitRoot, 'cheap', 'agy').model, 'gemini-2.5-flash');
    assert.equal(resolveHostModel(kitRoot, 'plan', 'gemini').host, 'antigravity');
  });

  it('rejects a host overlay that omits a class', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-models-'));
    try {
      fs.mkdirSync(path.join(tmp, 'models', 'hosts'), { recursive: true });
      fs.writeFileSync(
        path.join(tmp, 'models', 'hosts', 'cursor.yaml'),
        'host: cursor\nmodels:\n  plan: x\n'
      );
      assert.throws(() => loadHostOverlay(tmp, 'cursor'), /missing class/);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
