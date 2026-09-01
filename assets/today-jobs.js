/**
 * Landing-page "today" jobs. Source of truth is docs/today-jobs.md.
 * @typedef {{ id: string, title: string, blurb: string, why: string, steps: string[], cmd: string, actions: { label: string, href: string }[] }} TodayJob
 */

/**
 * @param {string} md
 * @returns {TodayJob[]}
 */
export function parseTodayJobsMarkdown(md) {
  const jobs = [];
  const parts = String(md).split(/^## /m).slice(1);

  for (const part of parts) {
    const newline = part.indexOf('\n');
    const heading = (newline === -1 ? part : part.slice(0, newline)).trim();
    const sep = heading.indexOf('|');
    if (sep === -1) continue;

    const id = heading.slice(0, sep).trim();
    const title = heading.slice(sep + 1).trim();
    if (!id || !title) continue;

    const body = newline === -1 ? '' : part.slice(newline + 1);
    jobs.push({
      id,
      title,
      blurb: extractBlurb(body),
      why: extractWhy(body),
      steps: extractSteps(body),
      cmd: extractCommand(body),
      actions: extractActions(body)
    });
  }

  return jobs;
}

/**
 * @param {string} md
 * @param {string} [codeClass]
 * @returns {string}
 */
export function renderJobInline(md, codeClass) {
  const classAttr = codeClass ? ` class="${codeClass}"` : '';
  return String(md)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/`([^`]+)`/g, `<code${classAttr}>$1</code>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

/**
 * @param {string} body
 * @returns {string}
 */
function extractBlurb(body) {
  const match = body.match(/^>\s*.*(?:\n>\s*.*)*/m);
  if (!match) return '';
  return match[0]
    .split('\n')
    .map((line) => line.replace(/^>\s?/, ''))
    .join(' ')
    .trim();
}

/**
 * @param {string} body
 * @returns {string}
 */
function extractWhy(body) {
  const lines = body.split('\n');
  const buf = [];
  let inFence = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (trimmed.startsWith('>')) {
      if (buf.length) break;
      continue;
    }
    if (/^\d+\.\s/.test(trimmed) || trimmed.startsWith('- [')) {
      if (buf.length) break;
      continue;
    }
    if (trimmed === '') {
      if (buf.length) break;
      continue;
    }
    buf.push(trimmed);
  }

  return buf.join(' ');
}

/**
 * @param {string} body
 * @returns {string[]}
 */
function extractSteps(body) {
  const steps = [];
  for (const line of body.split('\n')) {
    const match = line.match(/^\s*\d+\.\s+(.+)/);
    if (match) steps.push(match[1].trim());
  }
  return steps;
}

/**
 * @param {string} body
 * @returns {string}
 */
function extractCommand(body) {
  const match = body.match(/```[^\n]*\n([\s\S]*?)```/);
  return match ? match[1].replace(/\n$/, '') : '';
}

/**
 * @param {string} body
 * @returns {{ label: string, href: string }[]}
 */
function extractActions(body) {
  const actions = [];
  const re = /^\s*-\s+\[(.+?)\]\((.+?)\)\s*$/gm;
  let match;
  while ((match = re.exec(body)) !== null) {
    actions.push({ label: match[1], href: match[2] });
  }
  return actions;
}
