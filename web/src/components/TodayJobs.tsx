import { useMemo, useState } from 'react';
import todayMd from '../../../docs/today-jobs.md?raw';
import { presentInlineMarkdown } from '../landing/presentInlineMarkdown.tsx';
import { parseTodayJobsMarkdown } from '../landing/todayJobs.ts';

export function TodayJobs({ showHeading = false }: { showHeading?: boolean }) {
  const jobs = useMemo(() => parseTodayJobsMarkdown(todayMd), []);
  const [activeId, setActiveId] = useState(jobs[0]?.id ?? '');
  const active = jobs.find((job) => job.id === activeId) ?? jobs[0];
  const [copied, setCopied] = useState(false);

  if (!active) return null;

  return (
    <section
      id="today"
      className="today"
      aria-labelledby={showHeading ? 'today-heading' : undefined}
      aria-label={showHeading ? undefined : 'Jobs you can do today'}
    >
      {showHeading ? (
        <>
          <h2 id="today-heading">What do I use this for today?</h2>
          <p className="today-lead">
            Pick the job in front of you. Kit is a product you run, not a docs pile you browse.
          </p>
        </>
      ) : null}
      <div role="group" aria-label="Job list">
        <ul className="job-grid" id="job-grid">
          {jobs.map((job) => (
            <li key={job.id}>
              <button
                type="button"
                className="job-btn"
                aria-pressed={job.id === active.id}
                onClick={() => setActiveId(job.id)}
              >
                <span className="job-title">{job.title}</span>
                <span className="job-blurb">{job.blurb}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="job-panel is-active" aria-live="polite">
        <h3>{active.title}</h3>
        <p className="job-why">{active.why}</p>
        <ol>
          {active.steps.map((step) => (
            <li key={step}>{presentInlineMarkdown(step)}</li>
          ))}
        </ol>
        <p className="job-cmd">
          <span className="job-cmd-label">Start here:</span>
          <span className="job-cmd-row">
            <code title={active.cmd}>{active.cmd}</code>
            <button
              type="button"
              className="job-cmd-copy"
              data-copied={copied ? 'true' : undefined}
              aria-label={`Copy command: ${active.cmd}`}
              onClick={() => {
                void navigator.clipboard?.writeText(active.cmd).then(() => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1500);
                });
              }}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </span>
        </p>
        <ul className="job-actions">
          {active.actions.map((action) => (
            <li key={action.href}>
              <a href={action.href}>{action.label}</a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
