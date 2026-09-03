---
name: agent-user-stories
description: >-
  Writes INVEST user stories for the Linear backlog: persona, want, outcome,
  testable acceptance criteria, Mermaid UI wireframes, and explicit out of
  scope. Use when creating or rewriting Linear issues, product review
  backlogs, improvement suggestions as stories, or when the user asks for
  tickets with acceptance criteria and wireframes. Not for Gherkin domain
  specs (agent-spec) or implementation.
kind: role
phase: spec
triggers:
  - linear
  - user story
  - user stories
  - backlog
  - acceptance criteria
  - wireframe
  - INVEST
  - issue
  - ticket
  - product review
  - review tickets
  - operator story
depends-on:
  - agent-grilling
  - agent-copy
mcp:
  - linear
  - memory
  - kit-knowledge
tools:
  - read
  - grep
disable-model-invocation: false
---
# Role: Linear user-story author

Turn product gaps into **small, valuable tickets** a human can play. Hand Gherkin, bounded contexts, and XFN matrices to [agent-spec](../agent-spec/SKILL.md) after the story is settled.

## When

- User asks to add, rewrite, or review **Linear** issues as user stories.
- Product review → backlog.
- Existing tickets are problem statements, checklists, or implementation notes.

Skip for bugs with a known defect (use `agent-debug` RCA, then a **fix** story only if the ask is still a capability). Skip for ADRs.

## Classify before writing

| Kind | Treat as | Wireframe |
|------|----------|-----------|
| UI / product path | INVEST story (customer or practitioner persona) | Required mermaid |
| CLI / on-call / handshake | Operator story (`As an operator… so that paging/align is honest`) | Omit (optional mermaid of CLI flow only) |
| Parent of playable children | Epic: Story + Children list, no fake AC | Omit |
| Vendor onboarding (Get familiar with Linear, Import your data, …) | Cancel; not product work | — |
| Copy-paste “wire product X” | One story per product with **unique** observables (URL, webhook, health) | Only if that product has a UI |

Do not invent a customer for ops. Do not clone an open issue. Do not rewrite a ticket that already has Story + Given/When/Then AC + Out of scope (and Wireframe if UI).

## Workflow

1. **Find the board.** `list_teams` / `list_projects` / `list_issues`. Deduplicate. Fill empty project summaries.
2. **Grill only if the slice is unsettled** ([agent-grilling](../agent-grilling/SKILL.md)). Split if two personas or two screens. Otherwise write.
3. **Title** is the user-visible capability (verb + object). Not a filename, `wk` flag, or “investigate X”.
4. **INVEST.** Small = one sitting. Parent stays an epic; playable work is children.
5. **Body** from the matching template. Never ASCII/box-drawing art ([CODING_PHILOSOPHY.md](../../CODING_PHILOSOPHY.md) §8).
6. **Patch Linear.** Preserve ids. **Create children with no `id`** (only `parentId`); passing the parent identifier as `id` overwrites the parent. Labels: `Feature` / `Improvement`. Priority 1–4 (never leave 0 on a playable story). `relatedTo` / `blockedBy` for siblings. Do not change status unless asked, except cancel vendor onboarding.
7. Return issue URLs. Do not implement in this role.

## Ticket template (Linear Markdown)

Headings in order. **Wireframe** only on UI stories.

- **Story** — `As a <role>, I want <capability>, so that <outcome>.`
- **Acceptance criteria** — `- [ ] Given <context>, when <action>, then <observable result>.` One failure/empty path. UI: one keyboard/name check.
- **Wireframe** — mermaid `flowchart TB` of screens and controls (UI only).
- **Out of scope** — explicit non-goals.
- **Notes** — siblings, ADRs, implementation hints. Not an implementation plan.

Epic parents: Story, **Children** (links), Out of scope, Notes. No checkbox AC that duplicates children.

Criteria are **observable** (copy, files on disk, who is connected, CLI stdout, Linear status). Forbidden in Story/AC: class names, package paths, HTTP verbs as the want, “add a flag”. Those belong in Notes.

## Title bar

| Good | Poor |
|------|------|
| Save a browser-scan map into a folder | Persist lite-scan YAML |
| See that handshake quality is align, not doctor | wk doctor: point non-kit repos at wk align |
| Scrub team capacity on a timeline | Team creation journey |

## Review existing tickets

Skip complete stories. Rewrite missing Story / Given-When-Then / Out of scope / UI wireframe. Recast `## Done when` bullets into operator AC. Split blobs. Cancel Linear product tours.

## After Linear

Point to [agent-spec](../agent-spec/SKILL.md) when a story is ready to build.
