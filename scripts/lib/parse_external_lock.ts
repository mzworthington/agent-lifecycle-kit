import fs from 'fs';
import path from 'path';

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

/** Exit with an error message — typed as `never` so TS knows execution stops. */
function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

const lockFileStr = process.env.LOCK_FILE;
if (!lockFileStr) {
  fail("ERROR: LOCK_FILE environment variable required");
}

const lockFilePath = path.resolve(lockFileStr);
if (!fs.existsSync(lockFilePath)) {
  fail(`ERROR: lockfile not found: ${lockFilePath}`);
}

let lock: LockFile;
try {
  lock = JSON.parse(fs.readFileSync(lockFilePath, 'utf8')) as LockFile;
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  fail(`ERROR: invalid JSON in lockfile ${lockFilePath}: ${message}`);
}
const agent = lock.agent || "cursor";
const scope = lock.scope || "user";

for (const entry of lock.skills || []) {
  const repo = entry.repository;
  const skill = entry.skill || entry.id;
  const pin = entry.pin || "";
  const skillId = entry.id || (skill ? path.basename(skill) : "");

  if (!repo || !skill) {
    console.error("ERROR: each lock entry needs repository and skill");
    process.exit(1);
  }

  if (`${repo}${skill}${pin}${agent}${scope}${skillId}`.includes("|")) {
    console.error("ERROR: lock fields must not contain '|'");
    process.exit(1);
  }

  console.log([repo, skill, pin, agent, scope, skillId].join("|"));
}
