import fs from 'fs';
import path from 'path';
import { KIT_SKILL_DIR_PREFIX } from './verify_skills_layout.js';

interface SecurityViolation {
  file: string;
  line: number;
  category: 'PROMPT_INJECTION' | 'EXFILTRATION_RISK' | 'OBFUSCATED_EXEC' | 'HARDCODED_SECRET' | 'SUPPLY_CHAIN_UNPINNED' | 'FRONTMATTER_SCHEMA' | 'SYMLINK';
  rule: string;
  snippet: string;
}

const SCAN_DIRECTORIES: string[] = ['skills', 'kit', 'bin', 'SOPs', 'templates', 'mcps'];
const SKIP_DIRS = new Set(['.git', 'node_modules', '.pnpm-store', '.pnpm', '.husky']);
const SKIP_FILES = new Set(['scan_skill_security.ts']);

const SECURITY_RULES = [
  {
    category: 'PROMPT_INJECTION' as const,
    rule: 'System prompt override or instruction ignore attempt',
    pattern: /(ignore\s+(all\s+)?previous\s+instructions|system\s+prompt\s+override|bypass\s+(all\s+)?safety|ignore\s+guardrails|jailbreak)/i
  },
  {
    category: 'EXFILTRATION_RISK' as const,
    rule: 'Credential store access or exfiltration request',
    pattern: /(~\/\.ssh|~\/\.aws|(?<![A-Za-z])\.env\b(?!\.example)|id_rsa|AWS_SECRET_ACCESS_KEY|SLACK_TOKEN|curl\s+-[Xd]\s+(POST|PUT)\s+http)/i
  },
  {
    category: 'OBFUSCATED_EXEC' as const,
    rule: 'Hazardous shell execution, pipe to shell, or obfuscation',
    pattern: /(base64\s+-d\s*\||curl\s+[^|\n]+\|\s*(bash|sh|zsh)|wget\s+[^|\n]+\|\s*(bash|sh)|nc\s+-[eE]|eval\s*\(\s*Buffer\.from|sudo\s+rm\s+-rf)/i
  },
  {
    category: 'HARDCODED_SECRET' as const,
    rule: 'Hardcoded API key, private key header, or secret token',
    pattern: /(AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9_]{36}|github_pat_[A-Za-z0-9_]{82}|-----BEGIN (RSA|OPENSSH|EC|PGP)? PRIVATE KEY-----|xox[baprs]-[0-9a-zA-Z]{10,48})/i
  }
];

const ALLOWED_LOCK_ORGS = ['cloudflare', 'vercel-labs', 'mzworthington'];
const VALID_KINDS = ['role', 'profile'];
const VALID_PHASES = [
  'orchestration', 'spec', 'tdd', 'xfn', 'impl', 'audit', 'maintenance', 'debug', 'telemetry', 'quality', 'docs', 'release'
];
const SCANNABLE_EXTENSIONS = new Set(['.md', '.sh', '.json', '.ts', '.yml', '.yaml']);
const PIN_PATTERN = /^(latest|v?\d+(\.\d+)*(-[\w.-]+)?|[0-9a-f]{40}|refs\/(tags|heads)\/[\w./-]+)$/i;
const OFFICIAL_INSTALLER =
  /raw\.githubusercontent\.com\/mzworthington\/agent-lifecycle-kit\/[^/\s]+\/install\.sh/;

/** Documented `curl | sh` (or bash) for this repo only - still flag every other pipe-to-shell. */
export function isOfficialKitInstallerLine(line: string): boolean {
  return OFFICIAL_INSTALLER.test(line) && /\|\s*(bash|sh)\b/.test(line);
}

export interface ScanSkillSecurityResult {
  ok: boolean;
  errorCount: number;
  warningCount: number;
}

function calculateEntropy(str: string): number {
  if (!str || str.length === 0) return 0;
  const frequencies: Record<string, number> = {};
  for (const char of str) {
    frequencies[char] = (frequencies[char] || 0) + 1;
  }
  let entropy = 0;
  for (const count of Object.values(frequencies)) {
    const p = count / str.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function scanFrontmatter(violations: SecurityViolation[], relPath: string, content: string): void {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) {
    violations.push({
      file: relPath,
      line: 1,
      category: 'FRONTMATTER_SCHEMA',
      rule: 'SKILL.md missing valid YAML frontmatter delimiters (---)',
      snippet: ''
    });
    return;
  }

  const yamlText = match[1];
  const nameMatch = yamlText.match(/^name:\s*(.+)$/m);
  const descMatch = yamlText.match(/^description:\s*/m);
  const kindMatch = yamlText.match(/^kind:\s*(.+)$/m);
  const phaseMatch = yamlText.match(/^phase:\s*(.+)$/m);
  const triggersMatch = yamlText.match(/triggers:\s*\n((?:\s*-\s*.*\n?)+)/);

  if (!nameMatch) {
    violations.push({
      file: relPath,
      line: 1,
      category: 'FRONTMATTER_SCHEMA',
      rule: 'Frontmatter missing required field: name',
      snippet: ''
    });
  }

  if (!descMatch) {
    violations.push({
      file: relPath,
      line: 1,
      category: 'FRONTMATTER_SCHEMA',
      rule: 'Frontmatter missing required field: description',
      snippet: ''
    });
  }

  if (kindMatch) {
    const kind = kindMatch[1].trim();
    if (!VALID_KINDS.includes(kind)) {
      violations.push({
        file: relPath,
        line: 1,
        category: 'FRONTMATTER_SCHEMA',
        rule: `Invalid frontmatter kind "${kind}". Allowed: [${VALID_KINDS.join(', ')}]`,
        snippet: kindMatch[0]
      });
    }

    if (kind === 'role' && phaseMatch) {
      const phase = phaseMatch[1].trim();
      if (!VALID_PHASES.includes(phase)) {
        violations.push({
          file: relPath,
          line: 1,
          category: 'FRONTMATTER_SCHEMA',
          rule: `Invalid role phase "${phase}". Allowed: [${VALID_PHASES.join(', ')}]`,
          snippet: phaseMatch[0]
        });
      }
    }
  }

  if (!triggersMatch) {
    violations.push({
      file: relPath,
      line: 1,
      category: 'FRONTMATTER_SCHEMA',
      rule: 'Frontmatter missing required non-empty triggers array',
      snippet: ''
    });
  }
}

function scanFile(violations: SecurityViolation[], filePath: string, relPath: string): void {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  if (relPath.endsWith('SKILL.md') && relPath.startsWith('skills/')) {
    scanFrontmatter(violations, relPath, content);
  }

  lines.forEach((line: string, index: number) => {
    SECURITY_RULES.forEach((rule) => {
      if (!rule.pattern.test(line)) return;
      if (rule.category === 'OBFUSCATED_EXEC' && isOfficialKitInstallerLine(line)) return;
      violations.push({
        file: relPath,
        line: index + 1,
        category: rule.category,
        rule: rule.rule,
        snippet: line.trim()
      });
    });

    const tokens = line.split(/[\s,;()\[\]{}'\"]+/);
    for (const token of tokens) {
      if (token.length > 32 && !token.startsWith('http://') && !token.startsWith('https://') && !token.includes('file://')) {
        const entropy = calculateEntropy(token);
        if (entropy > 4.95) {
          violations.push({
            file: relPath,
            line: index + 1,
            category: 'HARDCODED_SECRET',
            rule: `High Shannon entropy token detected (${entropy.toFixed(2)} bits/char)`,
            snippet: token.substring(0, 40) + '...'
          });
        }
      }
    }
  });
}

function isSymlink(entryPath: string): boolean {
  try {
    return fs.lstatSync(entryPath).isSymbolicLink();
  } catch {
    return false;
  }
}

function scanDirectory(violations: SecurityViolation[], repoDir: string, dirPath: string): void {
  if (!fs.existsSync(dirPath)) return;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relPath = path.relative(repoDir, fullPath);

    if (isSymlink(fullPath)) {
      violations.push({
        file: relPath,
        line: 0,
        category: 'SYMLINK',
        rule: 'Symlink detected - not followed (potential traversal attack)',
        snippet: `-> ${fs.readlinkSync(fullPath)}`
      });
      continue;
    }

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      if (path.dirname(relPath) === 'skills' && !KIT_SKILL_DIR_PREFIX.test(entry.name)) continue;
      scanDirectory(violations, repoDir, fullPath);
    } else if (entry.isFile()) {
      if (SKIP_FILES.has(entry.name) || entry.name.endsWith('.test.ts')) continue;
      const ext = path.extname(entry.name);
      if (SCANNABLE_EXTENSIONS.has(ext)) {
        scanFile(violations, fullPath, relPath);
      }
    }
  }
}

function scanExternalLock(violations: SecurityViolation[], lockFilePath: string): void {
  if (!fs.existsSync(lockFilePath)) return;

  try {
    const lockData = JSON.parse(fs.readFileSync(lockFilePath, 'utf8'));
    for (const skill of lockData.skills || []) {
      const repo = skill.repository || '';
      const org = repo.split('/')[0] || '';
      const pin = skill.pin || '';

      if (org && !ALLOWED_LOCK_ORGS.includes(org)) {
        violations.push({
          file: 'skills/external.lock.json',
          line: 1,
          category: 'SUPPLY_CHAIN_UNPINNED',
          rule: `External skill repository "${repo}" is from unapproved organization "${org}"`,
          snippet: JSON.stringify(skill)
        });
      }

      if (!pin) {
        violations.push({
          file: 'skills/external.lock.json',
          line: 1,
          category: 'SUPPLY_CHAIN_UNPINNED',
          rule: `External skill "${repo}" is missing required version pin (tag, latest, or commit SHA)`,
          snippet: JSON.stringify(skill)
        });
      } else if (!PIN_PATTERN.test(pin)) {
        violations.push({
          file: 'skills/external.lock.json',
          line: 1,
          category: 'SUPPLY_CHAIN_UNPINNED',
          rule: `External skill "${repo}" pin "${pin}" is invalid - expected version tag (e.g. v1.0.0), latest, or commit SHA`,
          snippet: JSON.stringify(skill)
        });
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    violations.push({
      file: 'skills/external.lock.json',
      line: 1,
      category: 'SUPPLY_CHAIN_UNPINNED',
      rule: `Invalid external.lock.json syntax: ${message}`,
      snippet: ''
    });
  }
}

export function scanSkillSecurity(repoDir: string): ScanSkillSecurityResult {
  const violations: SecurityViolation[] = [];
  const lockFilePath = path.join(repoDir, 'skills', 'external.lock.json');

  console.log('=== Agent Skill Hardened Security & Supply Chain Audit ===');
  console.log('');

  for (const dir of SCAN_DIRECTORIES) {
    scanDirectory(violations, repoDir, path.join(repoDir, dir));
  }

  scanExternalLock(violations, lockFilePath);

  if (violations.length === 0) {
    console.log(
      '✅ Hardened Security audit PASSED: No prompt injections, secret leaks, schema violations, or unpinned supply-chain dependencies detected.'
    );
    return { ok: true, errorCount: 0, warningCount: 0 };
  }

  const warnings = violations.filter(
    (v) => v.category === 'SUPPLY_CHAIN_UNPINNED' && v.rule.includes('is invalid')
  );
  const errors = violations.filter(
    (v) => !(v.category === 'SUPPLY_CHAIN_UNPINNED' && v.rule.includes('is invalid'))
  );

  if (warnings.length > 0) {
    console.warn(`⚠️  Supply Chain Warnings: ${warnings.length}\n`);
    warnings.forEach((v) => {
      console.warn(`  ⚠️  [${v.category}] ${v.file}:${v.line} - ${v.rule}`);
      if (v.snippet) {
        console.warn(`     Snippet: "${v.snippet.substring(0, 100)}"`);
      }
    });
    console.warn('');
  }

  if (errors.length > 0) {
    console.error(`🚨 Security Violations Found: ${errors.length}\n`);
    errors.forEach((v) => {
      console.error(`  ❌ [${v.category}] ${v.file}:${v.line} - ${v.rule}`);
      if (v.snippet) {
        console.error(`     Snippet: "${v.snippet.substring(0, 100)}"`);
      }
    });
    console.error('\nHardened Security audit FAILED.');
    return { ok: false, errorCount: errors.length, warningCount: warnings.length };
  }

  console.log(`✅ Hardened Security audit PASSED (${warnings.length} advisory warning(s)).`);
  return { ok: true, errorCount: 0, warningCount: warnings.length };
}
