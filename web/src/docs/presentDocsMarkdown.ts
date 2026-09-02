export type DocsFrontmatter = Record<string, string>;

export type SplitDocsMarkdown = {
  frontmatter: DocsFrontmatter | null;
  body: string;
};

function parseSimpleFrontmatter(raw: string): DocsFrontmatter {
  const fields: DocsFrontmatter = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const sep = trimmed.indexOf(':');
    if (sep <= 0) continue;
    const key = trimmed.slice(0, sep).trim();
    let value = trimmed.slice(sep + 1).trim();
    if (
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))
    ) {
      value = value.slice(1, -1);
    }
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value
        .slice(1, -1)
        .split(',')
        .map((part) => part.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean)
        .join(', ');
    }
    if (key) fields[key] = value;
  }
  return fields;
}

export function splitDocsMarkdown(markdown: string): SplitDocsMarkdown {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: null, body: markdown };
  }
  const fields = parseSimpleFrontmatter(match[1]!);
  return {
    frontmatter: Object.keys(fields).length > 0 ? fields : null,
    body: match[2] ?? ''
  };
}

export function presentDocsMarkdown(markdown: string): string {
  return splitDocsMarkdown(markdown).body;
}

export type DocsFenceSegment =
  | { kind: 'markdown'; text: string }
  | { kind: 'widget'; name: string }
  | { kind: 'mermaid'; code: string };

/** Split CommonMark body on widget/mermaid fences so Astro can hydrate only those leaves. */
export function splitFenceSegments(body: string): DocsFenceSegment[] {
  const segments: DocsFenceSegment[] = [];
  const lines = body.split('\n');
  let buffer: string[] = [];
  let fence: { kind: 'widget' | 'mermaid' | 'code'; open: string } | null = null;
  let fenceLines: string[] = [];

  const flushMarkdown = () => {
    if (buffer.length === 0) return;
    const text = buffer.join('\n');
    buffer = [];
    if (text.trim().length === 0) return;
    segments.push({ kind: 'markdown', text });
  };

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (fence) {
      if (trimmed.startsWith('```')) {
        if (fence.kind === 'widget') {
          flushMarkdown();
          segments.push({ kind: 'widget', name: fenceLines.join('\n').trim() });
        } else if (fence.kind === 'mermaid') {
          flushMarkdown();
          segments.push({ kind: 'mermaid', code: fenceLines.join('\n') });
        } else {
          buffer.push(fence.open, ...fenceLines, raw);
        }
        fence = null;
        fenceLines = [];
      } else {
        fenceLines.push(raw);
      }
      continue;
    }
    if (trimmed.startsWith('```')) {
      const info = trimmed.slice(3).trim();
      if (info === 'widget' || info === 'mermaid') {
        fence = { kind: info, open: raw };
        fenceLines = [];
        continue;
      }
      fence = { kind: 'code', open: raw };
      fenceLines = [];
      continue;
    }
    buffer.push(raw);
  }

  if (fence) {
    if (fence.kind === 'widget') {
      flushMarkdown();
      segments.push({ kind: 'widget', name: fenceLines.join('\n').trim() });
    } else if (fence.kind === 'mermaid') {
      flushMarkdown();
      segments.push({ kind: 'mermaid', code: fenceLines.join('\n') });
    } else {
      buffer.push(fence.open, ...fenceLines);
    }
  }
  flushMarkdown();
  return segments;
}
