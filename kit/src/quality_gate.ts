import { exportIDERules } from './export_ide_rules.js';
import { runEvals } from './run_evals.js';
import { handleEddEvalCli, type EddCliOptions } from './edd_cli.js';
import { scanSkillSecurity, type ScanSkillSecurityResult } from './scan_skill_security.js';
import { validateEvals, type ValidateEvalsResult } from './validate_evals.js';
import {
  verifySkillsLayout,
  printSkillsLayoutResult,
  type SkillsLayoutResult
} from './verify_skills_layout.js';
import {
  measureContextBudget,
  printContextBudget,
  type ContextBudgetResult
} from './measure_context_budget.js';

export const EDD_CI_SUITES = [
  'evals/edd/architecture_routing.yaml',
  'evals/edd/kit_knowledge.yaml',
  'evals/edd/safety.yaml'
] as const;

export interface KitCheckDeps {
  scan?: (repoDir: string) => ScanSkillSecurityResult;
  validate?: (repoDir: string) => ValidateEvalsResult;
  verifyLayout?: (repoDir: string) => SkillsLayoutResult;
  printLayout?: (result: SkillsLayoutResult) => void;
  exportRules?: (targetDir: string, checkOnly: boolean) => boolean;
  evals?: (repoDir: string) => boolean;
  edd?: (options: EddCliOptions) => Promise<number | null>;
  budget?: (repoDir: string) => ContextBudgetResult;
  printBudget?: (result: ContextBudgetResult) => void;
}

export async function runKitCheck(repoDir: string, deps: KitCheckDeps = {}): Promise<number> {
  const scan = deps.scan ?? scanSkillSecurity;
  const validate = deps.validate ?? validateEvals;
  const verifyLayout = deps.verifyLayout ?? verifySkillsLayout;
  const printLayout = deps.printLayout ?? printSkillsLayoutResult;
  const exportRules = deps.exportRules ?? exportIDERules;
  const evals = deps.evals ?? runEvals;
  const edd = deps.edd ?? handleEddEvalCli;
  const budget = deps.budget ?? measureContextBudget;
  const printBudget = deps.printBudget ?? printContextBudget;

  console.log('=== kit check ===');
  console.log('');

  if (!scan(repoDir).ok) return 1;
  if (!validate(repoDir).ok) return 1;

  const layout = verifyLayout(repoDir);
  printLayout(layout);
  if (!layout.ok) return 1;

  const rulesOk = exportRules(repoDir, true);
  if (!rulesOk) {
    console.error('Multi-IDE rule check FAILED.');
    return 1;
  }
  console.log('✅ Multi-IDE rule check PASSED.');

  if (!evals(repoDir)) return 1;

  for (const suite of EDD_CI_SUITES) {
    const code = await edd({
      repoDir,
      args: [
        'ci',
        '--suite',
        suite,
        '--threshold-routing',
        '95',
        '--model',
        'scripted',
        '--out',
        'out/reports'
      ]
    });
    if (code !== 0) return code ?? 1;
  }

  const budgetResult = budget(repoDir);
  printBudget(budgetResult);
  if (!budgetResult.ok) return 1;

  console.log('');
  console.log('✅ kit check PASSED.');
  return 0;
}
