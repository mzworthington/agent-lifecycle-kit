import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import {
  KIT_NESTED_COMMANDS,
  KIT_TOP_LEVEL_COMMANDS,
  listMcpProfileNames,
  renderBashCompletion,
  renderZshCompletion
} from './completion.js';
import { KIT_HELP } from './help.js';

describe('renderCompletion', () => {
  it('emits zsh and bash scripts from the shared command table', () => {
    const zsh = renderZshCompletion({ mcpProfiles: ['default', 'collab'] });
    const bash = renderBashCompletion({ mcpProfiles: ['default', 'collab'] });
    for (const cmd of KIT_TOP_LEVEL_COMMANDS) {
      assert.match(zsh, new RegExp(`\\b${cmd}\\b`));
      assert.match(bash, new RegExp(`\\b${cmd}\\b`));
    }
    assert.match(zsh, /#compdef wk kit agent-kit/);
    assert.match(zsh, /compdef _wk wk kit agent-kit/);
    assert.match(zsh, /_values 'eval' run watch report ci shadow dataset/);
    assert.match(zsh, /_values 'profile' default collab/);
    assert.match(bash, /complete -F _wk wk/);
    assert.match(bash, /complete -F _wk kit/);
    assert.match(bash, /mcp\) opts="default collab"/);
  });

  it('keeps help and completions on the same verbs', () => {
    for (const cmd of KIT_TOP_LEVEL_COMMANDS) {
      if (cmd === 'scan') continue;
      assert.match(KIT_HELP, new RegExp(`(?:^|\\n)\\s+${cmd}\\b`, 'm'));
    }
    assert.match(KIT_HELP, /run\|watch\|report\|ci\|shadow\|dataset/);
    assert.deepEqual([...KIT_NESTED_COMMANDS.completion], ['zsh', 'bash']);
  });

  it('lists MCP profile ids from mcps/profiles', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-complete-'));
    const dir = path.join(root, 'mcps', 'profiles');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'default.json'), '{}', 'utf8');
    fs.writeFileSync(path.join(dir, 'ops.json'), '{}', 'utf8');
    assert.deepEqual(listMcpProfileNames(root), ['default', 'ops']);
  });
});
