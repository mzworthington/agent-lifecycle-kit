import type { DocsFrontmatter } from '../docs/presentDocsMarkdown';

const FIELD_LABELS: Record<string, string> = {
  status: 'Status',
  date: 'Date',
  deciders: 'Deciders'
};

type Props = {
  fields: DocsFrontmatter;
};

export function DocsFrontmatterMeta({ fields }: Props) {
  const entries = Object.entries(fields);
  if (entries.length === 0) return null;

  return (
    <dl className="docs-frontmatter" data-testid="docs-frontmatter">
      {entries.map(([key, value]) => (
        <div key={key} className="docs-frontmatter-item">
          <dt>{FIELD_LABELS[key] ?? key}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
