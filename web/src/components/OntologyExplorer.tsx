import { useEffect, useRef } from 'react';
import { mountOntologyExplorer } from '../ontology/map.ts';

export function OntologyExplorer() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    void mountOntologyExplorer(root);
  }, []);

  return (
    <section
      id="ontology"
      className="ontology-explorer"
      aria-label="Kit ontology map"
      ref={rootRef}
    >
      <div className="ontology-intro">
        <h2 id="ontology-heading" className="ontology-heading">
          Explore the graph
        </h2>
      </div>
      <form className="ontology-toolbar" role="search">
        <label className="ontology-search">
          Find
          <input
            id="ontology-q"
            type="search"
            name="q"
            placeholder="tdd, hexagonal, playwright"
            autoComplete="off"
            aria-describedby="ontology-stats"
          />
        </label>
        <fieldset className="ontology-types" id="ontology-types">
          <legend>Show types</legend>
        </fieldset>
        <p id="ontology-stats" className="ontology-stats">
          Loading index…
        </p>
        <button type="button" id="ontology-clear">
          Clear focus
        </button>
      </form>
      <div className="ontology-stage">
        <div id="ontology-canvas" className="hero-d3-wrapper" />
        <aside id="ontology-inspector" aria-labelledby="ontology-inspector-heading">
          <h3 id="ontology-inspector-heading">Selected entity</h3>
          <div id="ontology-inspector-body" />
        </aside>
      </div>
      <ol id="ontology-matches" className="ontology-matches" hidden />
    </section>
  );
}
