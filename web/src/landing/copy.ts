export const HOME_EYEBROW = 'Eval-Driven Development';
export const HOME_BRAND = 'Agent Lifecycle Kit';
export const HOME_HEADLINE = 'Test the tools your agents call';
export const HOME_LEDE =
  'Wrong tool, made-up args, endless retries. Those failures do not look like stack traces. EDD is a red-green-refactor loop for prompts, MCP schemas, and routing, with a CI gate on routing accuracy.';

export const HOME_BADGES = [
  {
    href: 'https://github.com/mzworthington/agent-lifecycle-kit/actions',
    src: 'https://img.shields.io/badge/CI-Passing-brightgreen?style=for-the-badge&logo=github-actions',
    alt: 'CI passing',
    width: 130,
    height: 28
  },
  {
    href: '/LICENSE',
    src: 'https://img.shields.io/badge/License-Unlicense-success?style=for-the-badge',
    alt: 'Unlicense',
    width: 140,
    height: 28
  }
] as const;

export const HOME_NEXT = [
  { href: '/docs/start', title: 'Install kit in 10 minutes', body: 'One-liner, demo suite, 95% bar. No API key.' },
  { href: '/docs/edd', title: 'EDD guide', body: 'Evals, CI, live keys, and turning a miss into the next case.' },
  { href: '/docs/map', title: 'Kit map', body: 'Skills, SOPs, and how they connect.' },
  { href: '/docs', title: 'Docs overview', body: 'Start, practice, and reference in one place.' }
];
