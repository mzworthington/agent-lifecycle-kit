import fs from 'fs';
import path from 'path';

export interface ExternalSkillEntry {
  repository: string;
  skill: string;
  pin: string;
  agent: string;
  scope: string;
  id: string;
}

interface SkillEntry {
  repository?: string;
  skill?: string;
  pin?: string;
  id?: string;
}

interface LockFile {
  agent?: string;
  scope?: string;
  skills?: SkillEntry[];
}

export function parseExternalLockFile(lockFilePath: string): ExternalSkillEntry[] {
  if (!fs.existsSync(lockFilePath)) {
    throw new Error(`lockfile not found: ${lockFilePath}`);
  }

  let lock: LockFile;
  try {
    lock = JSON.parse(fs.readFileSync(lockFilePath, 'utf8')) as LockFile;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`invalid JSON in lockfile ${lockFilePath}: ${message}`);
  }

  const agent = lock.agent || 'cursor';
  const scope = lock.scope || 'user';
  const entries: ExternalSkillEntry[] = [];

  for (const entry of lock.skills || []) {
    const repository = entry.repository;
    const skill = entry.skill || entry.id;
    const pin = entry.pin || '';
    const id = entry.id || (skill ? path.basename(skill) : '');

    if (!repository || !skill) {
      throw new Error('each lock entry needs repository and skill');
    }

    const parsed: ExternalSkillEntry = { repository, skill, pin, agent, scope, id };
    if (`${repository}${skill}${pin}${agent}${scope}${id}`.includes('|')) {
      throw new Error("lock fields must not contain '|'");
    }
    entries.push(parsed);
  }

  return entries;
}
