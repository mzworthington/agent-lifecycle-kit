export type TodayJobAction = {
  label: string;
  href: string;
};

export type TodayJob = {
  id: string;
  title: string;
  blurb: string;
  why: string;
  steps: string[];
  cmd: string;
  actions: TodayJobAction[];
};

export function parseTodayJobsMarkdown(md: string): TodayJob[];
export function renderJobInline(md: string, codeClass?: string): string;
