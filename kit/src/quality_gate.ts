import fs from 'node:fs';
import path from 'node:path';
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
import { checkOntology, type OntologyCheckResult } from './ontology/index.js';

/** Default EDD suites for this kit. Forks may delete vendor-specific suites; missing files are skipped. */
export const EDD_CI_SUITES = [
  'evals/edd/architecture_routing.yaml',
  'evals/edd/kit_knowledge.yaml',
  'evals/edd/memory_ontology.yaml',
  'evals/edd/cloudflare_ops.yaml',
  'evals/edd/safety.yaml',
  'evals/edd/architecture_self_correction.yaml',
  'evals/edd/architecture_terminal.yaml'
] as const;

/** Suites that exist on disk (so forks can drop vendor suites without breaking `kit check`). */
export function resolveEddCiSuites(
  repoDir: string,
  candidates: readonly string[] = EDD_CI_SUITES
): string[] {
  return candidates.filter((rel) => fs.existsSync(path.join(repoDir, rel)));
}

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
  ontologyCheck?: (repoDir: string) => OntologyCheckResult;
  eddSuites?: (repoDir: string) => string[];
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
  const ontologyCheck = deps.ontologyCheck ?? checkOntology;
  const eddSuites = deps.eddSuites ?? resolveEddCiSuites;

  console.log('=== kit check ===');
  console.log('');

  if (!scan(repoDir).ok) return 1;
  if (!validate(repoDir).ok) return 1;

  const layout = verifyLayout(repoDir);
  printLayout(layout);
  if (!layout.ok) return 1;

  const ontology = ontologyCheck(repoDir);
  if (!ontology.ok) {
    for (const msg of ontology.messages) console.error(msg);
    console.error('Ontology check FAILED.');
    return 1;
  }
  console.log('✅ Ontology check PASSED (derived index, no committed snapshot).');

  const rulesOk = exportRules(repoDir, true);
  if (!rulesOk) {
    console.error('Multi-IDE rule check FAILED.');
    return 1;
  }
  console.log('✅ Multi-IDE rule check PASSED.');

  if (!evals(repoDir)) return 1;

  const suites = eddSuites(repoDir);
  if (suites.length === 0) {
    console.log('No EDD CI suites present on disk; skipping EDD gate.');
  }
  for (const suite of suites) {
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
