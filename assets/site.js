import { parseTodayJobsMarkdown, renderJobInline } from './today-jobs.js';

function initSiteNav() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('site-nav');
  if (!toggle || !nav) return;

  const desktopQuery = window.matchMedia('(min-width: 769px)');

  function setOpen(open) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('nav-open', open);
  }

  function close() {
    setOpen(false);
  }

  toggle.addEventListener('click', (event) => {
    event.stopPropagation();
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', close);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || toggle.getAttribute('aria-expanded') !== 'true') return;
    close();
    toggle.focus();
  });

  document.addEventListener('click', (event) => {
    if (toggle.getAttribute('aria-expanded') !== 'true') return;
    if (event.target.closest('header')) return;
    close();
  });

  const onBreakpoint = (event) => {
    if (event.matches) close();
  };
  if (typeof desktopQuery.addEventListener === 'function') {
    desktopQuery.addEventListener('change', onBreakpoint);
  } else if (typeof desktopQuery.addListener === 'function') {
    desktopQuery.addListener(onBreakpoint);
  }
}

function initTodayJobs() {
  const grid = document.getElementById('job-grid');
  const panel = document.getElementById('job-panel');
  if (!grid || !panel) return;

  const titleEl = document.getElementById('job-panel-title');
  const whyEl = document.getElementById('job-panel-why');
  const stepsEl = document.getElementById('job-panel-steps');
  const cmdTextEl = document.getElementById('job-panel-cmd-text');
  const cmdCopyBtn = document.getElementById('job-panel-cmd-copy');
  const actionsEl = document.getElementById('job-panel-actions');
  let copyResetTimer = 0;
  /** @type {{ id: string, title: string, blurb: string, why: string, steps: string[], cmd: string, actions: { label: string, href: string }[] }[]} */
  let jobs = [];

  function setJobCommand(cmd) {
    if (!cmdTextEl || !cmdCopyBtn) return;
    cmdTextEl.textContent = cmd;
    cmdTextEl.setAttribute('title', cmd);
    cmdCopyBtn.dataset.cmd = cmd;
    cmdCopyBtn.setAttribute('aria-label', `Copy command: ${cmd}`);
    cmdCopyBtn.dataset.copied = 'false';
    cmdCopyBtn.textContent = 'Copy';
  }

  async function copyJobCommand() {
    if (!cmdCopyBtn) return;
    const cmd = cmdCopyBtn.dataset.cmd || '';
    if (!cmd) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(cmd);
      } else {
        const ta = document.createElement('textarea');
        ta.value = cmd;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      cmdCopyBtn.dataset.copied = 'true';
      cmdCopyBtn.textContent = 'Copied';
      window.clearTimeout(copyResetTimer);
      copyResetTimer = window.setTimeout(() => {
        cmdCopyBtn.dataset.copied = 'false';
        cmdCopyBtn.textContent = 'Copy';
      }, 1600);
    } catch (_) {
      cmdCopyBtn.textContent = 'Copy failed';
      window.clearTimeout(copyResetTimer);
      copyResetTimer = window.setTimeout(() => {
        cmdCopyBtn.textContent = 'Copy';
      }, 1600);
    }
  }

  function bindButtons() {
    grid.querySelectorAll('.job-btn[data-job]').forEach((btn) => {
      btn.addEventListener('click', () => render(btn.dataset.job));
    });
  }

  function paintGrid(activeId) {
    grid.replaceChildren();
    for (const job of jobs) {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'job-btn';
      button.dataset.job = job.id;
      button.setAttribute('aria-pressed', String(job.id === activeId));
      const title = document.createElement('span');
      title.className = 'job-title';
      title.textContent = job.title;
      const blurb = document.createElement('span');
      blurb.className = 'job-blurb';
      blurb.innerHTML = renderJobInline(job.blurb);
      button.append(title, blurb);
      item.append(button);
      grid.append(item);
    }
    bindButtons();
  }

  function render(jobId) {
    const job = jobs.find((entry) => entry.id === jobId);
    if (!job || !titleEl || !whyEl || !stepsEl || !actionsEl) return;
    grid.querySelectorAll('.job-btn[data-job]').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.job === jobId));
    });
    panel.dataset.active = jobId;
    panel.classList.remove('is-active');
    void panel.offsetWidth;
    panel.classList.add('is-active');
    titleEl.textContent = job.title;
    whyEl.textContent = job.why;
    stepsEl.replaceChildren();
    for (const step of job.steps) {
      const li = document.createElement('li');
      li.innerHTML = renderJobInline(step, 'cli-inline');
      stepsEl.append(li);
    }
    setJobCommand(job.cmd);
    actionsEl.replaceChildren();
    for (const action of job.actions) {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = action.href;
      link.textContent = action.label;
      li.append(link);
      actionsEl.append(li);
    }
  }

  if (cmdCopyBtn) {
    cmdCopyBtn.addEventListener('click', () => {
      void copyJobCommand();
    });
  }

  fetch('./docs/today-jobs.md')
    .then((response) => {
      if (!response.ok) throw new Error(String(response.status));
      return response.text();
    })
    .then((md) => {
      const parsed = parseTodayJobsMarkdown(md);
      if (!parsed.length) return;
      jobs = parsed;
      const active = panel.dataset.active || jobs[0].id;
      paintGrid(active);
      render(jobs.some((job) => job.id === active) ? active : jobs[0].id);
    })
    .catch(() => {
      /* Keep the static HTML fallback in index.html. */
    });
}

function initEvalDemo() {
  const tabs = Array.from(document.querySelectorAll('.demo-tab[data-step]'));
  const stages = Array.from(document.querySelectorAll('.demo-stage[data-step]'));
  const prev = document.getElementById('demo-prev');
  const next = document.getElementById('demo-next');
  const fill = document.getElementById('demo-progress-fill');
  if (!tabs.length || !stages.length || !prev || !next || !fill) return;

  const nextLabels = ['Next: Red', 'Next: Report', 'Next: Green', 'Next: Gate', 'Done'];
  let step = 0;

  function show(index) {
    step = Math.max(0, Math.min(index, tabs.length - 1));
    tabs.forEach((tab, i) => {
      const selected = i === step;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    stages.forEach((stage, i) => {
      const active = i === step;
      stage.hidden = !active;
      stage.classList.toggle('is-active', active);
    });
    fill.style.width = `${((step + 1) / tabs.length) * 100}%`;
    prev.disabled = step === 0;
    next.disabled = step === tabs.length - 1;
    next.textContent = nextLabels[step] || 'Next';
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => show(Number(tab.dataset.step)));
    tab.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      event.preventDefault();
      const delta = event.key === 'ArrowRight' ? 1 : -1;
      const target = Math.max(0, Math.min(step + delta, tabs.length - 1));
      show(target);
      tabs[target].focus();
    });
  });
  prev.addEventListener('click', () => show(step - 1));
  next.addEventListener('click', () => show(step + 1));
  show(0);
}

// Page chrome: nav, job picker, eval demo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initSiteNav();
    initTodayJobs();
    initEvalDemo();
  });
} else {
  initSiteNav();
  initTodayJobs();
  initEvalDemo();
}

const initMermaid = () => {
  if (typeof mermaid === 'undefined' || typeof mermaid.initialize !== 'function') return;
  mermaid.initialize({ startOnLoad: false, theme: 'dark' });
  if (typeof mermaid.run === 'function') {
    mermaid.run({ querySelector: '.diagram .mermaid' });
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMermaid);
} else {
  initMermaid();
}

function renderMarkdownContent(text) {
  const container = document.getElementById('markdown-body');
  if (!container) return;

  try {
    const cleanedText = text
      .replace(/<img src="\.\/assets\/kit_banner\.png"[\s\S]*?\/>/, '')
      .replace(/## 🧭 Multi-Agent Lifecycle Flow/, '<h2 id="flow">Multi-agent lifecycle flow</h2>');
    let parsedHtml = '';
    if (typeof marked !== 'undefined' && typeof marked.parse === 'function') {
      parsedHtml = marked.parse(cleanedText);
    } else if (typeof marked === 'function') {
      parsedHtml = marked(cleanedText);
    } else {
      parsedHtml = `<pre style="white-space: pre-wrap; color: var(--text-muted);">${cleanedText}</pre>`;
    }
    container.innerHTML = parsedHtml;

    // Wrap tables in responsive container to prevent horizontal viewport expansion on mobile/small screens
    container.querySelectorAll('table').forEach((table) => {
      if (!table.parentElement.classList.contains('table-wrapper')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'table-wrapper';
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
      }
    });

    if (typeof mermaid !== 'undefined') {
      const codeBlocks = container.querySelectorAll('code.language-mermaid');
      codeBlocks.forEach((block) => {
        const pre = block.parentElement;
        const div = document.createElement('div');
        div.className = 'mermaid';
        div.textContent = block.textContent;
        pre.replaceWith(div);
      });

      try {
        if (typeof mermaid.run === 'function') {
          mermaid.run();
        } else if (typeof mermaid.init === 'function') {
          mermaid.init();
        }
      } catch (mErr) {
        console.warn('Mermaid rendering warning:', mErr);
      }
    }
  } catch (err) {
    console.error('Markdown rendering error:', err);
    container.innerHTML = `<pre style="white-space: pre-wrap; color: var(--text-muted);">${text}</pre>`;
  }
}

function loadEddGuide() {
  const el = document.getElementById('doc-full');
  const fallback = document.getElementById('doc-static');
  if (!el) return;
  fetch('./docs/edd.md')
    .then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.text();
    })
    .then((md) => {
      const withoutDiagrams = md.replace(/```mermaid[\s\S]*?```/g, '');
      let html = '';
      if (typeof marked !== 'undefined' && typeof marked.parse === 'function') {
        html = marked.parse(withoutDiagrams);
      } else if (typeof marked === 'function') {
        html = marked(withoutDiagrams);
      } else {
        html = '<pre>' + withoutDiagrams.replace(/</g, '&lt;') + '</pre>';
      }
      el.innerHTML = html;
      if (fallback) fallback.hidden = true;
    })
    .catch(() => {
      el.innerHTML = '<p>Could not load <a href="./docs/edd.md">docs/edd.md</a>.</p>';
    });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadEddGuide);
} else {
  loadEddGuide();
}
