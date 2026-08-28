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

const lockFileStr = process.env.LOCK_FILE;
if (!lockFileStr) {
  console.error("ERROR: LOCK_FILE environment variable required");
  process.exit(1);
}

const lockFilePath = path.resolve(lockFileStr);
if (!fs.existsSync(lockFilePath)) {
  console.error(`ERROR: lockfile not found: ${lockFilePath}`);
  process.exit(1);
}

const lock: LockFile = JSON.parse(fs.readFileSync(lockFilePath, 'utf8'));
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
