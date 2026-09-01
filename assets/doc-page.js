/** Rendered doc pages: upgrade mermaid fences once the CDN script is present. */
const initMermaid = () => {
  if (typeof mermaid === 'undefined' || typeof mermaid.initialize !== 'function') return;
  mermaid.initialize({ startOnLoad: false, theme: 'dark' });
  if (typeof mermaid.run === 'function') {
    mermaid.run({ querySelector: 'pre.mermaid' });
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMermaid);
} else {
  initMermaid();
}
