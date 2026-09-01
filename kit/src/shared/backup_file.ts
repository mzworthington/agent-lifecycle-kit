import fs from 'fs';

export function backupStamp(now: Date = new Date()): string {
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
}

/** Copy `targetPath` to `targetPath.bak.<stamp>` when it already exists. */
export function backupExistingFile(targetPath: string, now: Date = new Date()): string | undefined {
  if (!fs.existsSync(targetPath)) return undefined;
  const backupPath = `${targetPath}.bak.${backupStamp(now)}`;
  fs.copyFileSync(targetPath, backupPath);
  console.error(`Backed up existing ${targetPath} -> ${backupPath}`);
  return backupPath;
}
