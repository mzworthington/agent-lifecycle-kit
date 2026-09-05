import pc from 'picocolors';
import { CLI_BIN } from './name.js';

const BANNER_INNER_WIDTH = 52;

const ANSI_ESCAPE_PATTERN = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

export function stripAnsi(value: string): string {
  return value.replace(ANSI_ESCAPE_PATTERN, '');
}

function padLine(content: string, width = BANNER_INNER_WIDTH): string {
  const visible = stripAnsi(content);
  const padding = Math.max(0, width - visible.length);
  return `${content}${' '.repeat(padding)}`;
}

function borderLine(content = ''): string {
  return `${pc.cyan('  │')} ${padLine(content)} ${pc.cyan('│')}`;
}

function topBorder(): string {
  return pc.cyan(`  ╭${'─'.repeat(BANNER_INNER_WIDTH + 2)}╮`);
}

function bottomBorder(): string {
  return pc.cyan(`  ╰${'─'.repeat(BANNER_INNER_WIDTH + 2)}╯`);
}

function titleLine(): string {
  const title = `${pc.bold(pc.cyan('◆'))}  ${pc.bold(pc.cyan('WAY'))}${pc.bold(pc.white('KIT'))}  ${pc.bold(pc.dim('CLI'))}`;
  return borderLine(title);
}

/** ASCII panel shown before interactive prompts and overview help. */
export function formatCliBanner(version?: string): string {
  const lines = [
    '',
    topBorder(),
    borderLine(),
    titleLine(),
    borderLine(),
    borderLine(pc.dim('SDLC for coding agents')),
    borderLine(pc.dim('Handshake · MCP · merge bar · evals')),
    borderLine()
  ];
  if (version) {
    const label = pc.dim(version);
    const padding = Math.max(0, BANNER_INNER_WIDTH - stripAnsi(label).length);
    lines.push(borderLine(`${' '.repeat(padding)}${label}`));
    lines.push(borderLine());
  }
  lines.push(bottomBorder());
  lines.push('');
  return lines.join('\n');
}

export function renderCliBanner(version?: string, log: (msg: string) => void = console.log): void {
  log(formatCliBanner(version));
}

export function renderCliQuickTips(log: (msg: string) => void = console.log): void {
  log(
    `${pc.cyan('  ◇')}  ${pc.dim('Tips:')} ${pc.white('↑↓')} ${pc.dim('move ·')} ${pc.white('Enter')} ${pc.dim('select ·')} ${pc.white('Ctrl+C')} ${pc.dim('cancel ·')} ${pc.white(`${CLI_BIN} help`)} ${pc.dim('commands')}`
  );
  log('');
}
