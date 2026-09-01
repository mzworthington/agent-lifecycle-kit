import {
  entityLabel,
  entityMatchesQuery,
  entitySourceUrl,
  filterOntologyGraph,
  hexagonPath,
  HOMEPAGE_TYPE_FILTERS,
  layoutTargets,
  linkStrokeOpacity,
  ontologyFocusHash,
  ontologyLabelVisible,
  parseOntologyHash,
  relatedEdges,
  REL_COLOR,
  shortLabel,
  straightLinkPath,
  toHomepageIndex,
  TYPE_COLOR,
  typeRadius
} from './ontology-graph.js';

const INDEX_URLS = ['./assets/ontology-index.json', './sync/ontology-index.json'];

async function loadIndex() {
  let lastErr = null;
  for (const url of INDEX_URLS) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        lastErr = new Error(`${url} ${res.status}`);
        continue;
      }
      return await res.json();
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('Ontology index not found');
}

function renderTypeFilters(root) {
  const fieldset = root.querySelector('#ontology-types');
  if (!fieldset) return;
  const legend = fieldset.querySelector('legend');
  fieldset.replaceChildren(legend || el('legend', { text: 'Show types' }));
  for (const filter of HOMEPAGE_TYPE_FILTERS) {
    const input = el('input', {
      type: 'checkbox',
      'data-ontology-type': true,
      value: filter.type
    });
    input.checked = filter.defaultOn;
    fieldset.appendChild(el('label', {}, [input, ` ${filter.label}`]));
  }
}

function selectedTypes(root) {
  return Array.from(root.querySelectorAll('[data-ontology-type]'))
    .filter((box) => box.checked)
    .map((box) => box.value);
}

function setFocusHash(focusId) {
  const next = ontologyFocusHash(focusId);
  if (location.hash !== next) history.replaceState(null, '', next);
}

function el(tag, attrs, children) {
  const node = document.createElement(tag);
  if (attrs) {
    Object.entries(attrs).forEach(([k, v]) => {
      if (v == null || v === false) return;
      if (k === 'className') node.className = v;
      else if (k === 'text') node.textContent = v;
      else node.setAttribute(k, v === true ? '' : String(v));
    });
  }
  (children || []).forEach((child) => {
    if (child == null) return;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  });
  return node;
}

function renderInspector(root, index, entity) {
  const panel = root.querySelector('#ontology-inspector-body');
  if (!panel) return;
  panel.replaceChildren();
  const heading = root.querySelector('#ontology-inspector-heading');
  if (!entity) {
    if (heading) heading.textContent = 'Selected entity';
    panel.appendChild(
      el('p', {
        className: 'ontology-empty',
        text: 'Click a node, or search for a name: tdd, hexagonal, playwright.'
      })
    );
    return;
  }

  if (heading) heading.textContent = entityLabel(entity);
  panel.appendChild(el('p', { className: 'ontology-meta', text: entity.type }));
  const url = entitySourceUrl(entity.path);
  if (url) {
    panel.appendChild(el('p', {}, [el('a', { href: url, text: entity.path, rel: 'noopener noreferrer' })]));
  }

  const attrs = entity.attrs || {};
  if (attrs.section) {
    panel.appendChild(
      el('p', { className: 'ontology-meta', text: `CODING_PHILOSOPHY.md §${attrs.section}` })
    );
  }
  if (attrs.phase || attrs.kind) {
    panel.appendChild(
      el('p', { className: 'ontology-meta', text: [attrs.kind, attrs.phase].filter(Boolean).join(' · ') })
    );
  }

  const { outgoing, incoming } = relatedEdges(index, entity.id);

  function list(title, edges, dir) {
    if (!edges.length) return;
    const wrap = el('div', {}, [el('h4', { text: title })]);
    const ul = el('ul', { className: 'ontology-related' });
    edges.forEach((edge) => {
      const otherId = dir === 'out' ? edge.to : edge.from;
      const other = index.entities.find((e) => e.id === otherId);
      const btn = el('button', { type: 'button', className: 'ontology-related-btn' }, [
        el('span', { className: 'ontology-rel', text: edge.relation }),
        el('span', { text: other ? entityLabel(other) : otherId })
      ]);
      btn.addEventListener('click', () => {
        root.dispatchEvent(new CustomEvent('ontology-focus', { detail: { id: otherId } }));
      });
      ul.appendChild(el('li', {}, [btn]));
    });
    wrap.appendChild(ul);
    panel.appendChild(wrap);
  }

  list('Outgoing', outgoing, 'out');
  list('Incoming', incoming, 'in');
}

function renderMatches(root, entities, onPick) {
  const list = root.querySelector('#ontology-matches');
  if (!list) return;
  list.replaceChildren();
  entities.slice(0, 12).forEach((entity) => {
    const btn = el('button', { type: 'button', className: 'ontology-match' }, [
      el('span', { text: entityLabel(entity) }),
      el('span', { text: entity.type })
    ]);
    btn.addEventListener('click', () => onPick(entity.id));
    list.appendChild(el('li', {}, [btn]));
  });
  list.hidden = entities.length === 0;
}

function initExplorer(root, index) {
  const d3 = globalThis.d3;
  if (typeof d3 === 'undefined') {
    renderInspector(root, index, null);
    const stats = root.querySelector('#ontology-stats');
    if (stats) stats.textContent = 'Graph needs D3. Refresh, or use the search list below.';
    return;
  }

  const canvas = root.querySelector('#ontology-canvas');
  const stats = root.querySelector('#ontology-stats');
  const search = root.querySelector('#ontology-q');
  const form = root.querySelector('.ontology-toolbar');
  if (form) form.addEventListener('submit', (event) => event.preventDefault());
  const clearBtn = root.querySelector('#ontology-clear');
  const width = 1400;
  const height = 820;
  renderTypeFilters(root);
  const publicIndex = toHomepageIndex(index);

  const svg = d3
    .select(canvas)
    .append('svg')
    .attr('class', 'hero-d3-svg')
    .attr('role', 'img')
    .attr('aria-labelledby', 'ontology-heading')
    .attr('viewBox', [0, 0, width, height]);

  const g = svg.append('g');
  const captionG = g.append('g').attr('class', 'onto-captions');
  const linkG = g.append('g').attr('class', 'onto-links');
  const nodeG = g.append('g').attr('class', 'onto-nodes');

  let zoomK = 1;
  const zoom = d3.zoom().scaleExtent([0.35, 4]).on('zoom', (event) => {
    zoomK = event.transform.k;
    g.attr('transform', event.transform);
    nodeG.selectAll('.onto-label').style('opacity', (d) =>
      ontologyLabelVisible({ type: d.type, id: d.id, focusId, hoverId, zoomK }) ? 1 : 0
    );
  });
  svg.call(zoom);

  let focusId = parseOntologyHash(location.hash).focusId;
  let hoverId = null;
  const byId = new Map(publicIndex.entities.map((e) => [e.id, e]));

  function currentView() {
    return filterOntologyGraph(publicIndex, {
      types: selectedTypes(root),
      query: search ? search.value : '',
      focusId: focusId || undefined,
      hops: 1
    });
  }

  function focusEntity(id) {
    focusId = id;
    setFocusHash(id);
    renderInspector(root, index, byId.get(id) || null);
    draw();
  }

  function applyLabelOpacity() {
    nodeG.selectAll('.onto-label').style('opacity', (n) =>
      ontologyLabelVisible({ type: n.type, id: n.id, focusId, hoverId, zoomK }) ? 1 : 0
    );
  }

  root.addEventListener('ontology-focus', (event) => {
    focusEntity(event.detail.id);
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      focusId = null;
      if (search) search.value = '';
      setFocusHash(null);
      renderInspector(root, index, null);
      draw();
    });
  }

  svg.on('click', (event) => {
    if (event.target === svg.node()) {
      focusId = null;
      setFocusHash(null);
      renderInspector(root, index, null);
      draw();
    }
  });

  function draw() {
    const view = currentView();
    const query = search ? search.value.trim() : '';
    const hits = query ? publicIndex.entities.filter((e) => entityMatchesQuery(e, query)) : [];
    renderMatches(root, hits, focusEntity);

    if (stats) {
      stats.textContent = `${view.entities.length} entities · ${view.edges.length} relations${
        focusId ? ' · neighborhood' : ''
      }`;
    }

    const nodes = view.entities.map((entity) => {
      const degree = view.degrees.get(entity.id) || 0;
      return {
        id: entity.id,
        type: entity.type,
        entity,
        color: TYPE_COLOR[entity.type] || '#9aa7b8',
        r: typeRadius(entity.type, degree)
      };
    });
    const layout = layoutTargets(nodes, width, height);
    for (const node of nodes) {
      const t = layout.targets.get(node.id);
      node.x = t.x;
      node.y = t.y;
    }
    const nodeIndex = new Map(nodes.map((n) => [n.id, n]));
    const links = view.edges
      .map((edge) => ({
        ...edge,
        color: REL_COLOR[edge.relation] || '#9aa7b8'
      }))
      .filter((l) => nodeIndex.has(l.from) && nodeIndex.has(l.to));

    captionG
      .selectAll('text')
      .data(focusId ? [] : layout.captions, (d) => d.label)
      .join('text')
      .attr('x', (d) => d.x)
      .attr('y', (d) => d.y)
      .attr('text-anchor', 'middle')
      .attr('fill', '#9aa7b8')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('letter-spacing', '0.04em')
      .attr('pointer-events', 'none')
      .text((d) => d.label);

    linkG
      .selectAll('path')
      .data(links, (d) => `${d.from}|${d.relation}|${d.to}`)
      .join('path')
      .attr('fill', 'none')
      .attr('stroke', (d) => d.color)
      .attr('stroke-opacity', (d) => linkStrokeOpacity(focusId, d.from, d.to))
      .attr('stroke-width', (d) => (d.relation === 'orders' ? 2 : 1.05))
      .attr('d', (d) => {
        const s = nodeIndex.get(d.from);
        const t = nodeIndex.get(d.to);
        return s && t ? straightLinkPath(s.x, s.y, t.x, t.y) : '';
      });

    const node = nodeG
      .selectAll('g')
      .data(nodes, (d) => d.id)
      .join((enter) => {
        const grp = enter.append('g').attr('class', 'onto-node').style('cursor', 'pointer');
        grp
          .append('path')
          .attr('class', 'onto-shape')
          .attr('fill', 'rgba(12, 16, 23, 0.92)');
        grp
          .append('text')
          .attr('class', 'onto-label')
          .attr('text-anchor', 'middle')
          .attr('dy', (d) => d.r + 12)
          .attr('fill', '#e8edf4')
          .attr('font-size', '10px')
          .attr('font-family', 'IBM Plex Sans, sans-serif')
          .attr('pointer-events', 'none');
        return grp;
      });

    node.attr('transform', (d) => `translate(${d.x},${d.y})`);
    node
      .select('.onto-shape')
      .attr('d', (d) => hexagonPath(d.r))
      .attr('stroke', (d) => d.color)
      .attr('stroke-width', (d) => (d.id === focusId ? 3 : 1.5));
    node
      .select('.onto-label')
      .text((d) => shortLabel(entityLabel(d.entity)))
      .style('opacity', (d) =>
        ontologyLabelVisible({ type: d.type, id: d.id, focusId, hoverId, zoomK }) ? 1 : 0
      );

    node
      .on('click', (event, d) => {
        event.stopPropagation();
        focusEntity(d.id);
      })
      .on('mouseenter', (event, d) => {
        hoverId = d.id;
        applyLabelOpacity();
      })
      .on('mouseleave', () => {
        hoverId = null;
        applyLabelOpacity();
      })
      .on('keydown', (event, d) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          focusEntity(d.id);
        }
      })
      .attr('tabindex', 0)
      .attr('role', 'button')
      .attr('aria-label', (d) => `${d.entity.type} ${entityLabel(d.entity)}`);
  }

  if (search) {
    let t = 0;
    search.addEventListener('input', () => {
      window.clearTimeout(t);
      t = window.setTimeout(draw, 120);
    });
    search.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      const hits = publicIndex.entities.filter((e) => entityMatchesQuery(e, search.value));
      if (hits[0]) focusEntity(hits[0].id);
    });
  }

  root.querySelectorAll('[data-ontology-type]').forEach((box) => {
    box.addEventListener('change', () => draw());
  });

  if (focusId && byId.has(focusId)) renderInspector(root, index, byId.get(focusId));
  else renderInspector(root, index, null);
  draw();
}

async function boot() {
  const root = document.getElementById('ontology');
  if (!root) return;
  const stats = root.querySelector('#ontology-stats');
  try {
    const index = await loadIndex();
    if (stats) stats.textContent = `${index.entities.length} entities in the live index`;
    initExplorer(root, index);
  } catch (_) {
    if (stats) {
      stats.textContent = 'Index missing. From the kit repo run pnpm kit ontology generate, then refresh.';
    }
    renderInspector(root, { entities: [], edges: [] }, null);
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
