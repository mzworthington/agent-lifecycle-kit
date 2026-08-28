import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoDir: string = process.env.REPO_DIR || path.resolve(__dirname, '../..');
const skillsDir: string = path.join(repoDir, 'skills');
const lockFilePath: string = path.join(skillsDir, 'external.lock.json');

interface SecurityViolation {
  file: string;
  line: number;
  category: 'PROMPT_INJECTION' | 'EXFILTRATION_RISK' | 'OBFUSCATED_EXEC' | 'HARDCODED_SECRET' | 'SUPPLY_CHAIN_UNPINNED';
  rule: string;
  snippet: string;
}

const SECURITY_RULES = [
  {
    category: 'PROMPT_INJECTION' as const,
    rule: 'System prompt override or instruction ignore attempt',
    pattern: /(ignore\s+(all\s+)?previous\s+instructions|system\s+prompt\s+override|bypass\s+(all\s+)?safety|ignore\s+guardrails|jailbreak)/i
  },
  {
    category: 'EXFILTRATION_RISK' as const,
    rule: 'Credential store access or exfiltration request',
    pattern: /(~\/\.ssh|~\/\.aws|\.env\b(?!\.example)|id_rsa|AWS_SECRET_ACCESS_KEY|SLACK_TOKEN|curl\s+-[Xd]\s+(POST|PUT)\s+http)/i
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

const violations: SecurityViolation[] = [];

function scanFile(filePath: string, relPath: string): void {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    SECURITY_RULES.forEach(rule => {
      if (rule.pattern.test(line)) {
        violations.push({
          file: relPath,
          line: index + 1,
          category: rule.category,
          rule: rule.rule,
          snippet: line.trim()
        });
      }
    });
  });
}

function scanSkillsDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) return;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relPath = path.relative(repoDir, fullPath);

    if (entry.isDirectory()) {
      scanSkillsDirectory(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.sh') || entry.name.endsWith('.json') || entry.name.endsWith('.ts'))) {
      scanFile(fullPath, relPath);
    }
  }
}

function scanExternalLock(): void {
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
        console.warn(`  ⚠️ [SUPPLY_CHAIN_UNPINNED] skills/external.lock.json: Skill "${repo}" is missing exact commit SHA pin.`);
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

console.log('=== Agent Skill Security & Supply Chain Audit ===');
console.log('');

scanSkillsDirectory(skillsDir);
scanExternalLock();

if (violations.length > 0) {
  console.error(`🚨 Security Violations Found: ${violations.length}\n`);
  violations.forEach(v => {
    console.error(`  ❌ [${v.category}] ${v.file}:${v.line} - ${v.rule}`);
    if (v.snippet) {
      console.error(`     Snippet: "${v.snippet.substring(0, 100)}"`);
    }
  });
  console.error('\nSecurity audit FAILED.');
  process.exit(1);
} else {
  console.log('✅ Security audit PASSED: No malicious patterns, secret leaks, or untrusted external lock entries detected.');
}
