---
title: Hypothesis-driven debugging
kind: sop
triggers:
  - bug
  - debug
  - failed job
  - root cause
  - reproduce
  - flake
  - Failed to fetch
  - live site
tools:
  - read
  - grep
  - shell
  - browser
---
# Standard Operating Procedure: Hypothesis-Driven Debugging

Owned by [agent-debug](../skills/agent-debug/SKILL.md). Use this when behavior is **wrong today**, not when designing a new feature.

Product bets, experiments, and feature flags: [hypothesis-driven-development.md](./hypothesis-driven-development.md).

Align with [CODING_PHILOSOPHY.md](../CODING_PHILOSOPHY.md) §4 (minimal change): evidence before edits; smallest fix that kills the symptom.

## 1. Intake checklist

Fill before the first product-code edit (board: [templates/debug-board.md](../templates/debug-board.md)):

| Field | Required |
|-------|----------|
| Environment | prod / staging / local / CI job name |
| Exact user action | clicks, URL, diagram/system name |
| Expected vs actual | one sentence each |
| Evidence | screenshot(s), job URL, console/Network, YAML path |
| Media labels | for each image: before \| after \| unrelated |
| Recent change? | PR, deploy, catalog publish, dependency bump |
| Agent/tool miss? | yes → plan EDD promote (§11) / no → EDD N/A |

If the user omitted env or action, ask **once** with a tight list, or infer from artifacts and mark **inferred**.

## 2. Triage classes

| Class | Cheap first experiment |
|-------|------------------------|
| UI / layout | Reproduce load path; measure boxes/coords or capture screenshot |
| Published data | `curl`/fetch live catalog revision; compare named entity vs peers |
| CI / media / sync | Failed-step log; diff failing suite config vs a green suite (viewport, workers, webServer) |
| Fetch / bulk load | Single-URL probe → concurrency/SW → CORS last |
| Naming mismatch | Search peer entities when the named one looks fine in artifacts |
| Already on main? | Search merged PRs / `git log -S` for the feature before implementing |

## 3. Hypothesis rules

1. Cap at **5** active hypotheses; park the rest.
2. Every hypothesis needs a **kill experiment** that takes less than a deep refactor.
3. Run the **cheapest** kill first (config A/B, artifact count, one curl).
4. Update the board after every experiment (alive / killed / confirmed).
5. Stop adding theories when one is confirmed; implement the fix.

### Ban list

- Unbounded `_probe*.spec.ts` / throwaway probes without deleting them
- “Maybe CORS” before a single failing URL is identified
- UI-filter theories when the source YAML is empty or wiped
- Product deep-dives after a viewport/config mismatch already fits

## 4. Reproduce ladder

```text
Live / CI evidence  →  Local fixture or failing test  →  UI path (if UI symptom)
```

| Step | Pass criteria |
|------|----------------|
| Evidence | Can point to job log line, artifact field, or screenshot region |
| Fixture / test | Automated red that names the bug |
| UI | Same diagram/route shows the break on demand |

Never invert TDD: do not land green production code then “add tests later” for domain fixes.

## 5. Split the work

Separate PRs (or ask before combining) when any two differ:

| Bucket | Examples |
|--------|----------|
| Symptom fix | Layout bbox, stick merge, fetch retry |
| Data / publish | Catalog wipe guard, republish |
| Pipeline / release policy | “build from release only”, workflow triggers |
| UX redesign | Catalog-first open, new empty states |
| Unrelated CI | Redirect timeouts in e2e while debugging fetch |

## 6. Proof gates

| Claim | Proof |
|-------|-------|
| “Layout fixed” | Before/after visual of **initial load** (not only unit packing tests) |
| “Empty system fixed” | Named entity non-empty in **published** artifact or explicit republish TODO |
| “Job fixed” | Failing step green locally or in Actions |
| “On main” | Working tree on default branch, **uncommitted**; proposed conventional commit subject (with ticket id) |
| “Agent/tool miss fixed” | New or existing EDD case red→green; `kit eval run` (or `ci`) evidence |

Output the conventional commit subject without waiting to be asked. Do not branch or commit unless asked. Follow [conventional-commits.md](./conventional-commits.md) and [linear-ticket-workflow.md](./linear-ticket-workflow.md).

## 7. CI / ops playbook

```bash
# Latest failed run logs (repo root)
kit debug-ci
# Or a specific run:
kit debug-ci --run <run-id>
```

When Actions cannot be dispatched (403):

1. Document the permission gap.
2. Run the documented local equivalent if the repo has one.
3. Mark handover **BLOCKED** on remote re-run if local is insufficient.

Install missing media/browser tools only when the failing step needs them (not by default).

## 8. Prior-run context

For recurring symptoms, use `cursor-cloud` MCP when available:

1. `list-cloud-agents` (filter by name/recency)
2. `batch-fetch-details` with `includeTranscripts` / `includeDiffMetadata`
3. Summarize via subagents - do not load huge transcripts inline

Prefer learning the prior RCA over rediscovering it.

## 9. Handover & lessons

- `handover_debug.md` - phase `debug`, status COMPLETE only when proof gates pass
- Append a lesson when the user corrected framing or the same anti-pattern repeated ([lessons/README.md](../lessons/README.md))
- For agent/tool/prompt misses: record the EDD case id/path in the handover (or N/A with reason)

## 10. Orchestration routes

| Request | Route |
|---------|-------|
| Bug, failed job, live symptom | `agent-debug` → `agent-pre-commit` |
| UI/auth/SLO touched | + light XFN floor ([agent-orchestrator](../skills/agent-orchestrator/SKILL.md)) |
| RCA needs new capability | `agent-debug` (COMPLETE with RCA) → `agent-orchestrator` |
| Complexity-only cleanup | `agent-arch-drift` → `agent-prune` (not debug) |

## 11. Promote agent misses to EDD (mandatory when applicable)

When root cause is **wrong tool, bad args, prompt/schema drift, MCP misuse, or infinite retries** - including a miss that only exists in the **current IDE chat** - do not stop at a code fix or a prose lesson.

| Step | Action |
|------|--------|
| 1. Capture | From conversation context (no user paste required), write a trace or JSONL row: `id`, `prompt`, `expect` / `history`, reason (`user_downvote` \| `shadow_fail` \| `unhandled_tool_exception` \| `circuit_breaker`) |
| 2. Promote | `kit eval dataset from-trace --trace <file> --out evals/edd/<suite>.jsonl` **or** append a hand-authored case with tags `prod-derived` (+ reason tag) |
| 3. Red | `kit eval run --suite evals/edd/<suite>.yaml --model scripted` fails on the new case (or prove an existing case already covers it) |
| 4. Green | Fix prompt/schema/routing; re-run until green; prefer `kit eval ci --threshold-routing 95` when routing is involved |
| 5. Lesson (optional) | If process/rules should change too, append a lesson with **Promote to** pointing at that suite/JSONL ([templates/lesson.md](../templates/lesson.md)) |

Skip only when the bug is pure app/UI/CI with **no** agent-tool contract impact - mark the debug board **EDD case: N/A**.

Procedure companions: [eval-driven-development.md](./eval-driven-development.md), [edd-production-telemetry.md](./edd-production-telemetry.md).
