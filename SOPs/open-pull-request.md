---
title: Open or update a pull request
kind: sop
triggers:
  - pull request
  - open PR
  - create PR
  - update PR
  - squash merge
  - react template
  - template candidate
tools:
  - shell
---
# Standard Operating Procedure: Open or Update a Pull Request

Run this checklist **every time** you open or materially update a pull request. Align with [CODING_PHILOSOPHY.md](../CODING_PHILOSOPHY.md) §8.

Owned with [agent-pre-commit](../skills/agent-pre-commit/SKILL.md) (quality + message gate) and release/handover steps in [agent-orchestrator](../skills/agent-orchestrator/SKILL.md) / [agent-debug](../skills/agent-debug/SKILL.md).

## 1. Conventional title (required)

Follow [conventional-commits.md](./conventional-commits.md).

- [ ] PR title is `type(optional-scope): description`
- [ ] Title describes the whole squash result, not one intermediate commit

Repos squash-and-merge; the PR title becomes the commit on the default branch.

## 2. React template candidate (notify the user)

Target template: [mzworthington/react-cloudflare-template](https://github.com/mzworthington/react-cloudflare-template) (React, Vite, TypeScript, Tailwind, Cloudflare Pages, Pulumi, CI, in-app docs, quality gates).

**When to raise:** the PR adds or substantially improves a **reusable** frontend building block that is not tied to one product domain — for example:

- Shared UI primitives, layout shells, theme/tokens
- Auth/session helpers, data-fetch wrappers, form/validation kits
- Storybook / Vite / Next scaffolding, frontend CI, docs patterns for SPA templates
- Cross-app hooks or utilities with no hard product coupling

**When to skip:** one-off product screens, domain-specific features, backend-only / IaC-only / kit-docs-only changes, or pure bugfixes that do not introduce a reusable pattern.

**What to do when it matches:**

1. **Do not silently extract** into the template repo.
2. **Notify the user in the conversation** (and optionally a short note in the PR body) with:
   - Why it looks template-worthy
   - What to extract vs leave product-specific
   - A one-line offer to open a follow-up plan or PR against `react-cloudflare-template`
3. Wait for the user before scaffolding extraction work.

Checklist:

- [ ] Scanned the diff for reusable React/frontend template candidates
- [ ] If yes: user notified in this conversation (required); optional PR-body note
- [ ] If no / unsure: no template noise (skip)

## 3. Before publish

- [ ] Pre-commit / project checks green ([agent-pre-commit](../skills/agent-pre-commit/SKILL.md))
- [ ] PR body has summary + how to verify (free-form; title stays conventional)
