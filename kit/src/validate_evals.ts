import fs from 'fs';
import path from 'path';
import AjvModule, { type ValidateFunction } from 'ajv';

const Ajv = AjvModule.default ?? AjvModule;

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

export interface ValidateEvalsResult {
  ok: boolean;
  errors: number;
  totalSuites: number;
  totalTests: number;
}

function loadSchemaValidator(schemaPath: string): ValidateFunction | null {
  if (!fs.existsSync(schemaPath)) {
    console.warn(`  ⚠️ Schema file not found at ${schemaPath} — falling back to structural checks only`);
    return null;
  }

  try {
    const schema: Record<string, unknown> = JSON.parse(fs.readFileSync(schemaPath, 'utf8')) as Record<string, unknown>;
    const ajv = new Ajv({ allErrors: true });
    return ajv.compile(schema);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`  ⚠️ Failed to compile schema: ${message} — falling back to structural checks only`);
    return null;
  }
}

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

function findEvalFiles(repoDir: string): EvalFileInfo[] {
  const files: EvalFileInfo[] = [];
  const skillsDir = path.join(repoDir, 'skills');
  const centralSuitesDir = path.join(repoDir, 'evals', 'suites');

  if (fs.existsSync(centralSuitesDir)) {
    for (const f of fs.readdirSync(centralSuitesDir)) {
      if (f.endsWith('.json')) {
        files.push({ relPath: `evals/suites/${f}`, absPath: path.join(centralSuitesDir, f) });
      }
    }
  }

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

export function validateEvals(repoDir: string): ValidateEvalsResult {
  const skillsDir = path.join(repoDir, 'skills');
  const schemaPath = path.join(repoDir, 'evals', 'schema.json');
  const validate = loadSchemaValidator(schemaPath);
  const evalFiles = findEvalFiles(repoDir);

  let totalSuites = 0;
  let totalTests = 0;
  let errors = 0;

  console.log('=== Agent Lifecycle Kit - Skill Evals Validation ===');
  console.log('');

  for (const fileInfo of evalFiles) {
    totalSuites++;
    console.log(`Checking suite: ${fileInfo.relPath}...`);

    let data: EvalSuite;
    try {
      data = JSON.parse(fs.readFileSync(fileInfo.absPath, 'utf8')) as EvalSuite;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ❌ Invalid JSON in ${fileInfo.relPath}: ${message}`);
      errors++;
      continue;
    }

    if (validate) {
      const valid = validate(data);
      if (!valid && validate.errors) {
        for (const schemaError of validate.errors) {
          console.error(`  ❌ Schema violation in ${fileInfo.relPath}: ${schemaError.instancePath} ${schemaError.message}`);
        }
        errors++;
        continue;
      }
    } else if (!data.suite || !data.version || !Array.isArray(data.test_cases)) {
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
      const skillTriggers = frontmatter?.triggers ? frontmatter.triggers.map((t: string) => t.toLowerCase()) : [];

      if (test.assertions && Array.isArray(test.assertions.required_triggers)) {
        for (const reqTrigger of test.assertions.required_triggers) {
          const normalizedReq = reqTrigger.toLowerCase();
          const found = skillTriggers.some((st: string) => st.includes(normalizedReq) || normalizedReq.includes(st));
          if (!found) {
            console.error(
              `  ⚠️ Test ${test.id}: required trigger "${reqTrigger}" not found in ${targetSkill} frontmatter triggers: [${skillTriggers.join(', ')}]`
            );
          }
        }
      }
    }

    console.log(`  ✓ ${fileInfo.relPath} passed structure check (${data.test_cases.length} test cases)`);
  }

  console.log('');
  console.log(`Validation Complete: ${totalSuites} suite(s), ${totalTests} test case(s) checked.`);

  if (errors > 0) {
    console.error(`❌ Validation failed with ${errors} error(s).`);
  } else {
    console.log('✅ All eval suites passed validation successfully.');
  }

  return { ok: errors === 0, errors, totalSuites, totalTests };
}
