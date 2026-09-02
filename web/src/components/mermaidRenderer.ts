let tail: Promise<unknown> = Promise.resolve();

/** Mermaid's render() is not re-entrant; serialize calls across islands and Strict Mode. */
export function queueMermaidRender<T>(run: () => Promise<T>): Promise<T> {
  const next = tail.then(run, run);
  tail = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}
