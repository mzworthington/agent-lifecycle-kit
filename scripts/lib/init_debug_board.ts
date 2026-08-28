import fs from 'fs';
import path from 'path';

function initBoard(templatePath: string, outPath: string, title: string, project: string, date: string): void {
  let text = fs.readFileSync(path.resolve(templatePath), 'utf8');
  text = text
    .replace(/<short title>/g, title)
    .replace(/<project-name>/g, project)
    .replace(/YYYY-MM-DD/g, date);

  fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
  fs.writeFileSync(path.resolve(outPath), text, 'utf8');
}

function initHandover(handoverPath: string, project: string, date: string, boardPath: string): void {
  const content = `# Handover: debug

## Metadata

| Field | Value |
|-------|-------|
| **Phase** | debug |
| **Status** | BLOCKED |
| **Project** | \`${project}\` |
| **Next agent** | \`agent-pre-commit\` |
| **Date** | ${date} |

## Summary

Debug in progress. Board: \`${boardPath}\`.

## Deliverables

- Debug board (intake)

## Open questions / blockers

- Reproduce not yet proven

## Context for next agent

- See debug board for hypotheses and proof gates
`;

  fs.mkdirSync(path.dirname(path.resolve(handoverPath)), { recursive: true });
  fs.writeFileSync(path.resolve(handoverPath), content, 'utf8');
}

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: init_debug_board.ts <board|handover> [args...]');
  process.exit(1);
}

const cmd = args[0];
if (cmd === 'board') {
  if (args.length < 6) {
    console.error('Usage: init_debug_board.ts board <template> <out> <title> <project> <date>');
    console.error(`  Got ${args.length - 1} arg(s), expected 5`);
    process.exit(1);
  }
  const [, template, out, title, project, date] = args;
  initBoard(template, out, title, project, date);
} else if (cmd === 'handover') {
  if (args.length < 5) {
    console.error('Usage: init_debug_board.ts handover <handover-path> <project> <date> <board-path>');
    console.error(`  Got ${args.length - 1} arg(s), expected 4`);
    process.exit(1);
  }
  const [, handover, project, date, board] = args;
  initHandover(handover, project, date, board);
} else {
  console.error(`ERROR: unknown subcommand "${cmd}". Expected "board" or "handover".`);
  process.exit(1);
}

