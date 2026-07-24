# System configuration

Copy the example config to create a local override:

```bash
cp system/config.example.json system/config.json
```

Edit `project` to match your active codebase name. That value is used as the `<project>` segment under `handover/<project>/`.

`system/config.json` is gitignored so each machine and project can keep its own settings without polluting the shared repository.
