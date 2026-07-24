# Kit lessons (local, per project)

This directory captures **learnings from real sessions** so the kit can improve over time. Entries stay local and gitignored until you promote them into the shared repository during [kit review](../tasks/kit-review.md).

## Layout

```text
lessons/
└── <project>/              # e.g. blueprint, my-app (match handover/<project>/)
    └── YYYY-MM-DD.md       # one file per day; append multiple entries
```

Use the project directory name, or the `project` field in `system/config.json` when set.

## When to write a lesson

Append an entry when any of these happen:

- The user corrects your approach or output
- You had to ask because requirements were ambiguous
- A rule was missing, outdated, or contradictory
- A pattern worked well and should be reused
- The same mistake or friction appears more than once

Skip logging for routine, one-off typos with no broader lesson.

## Entry format

Copy [templates/lesson.md](../templates/lesson.md) or append entries using the same structure. One file per day per project (`YYYY-MM-DD.md`); multiple lessons can live in the same file.

## Promotion flow

1. Agent logs lesson with `Status: pending`
2. You run [tasks/kit-review.md](../tasks/kit-review.md) (weekly or on demand)
3. Approved lessons update the shared kit; mark `promoted` or `rejected` in the local file
4. Project-only quirks go in the **app repo** (`.cursor/skills/`), not here

Do not auto-commit kit changes from lesson capture. Human review keeps the shared kit stable.
