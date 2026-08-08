---
title: Agent Kit Review
kind: task
frequency: weekly
triggers:
  - kit review
  - promote lessons
  - improve agents
  - kit maintenance
---
# Agent Kit Review

Run this checklist weekly (or after a major feature) to turn local session lessons into durable kit improvements.

## 1. Scan local lessons

- [ ] Open `~/.agents/lessons/<project>/` for each active project
- [ ] List entries with `Status: pending` (format: [templates/lesson.md](../templates/lesson.md))
- [ ] Merge duplicates (same lesson, multiple dates → one promoted rule)

## 2. Triage each pending lesson

For each entry, decide:

| Decision | Action |
|----------|--------|
| **Promote** | Update the target file in the kit repo; mark lesson `promoted` |
| **Project-only** | Move rule to the app repo `.cursor/skills/`; mark `promoted` |
| **Reject** | No change needed; mark `rejected` with a one-line reason |

### Promotion targets

| Lesson type | Where it goes |
|-------------|---------------|
| Tone, planning, collaboration | [CODING_PHILOSOPHY.md](../CODING_PHILOSOPHY.md) §8 |
| Catalog / XFN procedure | [SOPs/behavior-catalog-and-xfn.md](../SOPs/behavior-catalog-and-xfn.md) |
| Cloudflare hosting / ops diagnosis | [SOPs/cloudflare-observability-and-diagnosis.md](../SOPs/cloudflare-observability-and-diagnosis.md) |
| Repeatable procedure | [SOPs/](../SOPs/) or [tasks/](../tasks/) |
| Stack-specific / XFN tooling | [skills/lang-*](../skills/) or [skills/framework-*](../skills/) |
| Lifecycle behavior | [skills/agent-*](../skills/) (esp. tdd, xfn, arch-drift, telemetry) |
| Project quirk | App repo only |

## 3. Audit the shared kit

- [ ] Run [agent-arch-drift](../skills/agent-arch-drift/SKILL.md) against the kit repo: duplicate rules, contradictions, skills that grew too long
- [ ] Check [skills/README.md](../skills/README.md) taxonomy still matches actual skills
- [ ] Confirm [AGENTS.md](../AGENTS.md) is canonical and [GEMINI.md](../GEMINI.md) still points to it
- [ ] Spot-check recent `handover/<project>/` runs: was test impact aligned? Was an XFN matrix present (including skip reasons)? Were apply suites greened?
- [ ] Confirm stack profiles still list XFN tooling defaults consistent with [agent-xfn](../skills/agent-xfn/SKILL.md)

## 4. Commit promoted changes

- [ ] Commit kit updates with a message that references the lesson title(s)
- [ ] Pull latest kit on other machines (`git pull` in the clone behind `~/.agents`)

## 5. Optional retro

After a multi-phase lifecycle run, check `handover/<project>/` for friction that never became a lesson. Add any worth keeping before closing the feature.
