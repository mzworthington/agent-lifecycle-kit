# Launch host subagents

Skills stay the playbook (`SKILL.md`). Host **subagents** are a process boundary: a fresh Cursor Task or Claude subagent, optional `readonly`, optional model class at launch. The parent is `agent-orchestrator`. The contract between windows is the handover file, not the chat summary.

Allowlist and install: [docs/subagents.md](../docs/subagents.md). Model class: [model-routing.md](./model-routing.md) (`wk model resolve --skill <id>`). Do not hardcode vendor slugs.

```mermaid
sequenceDiagram
  autonumber
  participant User
  participant Parent as orchestrator parent
  participant Child as allowlisted specialist
  participant Disk as handover on disk

  User->>Parent: Feature, bug, or audit
  Parent->>Parent: Scope gate, pick smallest path
  alt Allowlisted specialist
    Parent->>Child: Launch stub plus Linear id, handover paths, DoD, Next agent
    Child->>Disk: COMPLETE or BLOCKED
    Parent->>Disk: Read status, do not trust the chat summary
    alt BLOCKED
      Parent->>Child: Route back (tdd, xfn, or debug)
    end
  else Stay in parent
    Parent->>Parent: Typo, grill, or a role that is still a skill
  end
```

## Parent must pass

1. Linear id when playing a ticket.
2. Relevant handover paths under `~/.agents/handover/<project>/`.
3. Definition of Done for this phase.
4. Next agent (role skill name).

The child writes `COMPLETE` or `BLOCKED` to the handover and returns a short summary only.

## Routing rules

| Situation | Launch |
|-----------|--------|
| Spec after grilling/stories | `agent-spec` |
| Spec handover `COMPLETE`, implement the slice | `agent-tdd` (gear 1 **and** gear 2 in **one** child) |
| XFN apply rows / browser noise | `agent-xfn` (own window) |
| Failed CI, live symptom, RCA | `agent-debug` (own window). Do not open the full lifecycle. |
| Independent PR / OWASP / hex drift check | `agent-review`, `agent-security`, or `agent-arch-drift` with `readonly: true`. Handover and diff only. `BLOCKED` goes back to tdd or xfn. |

## Readonly audit window

After TDD (or on a PR/diff review ask), launch audit specialists as **readonly subagents**. Independent verification is the reason to use a fresh window: the auditor must not ratify the implementation transcript it just wrote.

```mermaid
flowchart LR
  tdd[TDD child done] --> ho[handover_tdd.md]
  ho --> rev[agent-review readonly]
  ho --> sec[agent-security readonly]
  ho --> arch[agent-arch-drift readonly]
  rev --> audit[handover_audit.md]
  sec --> audit
  arch --> audit
```

1. **Launch** `agent-review` when the user asks for a diff or PR review. Launch `agent-security` and `agent-arch-drift` in **parallel** when both are in scope.
2. **Packet** - Linear id, git/PR `diffRef`, `handover_tdd.md`, `handover_xfn.md`. Do not paste the parent or sibling implementation chat.
3. **`readonly: true`** - no product file edits, no state-changing shell. `git diff` / `git log` are fine. The child returns Status and Next agent; the parent writes `handover_audit.md` (or `handover_review.md`).
4. **Honesty** - catalog fail (silent rewrites, unaligned impact) → Status **BLOCKED**, Next agent `agent-tdd`. XFN fail (missing apply suites or matrix) → Status **BLOCKED**, Next agent `agent-xfn`. Never mark COMPLETE as a silent pass.
| Tiny typo / one-liner | Stay in the parent. |

Do not generate or launch `lang-*` / `framework-*` / `profile-*` as agents. Load those skills inside the specialist.

Do not split TDD across two agents. `agent-adapter` stays a skill when gear 2 is too large.

Keep **one** MCP profile. If a specialist needs a named profile, `wk mcp <profile> --project`, then restore `wk mcp default --project`.

## Kill

Freeze the generate list if auto-delegation picks the wrong specialist more often than today’s skill picker. Fix thin handovers before adding roles.
