import { z } from 'zod';

export const EvalMetricSchema = z.object({
  type: z.enum([
    'tool_selection',
    'schema_match',
    'llm_as_judge',
    'self_correction',
    'terminal_fallback',
    'argument_correctness',
    'task_completion',
    'criteria_judge',
    'mcp_use',
    'step_efficiency',
    'plan_adherence',
    'plugin'
  ]),
  expected: z.string().optional(),
  strict: z.boolean().optional(),
  max_retries: z.number().int().positive().optional(),
  /** Written criteria for `criteria_judge` (suite-level). */
  criteria: z.array(z.string().min(1)).optional(),
  /** Fraction of criteria that must pass (0-1). Defaults to 1. */
  threshold: z.number().min(0).max(1).optional(),
  /** Max tool steps for `step_efficiency`. */
  max_steps: z.number().int().nonnegative().optional(),
  /** Module path for `type: plugin` (resolved relative to the suite YAML). */
  module: z.string().min(1).optional(),
  /** Optional allow-list override for `mcp_use` (defaults to registered MCP tools). */
  allowed_tools: z.array(z.string().min(1)).optional()
});

export const EvalMockSchema = z
  .object({
    tool: z.string().min(1),
    response: z.unknown().optional(),
    /** When set, mock only applies after this many calls to the tool (0-based). */
    after_calls: z.number().int().nonnegative().optional(),
    /** Simulate an error payload for self-correction / terminal-fallback evals. */
    error: z
      .object({
        status: z.number().int().optional(),
        body: z.unknown()
      })
      .optional()
  })
  .refine((m) => m.response !== undefined || m.error !== undefined, {
    message: 'Mock must include response and/or error'
  });

export const EvalConfigSchema = z.object({
  name: z.string().min(1),
  dataset: z.string().min(1),
  metrics: z.array(EvalMetricSchema).min(1),
  mocks: z.array(EvalMockSchema).optional(),
  /** Optional MCP tool schema files (JSON) to register contracts during the run. */
  mcp_tools: z.array(z.string()).optional(),
  /** Optional system prompt file, relative to the suite YAML. */
  system_prompt: z.string().optional()
});

export type EvalConfig = z.infer<typeof EvalConfigSchema>;
export type EvalMetric = z.infer<typeof EvalMetricSchema>;
export type EvalMock = z.infer<typeof EvalMockSchema>;

export const HistoryTurnSchema = z.object({
  role: z.enum(['user', 'assistant', 'tool', 'system']),
  content: z.string().optional(),
  tool_calls: z
    .array(
      z.object({
        name: z.string(),
        arguments: z.union([z.string(), z.record(z.string(), z.unknown())])
      })
    )
    .optional(),
  name: z.string().optional()
});

export const ExpectedToolCallSchema = z.object({
  name: z.string().min(1),
  arguments_contains: z.record(z.string(), z.unknown()).optional()
});

export const CaseExpectSchema = z.object({
  tool: z.string().optional(),
  no_tool: z.boolean().optional(),
  arguments_contains: z.record(z.string(), z.unknown()).optional(),
  /** Ordered tool calls (multi-step). Takes precedence over `tool` when set. */
  tools: z.array(ExpectedToolCallSchema).min(1).optional(),
  /** User goal for `task_completion` (semantic outcome, not only tool name). */
  goal: z.string().optional()
});

export const EvalCaseSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  history: z.array(HistoryTurnSchema).optional(),
  tags: z.array(z.string()).optional(),
  expect: CaseExpectSchema.optional(),
  tool_output: z.unknown().optional(),
  judge_reference: z.string().optional()
});

export type EvalCase = z.infer<typeof EvalCaseSchema>;
export type HistoryTurn = z.infer<typeof HistoryTurnSchema>;

export const AgentToolCallSchema = z.object({
  name: z.string(),
  arguments: z.union([z.string(), z.record(z.string(), z.unknown())])
});

export type AgentToolCall = z.infer<typeof AgentToolCallSchema>;

export interface AgentUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AgentResponse {
  content: string;
  tool_calls: AgentToolCall[];
  usage: AgentUsage;
  /** Consecutive tool failures observed during this turn (for circuit-breaker asserts). */
  consecutiveToolFailures: number;
  /** True when the agent stopped retrying and reported the constraint to the user. */
  haltedAutonomousExecution: boolean;
  routingConfidence?: number;
}
