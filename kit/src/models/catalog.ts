import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

export const MODEL_CLASSES = ['plan', 'review', 'implement', 'cheap'] as const;
export type ModelClass = (typeof MODEL_CLASSES)[number];

export interface SkillModelRoute {
  class: ModelClass;
  gatedBySpec?: boolean;
}

export interface ModelCatalog {
  classes: Record<ModelClass, { purpose: string }>;
  phases: Record<string, ModelClass>;
  skills: Record<string, SkillModelRoute>;
}

export interface HostOverlay {
  host: string;
  models: Record<ModelClass, string>;
}

export interface ResolveModelClassInput {
  skill?: string;
  phase?: string;
  specComplete?: boolean;
  blocked?: boolean;
}

export interface ResolvedHostModel {
  class: ModelClass;
  host: string;
  model: string;
}

function readYaml(filePath: string): unknown {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing model catalog file: ${filePath}`);
  }
  return parseYaml(fs.readFileSync(filePath, 'utf8'));
}

function isModelClass(value: unknown): value is ModelClass {
  return typeof value === 'string' && (MODEL_CLASSES as readonly string[]).includes(value);
}

function asPurposeMap(raw: unknown): Record<ModelClass, { purpose: string }> {
  if (!raw || typeof raw !== 'object') {
    throw new Error('catalog.yaml must define classes');
  }
  const out = {} as Record<ModelClass, { purpose: string }>;
  for (const name of MODEL_CLASSES) {
    const entry = (raw as Record<string, unknown>)[name];
    if (!entry || typeof entry !== 'object' || typeof (entry as { purpose?: unknown }).purpose !== 'string') {
      throw new Error(`catalog.yaml classes.${name} needs a purpose string`);
    }
    out[name] = { purpose: (entry as { purpose: string }).purpose };
  }
  return out;
}

function asClassMap(raw: unknown, label: string): Record<string, ModelClass> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, ModelClass> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!isModelClass(value)) {
      throw new Error(`${label}.${key} must be one of ${MODEL_CLASSES.join(', ')}`);
    }
    out[key] = value;
  }
  return out;
}

function asSkillMap(raw: unknown): Record<string, SkillModelRoute> {
  if (!raw || typeof raw !== 'object') {
    throw new Error('catalog.yaml must define skills');
  }
  const out: Record<string, SkillModelRoute> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') {
      throw new Error(`catalog.yaml skills.${key} must be a mapping`);
    }
    const cls = (value as { class?: unknown }).class;
    if (!isModelClass(cls)) {
      throw new Error(`catalog.yaml skills.${key}.class must be one of ${MODEL_CLASSES.join(', ')}`);
    }
    const gated = (value as { gatedBySpec?: unknown }).gatedBySpec;
    out[key] = {
      class: cls,
      ...(gated === true ? { gatedBySpec: true } : {})
    };
  }
  return out;
}

export function loadModelCatalog(kitRoot: string): ModelCatalog {
  const raw = readYaml(path.join(kitRoot, 'models', 'catalog.yaml')) as Record<string, unknown>;
  return {
    classes: asPurposeMap(raw.classes),
    phases: asClassMap(raw.phases, 'catalog.yaml phases'),
    skills: asSkillMap(raw.skills)
  };
}

export function listAgentSkills(kitRoot: string): string[] {
  const skillsDir = path.join(kitRoot, 'skills');
  if (!fs.existsSync(skillsDir)) return [];
  return fs
    .readdirSync(skillsDir)
    .filter((name) => name.startsWith('agent-') && fs.existsSync(path.join(skillsDir, name, 'SKILL.md')))
    .sort();
}

export function resolveModelClass(
  catalog: ModelCatalog,
  input: ResolveModelClassInput
): ModelClass {
  if (input.blocked) return 'plan';
  const skillRoute = input.skill ? catalog.skills[input.skill] : undefined;
  if (skillRoute) {
    if (skillRoute.gatedBySpec && input.specComplete === false) return 'plan';
    return skillRoute.class;
  }
  if (input.phase && isModelClass(catalog.phases[input.phase])) {
    return catalog.phases[input.phase];
  }
  return 'plan';
}

export function loadHostOverlay(kitRoot: string, host: string): HostOverlay {
  const raw = readYaml(path.join(kitRoot, 'models', 'hosts', `${host}.yaml`)) as Record<string, unknown>;
  const modelsRaw = raw.models;
  if (!modelsRaw || typeof modelsRaw !== 'object') {
    throw new Error(`${host} overlay must define models`);
  }
  const models = {} as Record<ModelClass, string>;
  for (const name of MODEL_CLASSES) {
    const slug = (modelsRaw as Record<string, unknown>)[name];
    if (typeof slug !== 'string' || !slug.trim()) {
      throw new Error(`${host} overlay missing class ${name}`);
    }
    models[name] = slug.trim();
  }
  return {
    host: typeof raw.host === 'string' ? raw.host : host,
    models
  };
}

export function resolveHostModel(
  kitRoot: string,
  modelClass: ModelClass,
  host = 'cursor'
): ResolvedHostModel {
  const overlay = loadHostOverlay(kitRoot, host);
  return { class: modelClass, host: overlay.host, model: overlay.models[modelClass] };
}

export function resolveModel(kitRoot: string, input: ResolveModelClassInput & { host?: string }): ResolvedHostModel {
  const catalog = loadModelCatalog(kitRoot);
  const modelClass = resolveModelClass(catalog, input);
  return resolveHostModel(kitRoot, modelClass, input.host ?? 'cursor');
}
