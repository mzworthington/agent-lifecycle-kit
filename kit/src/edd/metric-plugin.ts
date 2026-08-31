import type { AgentResponse, EvalCase } from './schema.js';
import type { TrajectoryStep } from './trajectory.js';

export interface MetricPluginContext {
  testCase: EvalCase;
  response: AgentResponse;
  trajectory: TrajectoryStep[];
  availableTools: string[];
}

export interface MetricPluginResult {
  pass: boolean;
  reason: string;
}

export type MetricPlugin = (
  ctx: MetricPluginContext
) => MetricPluginResult | Promise<MetricPluginResult>;

/**
 * Driven port: load a consumer metric plugin module.
 */
export type LoadMetricPluginPort = (modulePath: string) => Promise<MetricPlugin>;

function isPlugin(value: unknown): value is MetricPlugin {
  return typeof value === 'function';
}

/**
 * Dynamic-import adapter for `type: plugin` metrics (`default` or `evaluate` export).
 */
export const loadMetricPlugin: LoadMetricPluginPort = async (modulePath) => {
  const mod = (await import(modulePath)) as {
    default?: unknown;
    evaluate?: unknown;
  };
  const candidate = mod.default ?? mod.evaluate;
  if (!isPlugin(candidate)) {
    throw new Error(
      `Metric plugin at ${modulePath} must export default or evaluate as a function`
    );
  }
  return candidate;
};
