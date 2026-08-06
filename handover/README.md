# Phase handover artifacts

This directory stores **local, per-project** markdown artifacts produced during multi-agent lifecycle runs. They are intentionally **not committed** to the open-source repository.

## Layout

```text
handover/
└── <project>/          # e.g. blueprint, my-app
    ├── handover_spec.md
    ├── handover_tdd.md
    ├── handover_xfn.md
    ├── handover_impl.md
    ├── dead-code-backlog.md   # maintenance queue for agent-prune (dead-code track)
    ├── complexity-backlog.md  # maintenance queue for agent-prune (complexity track)
    └── ...
```

Use the project directory name, or the `project` field in `system/config.json` when set.

## Template

See [templates/handover.md](../templates/handover.md). Mark a phase **COMPLETE** only when that phase's Definition of Done in the template is met. Catalog/XFN procedure: [SOPs/behavior-catalog-and-xfn.md](../SOPs/behavior-catalog-and-xfn.md). Complexity hotspots: [SOPs/complexity-hotspots.md](../SOPs/complexity-hotspots.md).
