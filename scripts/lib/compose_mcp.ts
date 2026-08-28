import fs from 'fs';
import path from 'path';

interface ServerConfig {
  mcp?: Record<string, unknown>;
  requiredEnv?: string[];
}

interface ProfileConfig {
  name?: string;
  servers?: string[];
}

const profilePathStr = process.env.PROFILE_PATH;
const mcpsDirStr = process.env.MCPS_DIR;

if (!profilePathStr || !mcpsDirStr) {
  console.error("ERROR: PROFILE_PATH and MCPS_DIR environment variables required");
  process.exit(1);
}

const profilePath = path.resolve(profilePathStr);
const mcpsDir = path.resolve(mcpsDirStr);

if (!fs.existsSync(profilePath)) {
  console.error(`ERROR: profile not found: ${profilePath}`);
  process.exit(1);
}

const profile: ProfileConfig = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
const serverIds = profile.servers || [];

if (!Array.isArray(serverIds)) {
  console.error("ERROR: profile.servers must be a list");
  process.exit(1);
}

const mcpServers: Record<string, unknown> = {};
const missingEnv: string[] = [];

for (const serverId of serverIds) {
  const serverFile = path.join(mcpsDir, 'servers', serverId, 'server.json');
  if (!fs.existsSync(serverFile)) {
    console.error(`ERROR: server definition missing: ${serverFile}`);
    process.exit(1);
  }

  const data: ServerConfig = JSON.parse(fs.readFileSync(serverFile, 'utf8'));
  const fragment = data.mcp;

  if (!fragment || typeof fragment !== 'object' || Object.keys(fragment).length === 0) {
    console.error(`ERROR: ${serverFile} must contain a non-empty mcp object`);
    process.exit(1);
  }

  for (const [key, value] of Object.entries(fragment)) {
    if (key in mcpServers) {
      console.error(`ERROR: duplicate mcpServers key '${key}' from ${serverId}`);
      process.exit(1);
    }
    mcpServers[key] = value;
  }

  for (const envName of data.requiredEnv || []) {
    if (!process.env[envName]) {
      missingEnv.push(`${serverId}:${envName}`);
    }
  }
}

if (missingEnv.length > 0) {
  console.error(
    "WARN: required env vars not set in this shell (Cursor may still resolve them): " +
    missingEnv.join(", ")
  );
}

console.log(JSON.stringify({ mcpServers }, null, 2));
console.error("");
console.error(
  `OK: composed profile '${profile.name || path.basename(profilePath, '.json')}' ` +
  `with ${Object.keys(mcpServers).length} server(s)`
);
