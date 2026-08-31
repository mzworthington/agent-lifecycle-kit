import type { AgentToolCall } from './schema.js';

/**
 * Pure `mcp_use` metric: only call tools from the available MCP catalog,
 * and honor expected tool / no_tool intents when provided.
 */
export function evaluateMcpUse(input: {
  toolCalls: AgentToolCall[];
  availableTools: string[];
  expectTool?: string;
  expectTools?: string[];
  noTool?: boolean;
}): string[] {
  const failures: string[] = [];
  const available = new Set(input.availableTools);
  const calls = input.toolCalls ?? [];

  for (const call of calls) {
    if (!available.has(call.name)) {
      failures.push(`mcp: tool ${call.name} is not in the available MCP catalog`);
    }
  }

  if (input.noTool) {
    if (calls.length) {
      failures.push(`mcp: expected no MCP tool use, got ${calls[0]?.name}`);
    }
    return failures;
  }

  if (input.expectTools?.length) {
    for (let i = 0; i < input.expectTools.length; i++) {
      const expected = input.expectTools[i]!;
      if (!available.has(expected)) {
        failures.push(`mcp: expected tool ${expected} is not registered in the MCP catalog`);
      }
      if (calls[i]?.name !== expected) {
        failures.push(`mcp: step[${i}] expected ${expected}, got ${calls[i]?.name ?? '(none)'}`);
      }
    }
    return failures;
  }

  if (input.expectTool) {
    if (!available.has(input.expectTool)) {
      failures.push(`mcp: expected tool ${input.expectTool} is not registered in the MCP catalog`);
    }
    if (calls[0]?.name !== input.expectTool) {
      failures.push(`mcp: expected ${input.expectTool}, got ${calls[0]?.name ?? '(none)'}`);
    }
  }

  return failures;
}
