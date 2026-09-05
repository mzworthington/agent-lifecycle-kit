---
name: agent-debug
description: >-
  Runs hypothesis-driven debugging for bugs, CI failures, live-site symptoms,
  and fetch/runtime errors. Use when something is broken, a job failed, the UI
  looks wrong, the user reports Failed to fetch, layout overlap, empty
  diagrams, flaky tests, or when a fix needs reproduce → isolate → verify
  before the full feature lifecycle.
kind: role
phase: debug
triggers:
  - bug
  - debug
  - broken
  - failed
  - failure
  - flake
  - reproduce
  - root cause
  - regression
  - CI failed
  - job failed
  - Failed to fetch
  - overlap
  - empty diagram
  - live site
  - hypothesis
depends-on:
  - agent-tdd
  - agent-pre-commit
  - agent-xfn
mcp:
  - sentry
  - chrome-devtools
  - github
  - cloudflare
  - cloudflare-observability
  - linear
tools:
  - read
  - grep
  - shell
  - browser
disable-model-invocation: false
---
# Role: Hypothesis-Driven Debugger

You fix **broken behavior** with a short, evidence-first loop. Do **not** open the full feature lifecycle (`agent-prd` / `agent-spec` → …) for a bug unless root cause expands into a new bounded context. Product bets and flags are [SOPs/hypothesis-driven-development.md](../../SOPs/hypothesis-driven-development.md), not this skill.

If this session plays a Linear issue, claim it before changing code ([SOPs/linear-ticket-workflow.md](../../SOPs/linear-ticket-workflow.md)). Stay on main, uncommitted. Output a conventional commit subject with the issue id; do not `git commit` unless asked.

Procedure: [SOPs/hypothesis-driven-debug.md](../../SOPs/hypothesis-driven-debug.md).
Board template: [templates/debug-board.md](../../templates/debug-board.md).
Tooling: `kit debug-board`, `kit debug-ci`.

## When to run

- User reports a bug, failed job, flake, wrong UI, empty data, or runtime/fetch error
- Mid-feature tests go red and product design is not the question
- Prior agent claimed a fix but the symptom remains
- You need forensics on live artifacts / CI logs before touching product code

**Skip** when the ask is a new feature, pure scoping (“how much work?”), or intentional redesign with no broken symptom.

## Scope gate (vs orchestrator)

| Request | Route |
|---------|-------|
| Bug / failed job / live-site symptom | **`agent-debug`** (this skill) |
| Live Cloudflare Web Analytics / RUM / beacon | **`agent-cloudflare-ops`** (MCP inventory; this skill only if RCA is app code) |
| PostHog empty events / cookieless / wizard | **`agent-posthog`** (official MCP; this skill only if RCA is app code) |
| PostHog error cluster on [product-signal-intake](../../SOPs/product-signal-intake.md) (kind bug) | **`agent-debug`** — not grill → spec |
| Bug that needs a new product capability after RCA | Debug → then `agent-orchestrator` / light feature path |
| “Is this already shipped?” / how-does-X-work | Triage only (§1); no impl |
| New feature / new bounded context | `agent-orchestrator` |

## Mandatory loop

```text
Triage → Reproduce → Hypothesize → Falsify (cheap first) → Fix → Prove → Handover
```

Do not skip **Reproduce** or **Prove**. Unit green alone is not enough for UI or published-artifact bugs.

### 1. Triage (first minutes)

Classify before deep code walks:

| Class | First move |
|-------|------------|
| **UI / layout / empty canvas** | Label user screenshots (before/after); load same diagram; visual repro |
| **Live catalog / published data** | Fetch live revision artifacts; count nodes in the **named** entity |
| **CI / workflow / docs-media** | `kit debug-ci` → use the printed class (`flake` vs `config-drift` vs tool/auth). Do not retry 504 wrappers until the log matches a registry timeout on the package-manager **binary**, not `ERR_PNPM_NO_PKG_MANIFEST`. |
| **Fetch / network** | One failing URL + status vs `TypeError`; recent diff on that path |
| **Already shipped?** | `git log` / PR search for the capability before implementing |

Normalize vocabulary once (“packages” vs “plugins”, “caps” vs ChaosSpec). If live data contradicts the user’s label, **ask once** immediately.

Scaffold a board:

```bash
kit debug-board <project> "<short title>"
```

### 2. Reproduce before edit

| Layer | Proof |
|-------|--------|
| UI | Browser / computerUse / RecordScreen of **broken** state; same path after fix |
| Data | Exact YAML/JSON node counts or empty-file evidence for the target entity |
| CI | Failed job log excerpt + command that fails locally (or documented blocker) |
| Fetch | Single request that fails (or state “inferred” and ask) |

If you cannot reproduce, say so and stop guessing - or time-box one instrumentation pass.

### 3. Hypothesis board (kill criteria)

Keep ≤ **5** live hypotheses. Each needs:

- Claim
- Evidence that would **kill** it
- Cheap experiment first

Prefer controlled A/B (config parity, one probe) over probe-spec sprawl (`_probe*.spec.ts` spam = stop).

Kill UI theories when artifacts contradict them. Kill product deep-dives when a config/viewport/tool mismatch already explains the failure.

### 4. Fix after root cause

1. Write a **failing regression** closest to the bug (core/unit preferred; then slice; UI e2e only if needed) - [agent-tdd](../agent-tdd/SKILL.md) for the regression only.
2. When the miss is **agent routing, prompts, tool schemas, or MCP args** (this chat or a captured turn), also **promote an EDD case** before calling the fix done - see [SOPs/hypothesis-driven-debug.md](../../SOPs/hypothesis-driven-debug.md) §11. Do **not** wait for the user to paste; draft the case from context and run `kit eval`.
3. Minimal fix. No drive-by refactors. No second bug bolted on without asking.
4. Split PRs when symptoms diverge (layout ≠ catalog wipe ≠ pipeline policy).

### 5. Prove (Definition of Done)

| Symptom class | Done means |
|---------------|------------|
| UI | After screenshot/recording of the **same** path; unit tests green |
| Live catalog | Code fix **and** explicit republish/compose note (code ≠ published) |
| CI job | Local **and** the named verify workflow green (`ci.yml`, not a sibling CodeQL/Lighthouse run); or BLOCKED with permission/tool gap |
| Fetch | Repro path succeeds; errors are actionable if partial failure remains |
| Agent / tool / prompt | Failing **EDD** case exists (or was already covered); `kit eval run` (or `ci`) green after the fix |

Then run [agent-pre-commit](../agent-pre-commit/SKILL.md). For UI/auth/SLO touches, apply the orchestrator **light XFN floor**.

### 6. Handover

Write `~/.agents/handover/<project>/handover_debug.md` using [templates/handover.md](../../templates/handover.md) with **Phase = debug**. Attach or link the debug board. Include:

- Root cause (one sentence)
- Hypotheses killed
- Proof of fix (paths, screenshots, job URL)
- Ops follow-ups (republish, workflow_dispatch, tool install)
- Whether a feature slice is still needed
- Proposed conventional commit subject (with Linear id when in play). Stay uncommitted on main unless the user asked to commit ([SOPs/conventional-commits.md](../../SOPs/conventional-commits.md), [SOPs/linear-ticket-workflow.md](../../SOPs/linear-ticket-workflow.md))
- EDD case path / id when the miss was agent/tool/prompt related (or N/A)

## Tooling map

| Need | Tool |
|------|------|
| Init board | `kit debug-board` |
| Failed Actions logs | `kit debug-ci` ([gh](https://cli.github.com/)) |
| Prior cloud-agent context | `cursor-cloud` MCP: `list-cloud-agents` → `batch-fetch-details` (transcripts via subagents) |
| Instrumented deep dive | Cursor **debug** subagent / Debug mode (hypothesis + runtime logs) |
| UI verify | computerUse / browser / RecordScreen - required for visual bugs |
| Domain regression | Vitest/Jest/etc. in the owning package |

## Anti-patterns (from real sessions)

- Opening `agent-orchestrator` ceremony for a forensic bug
- Fixing from screenshots without labeling before/after or reproducing
- Trusting the user’s entity name when a peer system is the empty one
- Declaring done from unit tests while live/UI still broken
- Treating a green CodeQL or other sibling workflow as the CI prove gate
- Treating every red `pnpm/setup` as an npm 504 and retrying without reading the failing step (`ERR_PNPM_NO_PKG_MANIFEST` is nested-workspace config, not flake)
- Conflating resilience patch, UX redesign, and CI redirect fixes in one PR
- Abandoning a cheap config-parity hypothesis for long product forensics
- Shipping workflow/release policy changes the user did not ask for
- Leaving the user to ask for a commit message - output a conventional subject (plus ticket id) unprompted; do not branch or commit unless asked
- Drawing RCA or system-flow sketches as ASCII/box-drawing **diagrams** in docs - use Mermaid ([CODING_PHILOSOPHY.md](../../CODING_PHILOSOPHY.md) §8). CLI TTY chrome may use ASCII.
- Opening a feature branch or committing unprompted - work stays on main, uncommitted; the commit message is the deliverable

## After debug

- Optional lesson under `~/.agents/lessons/<project>/` when the user corrected framing or the same friction repeated - set **Promote to** to an `evals/edd/*.jsonl` (or suite) when the lesson is an agent-routing/prompt/tool miss ([templates/lesson.md](../../templates/lesson.md))
- If RCA needs a new capability, hand off to `agent-orchestrator` with the debug board as intake
