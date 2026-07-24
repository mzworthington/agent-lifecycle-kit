# Phase handover artifacts

This directory stores **local, per-project** markdown artifacts produced during multi-agent lifecycle runs. They are intentionally **not committed** to the open-source repository.

## Layout

```text
handover/
└── <project>/          # e.g. blueprint, my-app
    ├── handover_spec.md
    ├── handover_tdd.md
    ├── handover_impl.md
    └── ...
```

Use the project directory name, or the `project` field in `system/config.json` when set.

## Template

See [templates/handover.md](../templates/handover.md).
