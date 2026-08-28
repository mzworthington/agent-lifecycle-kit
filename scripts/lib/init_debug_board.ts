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
  process.exit(1);
}

const cmd = args[0];
if (cmd === 'board') {
  const [template, out, title, project, date] = args.slice(1);
  initBoard(template, out, title, project, date);
} else if (cmd === 'handover') {
  const [handover, project, date, board] = args.slice(1);
  initHandover(handover, project, date, board);
}
