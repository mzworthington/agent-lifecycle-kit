import { useEffect, useId, useState } from 'react';
import { queueMermaidRender } from './mermaidRenderer.ts';

type MermaidApi = {
  initialize: (config: Record<string, unknown>) => void;
  render: (id: string, code: string) => Promise<{ svg: string }>;
};

let mermaidReady: Promise<MermaidApi> | undefined;

async function getMermaid(): Promise<MermaidApi> {
  mermaidReady ??= (async () => {
    const { default: mermaid } = await import('mermaid');
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'strict',
      flowchart: { useMaxWidth: true, htmlLabels: true }
    });
    return mermaid;
  })();
  return mermaidReady;
}

type Props = { code: string };

export function MermaidPreview({ code }: Props) {
  const reactId = useId().replace(/:/g, '');
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!code) return;
      setRendering(true);
      setError('');
      try {
        const mermaid = await getMermaid();
        if (!active) return;
        const id = `mermaid-${reactId}-${Math.random().toString(36).slice(2, 9)}`;
        const { svg: rendered } = await queueMermaidRender(() => mermaid.render(id, code));
        if (active) {
          setSvg(rendered);
          setRendering(false);
        }
      } catch {
        if (active) {
          setError('Could not render diagram.');
          setRendering(false);
        }
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [code, reactId]);

  if (error) {
    return (
      <div className="docs-mermaid docs-mermaid-error" role="alert">
        <p>{error}</p>
        <pre>
          <code>{code}</code>
        </pre>
      </div>
    );
  }

  if (rendering && !svg) {
    return (
      <div className="docs-mermaid docs-mermaid-loading" aria-busy="true">
        Loading diagram…
      </div>
    );
  }

  return (
    <div
      className="docs-mermaid"
      data-testid="docs-mermaid"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
