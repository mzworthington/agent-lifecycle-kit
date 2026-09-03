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

## Workflow

1. **Find the board.** `list_teams` / `list_projects` / `list_issues` (query + project). Deduplicate. Do not clone an open issue.
2. **Grill only if the slice is unsettled** ([agent-grilling](../agent-grilling/SKILL.md)). Otherwise write the story.
3. **Persona + outcome first.** Title is the user-visible capability (verb + object). Not a filename, component, or “investigate X”.
4. **INVEST.** Independent, negotiable, valuable, estimable, small (one sitting), testable. Split if two personas or two screens.
5. **Write the body** with the template below. UI stories **must** include a Mermaid wireframe ([CODING_PHILOSOPHY.md](../../CODING_PHILOSOPHY.md) §8). Never ASCII/box-drawing art.
6. **Create or patch Linear.** Team + project. Labels: `Feature` (new capability) or `Improvement` (existing path). Priority: 1 urgent / 2 high / 3 medium / 4 low. `relatedTo` for siblings. Return issue URLs.
7. **Ops/checklists.** Recast as an operator story (“so that paging is honest”) or keep as a non-story task — do not fake a customer persona.

## Ticket template (Linear Markdown)

Use these headings in order. Put a mermaid `flowchart TB` (screens and controls) under **Wireframe**.

- **Story** — `As a <role>, I want <capability>, so that <outcome>.`
- **Acceptance criteria** — checkbox lines: `Given <context>, when <action>, then <observable result>.` Include one failure/empty path and one keyboard/name check on UI stories.
- **Wireframe** — mermaid flowchart of the surface (required for UI). Example: subgraph per screen, nodes as buttons/fields, arrows as next state.
- **Out of scope** — explicit non-goals.
- **Notes** — ADR, funnel, sibling issues. No implementation plan.

Criteria are **observable** (copy, files on disk, who is connected). Forbidden in Story/AC: class names, package paths, HTTP verbs, “add a flag”. Those belong in Notes if at all.

## Title bar

| Good | Poor |
|------|------|
| Save a browser-scan map into a folder | Persist lite-scan YAML |
| See scan progress against the file cap | Beat 5 progress UI |
| Name and save a blank workspace first | Blank canvas journey |

## Review existing tickets

Rewrite when missing Story, Given/When/Then AC, Out of scope, or a wireframe on a UI change. Preserve issue ids. Do not change status unless asked.

## After Linear

Point to [agent-spec](../agent-spec/SKILL.md) for Gherkin when the story is ready to build. Do not implement in this role.
