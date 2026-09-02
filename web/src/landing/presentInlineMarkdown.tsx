import type { ReactNode } from 'react';
import { Link } from 'wouter';

const TOKEN = /(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*)/g;

/** Turn a short markdown phrase into nodes. Links and code only. */
export function presentInlineMarkdown(text: string): ReactNode[] {
  const parts = text.split(TOKEN);
  return parts.map((part, index) => {
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link) {
      const href = link[2]!;
      const label = link[1]!;
      if (href.startsWith('/')) {
        return (
          <Link key={index} href={href}>
            {label}
          </Link>
        );
      }
      return (
        <a key={index} href={href}>
          {label}
        </a>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}
