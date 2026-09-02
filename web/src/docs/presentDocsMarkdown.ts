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
