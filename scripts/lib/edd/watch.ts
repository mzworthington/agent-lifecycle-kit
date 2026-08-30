import fs from 'fs';
import path from 'path';

export interface WatchOptions {
  targets: string[];
  onChange: (file: string) => void | Promise<void>;
  debounceMs?: number;
}

/**
 * Re-run assertions when system prompt files, MCP tool schemas, or suite YAML change.
 */
export function watchTargets(options: WatchOptions): { close: () => void } {
  const debounceMs = options.debounceMs ?? 200;
  const watchers: fs.FSWatcher[] = [];
  let timer: NodeJS.Timeout | undefined;
  let pending: string | undefined;

  const schedule = (file: string) => {
    pending = file;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      const f = pending;
      pending = undefined;
      if (f) void Promise.resolve(options.onChange(f));
    }, debounceMs);
  };

  for (const target of options.targets) {
    const abs = path.resolve(target);
    if (!fs.existsSync(abs)) {
      console.warn(`watch: skip missing target ${abs}`);
      continue;
    }
    const watcher = fs.watch(abs, { recursive: fs.statSync(abs).isDirectory() }, (_event, filename) => {
      schedule(filename ? path.join(abs, filename.toString()) : abs);
    });
    watchers.push(watcher);
  }

  return {
    close: () => {
      if (timer) clearTimeout(timer);
      for (const w of watchers) w.close();
    }
  };
}
