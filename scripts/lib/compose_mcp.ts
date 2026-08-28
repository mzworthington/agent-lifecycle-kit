import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoDir: string = process.env.REPO_DIR || path.resolve(__dirname, '../..');
const mcpsDir: string = path.join(repoDir, 'mcps');

interface ServerConfig {
  mcp?: Record<string, unknown>;
  requiredEnv?: string[];
}

interface ProfileConfig {
  name?: string;
  servers?: string[];
}

export function composeMCP(profileName: string, outputFile?: string, installGlobally: boolean = false): void {
  let profilePath: string;

  if (profileName.endsWith('.json') || profileName.includes('/') || profileName.includes('\\')) {
    profilePath = path.resolve(process.cwd(), profileName);
  } else {
    profilePath = path.join(mcpsDir, 'profiles', `${profileName}.json`);
  }

  if (!fs.existsSync(profilePath)) {
    throw new Error(`Profile JSON not found: ${profilePath}`);
  }

  let profile: ProfileConfig;
  try {
    profile = JSON.parse(fs.readFileSync(profilePath, 'utf8')) as ProfileConfig;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid JSON in profile ${profilePath}: ${message}`);
  }

  const serverIds = profile.servers || [];
  if (!Array.isArray(serverIds)) {
    throw new Error(`profile.servers in ${profilePath} must be an array`);
  }

  const mcpServers: Record<string, unknown> = {};
  const missingEnv: string[] = [];

  for (const serverId of serverIds) {
    const serverFile = path.join(mcpsDir, 'servers', serverId, 'server.json');
    if (!fs.existsSync(serverFile)) {
      throw new Error(`Server definition missing: ${serverFile}`);
    }

    let data: ServerConfig;
    try {
      data = JSON.parse(fs.readFileSync(serverFile, 'utf8')) as ServerConfig;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Invalid JSON in server ${serverFile}: ${message}`);
    }

    const fragment = data.mcp;
    if (!fragment || typeof fragment !== 'object' || Object.keys(fragment).length === 0) {
      throw new Error(`${serverFile} must contain a non-empty mcp object`);
    }

    for (const [key, value] of Object.entries(fragment)) {
      if (key in mcpServers) {
        throw new Error(`Duplicate mcpServers key '${key}' from ${serverId}`);
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
    console.warn(
      "WARN: required env vars not set in this shell (Cursor may still resolve them): " +
      missingEnv.join(", ")
    );
  }

  const resultJSON = JSON.stringify({ mcpServers }, null, 2);

  if (outputFile) {
    const targetPath = path.resolve(process.cwd(), outputFile);
    const parentDir = path.dirname(targetPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(targetPath, resultJSON, 'utf8');
    console.log(`Composed profile '${profileName}' saved to ${targetPath}`);
  } else if (installGlobally) {
    const cursorDir = path.join(os.homedir(), '.cursor');
    if (!fs.existsSync(cursorDir)) {
      fs.mkdirSync(cursorDir, { recursive: true });
    }
    const targetPath = path.join(cursorDir, 'mcp.json');
    fs.writeFileSync(targetPath, resultJSON, 'utf8');
    console.log(`Installed profile '${profileName}' to ${targetPath}`);
  } else {
    console.log(resultJSON);
  }
}

// Standalone execution support via PROFILE_PATH and MCPS_DIR
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('compose_mcp.ts')) {
  const profilePathStr = process.env.PROFILE_PATH;
  if (profilePathStr) {
    composeMCP(profilePathStr);
  }
}
