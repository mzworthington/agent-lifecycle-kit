import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Assertions {
  required_triggers?: string[];
  required_patterns?: string[];
  forbidden_patterns?: string[];
  required_output_sections?: string[];
}

interface TestCase {
  id: string;
  name: string;
  description?: string;
  target_skill: string;
  prompt: string;
  context?: {
    detected_stack?: string[];
    active_phase?: string;
    files_present?: string[];
  };
  assertions: Assertions;
}

interface EvalSuite {
  suite: string;
  description: string;
  version: string;
  test_cases: TestCase[];
}

interface SkillFrontmatter {
  triggers: string[];
}

interface EvalFileInfo {
  relPath: string;
  absPath: string;
}

const repoDir: string = process.env.REPO_DIR || path.resolve(__dirname, '../..');
const skillsDir: string = path.join(repoDir, 'skills');
const centralSuitesDir: string = path.join(repoDir, 'evals', 'suites');

let totalSuites = 0;
let totalTests = 0;
let errors = 0;

function parseYamlFrontmatter(content: string): SkillFrontmatter | null {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return null;
  const yamlText = match[1];
  const triggersMatch = yamlText.match(/triggers:\s*\n((?:\s*-\s*.*\n?)+)/);
  if (!triggersMatch) return { triggers: [] };
  const triggers = triggersMatch[1]
    .split('\n')
    .map((line: string) => line.replace(/^\s*-\s*/, '').trim())
    .filter(Boolean);
  return { triggers };
}

function findEvalFiles(): EvalFileInfo[] {
  const files: EvalFileInfo[] = [];

  // 1. Centralized suites
  if (fs.existsSync(centralSuitesDir)) {
    for (const f of fs.readdirSync(centralSuitesDir)) {
      if (f.endsWith('.json')) {
        files.push({ relPath: `evals/suites/${f}`, absPath: path.join(centralSuitesDir, f) });
      }
    }
  }

  // 2. Co-located skill evals (skills/<skill-name>/evals/*.json)
  if (fs.existsSync(skillsDir)) {
    for (const skillDirName of fs.readdirSync(skillsDir)) {
      const skillEvalsDir = path.join(skillsDir, skillDirName, 'evals');
      if (fs.existsSync(skillEvalsDir) && fs.statSync(skillEvalsDir).isDirectory()) {
        for (const f of fs.readdirSync(skillEvalsDir)) {
          if (f.endsWith('.json')) {
            files.push({ relPath: `skills/${skillDirName}/evals/${f}`, absPath: path.join(skillEvalsDir, f) });
          }
        }
      }
    }
  }

  return files;
}

const evalFiles = findEvalFiles();

for (const fileInfo of evalFiles) {
  totalSuites++;
  console.log(`Checking suite: ${fileInfo.relPath}...`);

  let data: EvalSuite;
  try {
    const content = fs.readFileSync(fileInfo.absPath, 'utf8');
    data = JSON.parse(content) as EvalSuite;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  ❌ Invalid JSON in ${fileInfo.relPath}: ${message}`);
    errors++;
    continue;
  }

  if (!data.suite || !data.version || !Array.isArray(data.test_cases)) {
    console.error(`  ❌ Suite ${fileInfo.relPath} missing required fields (suite, version, test_cases)`);
    errors++;
    continue;
  }

  for (const test of data.test_cases) {
    totalTests++;
    const targetSkill = test.target_skill;
    const skillPath = path.join(skillsDir, targetSkill, 'SKILL.md');

    if (!fs.existsSync(skillPath)) {
      console.error(`  ❌ Test ${test.id} references non-existent skill: ${targetSkill} (${skillPath})`);
      errors++;
      continue;
    }

    const skillContent = fs.readFileSync(skillPath, 'utf8');
    const frontmatter = parseYamlFrontmatter(skillContent);
    const skillTriggers = (frontmatter && frontmatter.triggers) ? frontmatter.triggers.map((t: string) => t.toLowerCase()) : [];

    if (test.assertions && Array.isArray(test.assertions.required_triggers)) {
      for (const reqTrigger of test.assertions.required_triggers) {
        const normalizedReq = reqTrigger.toLowerCase();
        const found = skillTriggers.some((st: string) => st.includes(normalizedReq) || normalizedReq.includes(st));
        if (!found) {
          console.error(`  ⚠️ Test ${test.id}: required trigger "${reqTrigger}" not found in ${targetSkill} frontmatter triggers: [${skillTriggers.join(', ')}]`);
        }
      }
    }
  }

  console.log(`  ✓ ${fileInfo.relPath} passed structure check (${data.test_cases.length} test cases)`);
}

console.log("");
console.log(`Validation Complete: ${totalSuites} suite(s), ${totalTests} test case(s) checked.`);

if (errors > 0) {
  console.error(`❌ Validation failed with ${errors} error(s).`);
  process.exit(1);
} else {
  console.log(`✅ All eval suites passed validation successfully.`);
}
