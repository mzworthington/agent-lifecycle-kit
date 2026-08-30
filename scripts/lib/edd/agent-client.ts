import type { AgentResponse, AgentToolCall, AgentUsage, EvalMock, HistoryTurn } from './schema.js';

export interface ToolContract {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface AgentClientOptions {
  model: string;
  /** OpenAI-compatible base URL (also used for Ollama). */
  baseUrl?: string;
  apiKey?: string;
  systemPrompt?: string;
  /** Max consecutive tool failures before requiring terminal fallback. */
  circuitBreakerThreshold?: number;
}

export type AgentDriver = (input: {
  model: string;
  systemPrompt: string;
  messages: HistoryTurn[];
  tools: ToolContract[];
  mocks: Map<string, EvalMock[]>;
}) => Promise<Omit<AgentResponse, 'consecutiveToolFailures' | 'haltedAutonomousExecution'> & {
  consecutiveToolFailures?: number;
  haltedAutonomousExecution?: boolean;
}>;

function emptyUsage(): AgentUsage {
  return { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
}

function normalizeArgs(args: string | Record<string, unknown>): Record<string, unknown> {
  if (typeof args === 'string') {
    try {
      return JSON.parse(args) as Record<string, unknown>;
    } catch {
      return { _raw: args };
    }
  }
  return args;
}

/**
 * Keyword/scripted driver for local + CI harness self-tests without live LLM spend.
 * Real model drivers are selected when model !== "scripted".
 */
export const scriptedDriver: AgentDriver = async ({ messages, mocks }) => {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  const prompt = (lastUser?.content ?? '').toLowerCase();

  const priorToolError = [...messages]
    .reverse()
    .find((m) => m.role === 'tool' && (m.content ?? '').toLowerCase().includes('notfound'));

  // Negative / conversational — no tool
  if (
    prompt.includes('what does c4 stand for') ||
    prompt.includes('explain c4') ||
    (prompt.startsWith('what is') && !prompt.includes('architecture') && !prompt.includes('payment'))
  ) {
    return {
      content:
        'C4 is a model for describing software architecture (Context, Containers, Components, Code). I can pull a diagram if you name a service.',
      tool_calls: [],
      usage: { promptTokens: 40, completionTokens: 35, totalTokens: 75 },
      consecutiveToolFailures: 0,
      haltedAutonomousExecution: false,
      routingConfidence: 0.92
    };
  }

  // Error recovery: prior NotFound hint → correct componentId
  if (priorToolError || prompt.includes('try that again') || prompt.includes('try again')) {
    const toolName = 'read_architecture_yaml';
    const call: AgentToolCall = {
      name: toolName,
      arguments: { componentId: 'payment-api' }
    };
    return {
      content: 'Retrying with componentId payment-api based on the NotFound hint.',
      tool_calls: [call],
      usage: { promptTokens: 80, completionTokens: 40, totalTokens: 120 },
      consecutiveToolFailures: 0,
      haltedAutonomousExecution: false,
      routingConfidence: 0.88
    };
  }

  // Terminal fallback: repeated timeouts in history
  const timeoutCount = messages.filter(
    (m) => m.role === 'tool' && /timeout|timed out|network/i.test(m.content ?? '')
  ).length;
  if (timeoutCount >= 2 || prompt.includes('keep retrying') || prompt.includes('circuit')) {
    return {
      content:
        'I hit repeated network timeouts calling the architecture tool and am stopping autonomous retries. Please check connectivity or try again later.',
      tool_calls: [],
      usage: { promptTokens: 60, completionTokens: 50, totalTokens: 110 },
      consecutiveToolFailures: timeoutCount || 2,
      haltedAutonomousExecution: true,
      routingConfidence: 0.95
    };
  }

  // Happy-path architecture routing
  if (
    prompt.includes('architecture') ||
    prompt.includes('c4') ||
    prompt.includes('payment') ||
    prompt.includes('connects to') ||
    prompt.includes('pull up')
  ) {
    const toolName = 'read_architecture_yaml';
    const mocksForTool = mocks.get(toolName) ?? [];
    const mock = mocksForTool[0];
    const args = { componentId: prompt.includes('payment') ? 'payment-api' : 'payment-api' };
    return {
      content: mock
        ? `Architecture for ${(mock.response as { component?: string })?.component ?? 'payment-api'} loaded successfully.`
        : 'Fetching architecture…',
      tool_calls: [{ name: toolName, arguments: args }],
      usage: { promptTokens: 55, completionTokens: 45, totalTokens: 100 },
      consecutiveToolFailures: 0,
      haltedAutonomousExecution: false,
      routingConfidence: 0.9
    };
  }

  return {
    content: 'I am not sure which tool to use. Could you clarify?',
    tool_calls: [],
    usage: emptyUsage(),
    consecutiveToolFailures: 0,
    haltedAutonomousExecution: false,
    routingConfidence: 0.4
  };
};

export async function openAICompatibleDriver(
  opts: Required<Pick<AgentClientOptions, 'model' | 'baseUrl' | 'apiKey'>> & {
    systemPrompt: string;
    messages: HistoryTurn[];
    tools: ToolContract[];
  }
): Promise<Omit<AgentResponse, 'consecutiveToolFailures' | 'haltedAutonomousExecution'>> {
  const tools = opts.tools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description ?? t.name,
      parameters: t.inputSchema ?? { type: 'object', properties: {} }
    }
  }));

  const messages = [
    { role: 'system', content: opts.systemPrompt },
    ...opts.messages.map((m) => {
      if (m.role === 'assistant' && m.tool_calls?.length) {
        return {
          role: 'assistant',
          content: m.content ?? null,
          tool_calls: m.tool_calls.map((tc, i) => ({
            id: `call_${i}`,
            type: 'function',
            function: {
              name: tc.name,
              arguments: typeof tc.arguments === 'string' ? tc.arguments : JSON.stringify(tc.arguments)
            }
          }))
        };
      }
      if (m.role === 'tool') {
        return { role: 'tool', content: m.content ?? '', tool_call_id: 'call_0', name: m.name };
      }
      return { role: m.role, content: m.content ?? '' };
    })
  ];

  const res = await fetch(`${opts.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${opts.apiKey}`
    },
    body: JSON.stringify({
      model: opts.model,
      messages,
      tools: tools.length ? tools : undefined,
      temperature: 0
    })
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LLM provider error ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{
      message?: {
        content?: string | null;
        tool_calls?: Array<{ function?: { name?: string; arguments?: string } }>;
      };
    }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  };

  const message = data.choices?.[0]?.message;
  const tool_calls: AgentToolCall[] = (message?.tool_calls ?? [])
    .map((tc) => ({
      name: tc.function?.name ?? '',
      arguments: tc.function?.arguments ?? '{}'
    }))
    .filter((tc) => tc.name);

  const usage: AgentUsage = {
    promptTokens: data.usage?.prompt_tokens ?? 0,
    completionTokens: data.usage?.completion_tokens ?? 0,
    totalTokens: data.usage?.total_tokens ?? 0
  };

  return {
    content: message?.content ?? '',
    tool_calls,
    usage,
    routingConfidence: tool_calls.length ? 0.7 : 0.5
  };
}

export class AgentClient {
  private model: string;
  private baseUrl: string;
  private apiKey: string;
  private systemPrompt: string;
  private circuitBreakerThreshold: number;
  private driver?: AgentDriver;

  private messages: HistoryTurn[] = [];
  private mocks = new Map<string, EvalMock[]>();
  private tools = new Map<string, ToolContract>();
  private callCounts = new Map<string, number>();

  constructor(options: AgentClientOptions & { driver?: AgentDriver }) {
    this.model = options.model;
    this.baseUrl =
      options.baseUrl ??
      process.env.KIT_EVAL_BASE_URL ??
      process.env.OPENAI_BASE_URL ??
      'https://api.openai.com/v1';
    this.apiKey =
      options.apiKey ??
      process.env.KIT_EVAL_API_KEY ??
      process.env.OPENAI_API_KEY ??
      process.env.ANTHROPIC_API_KEY ??
      '';
    this.systemPrompt =
      options.systemPrompt ??
      'You are a kit agent. Prefer registered tools for architecture lookups. On repeated tool failures, stop retrying and report the constraint to the user.';
    this.circuitBreakerThreshold = options.circuitBreakerThreshold ?? 2;
    this.driver = options.driver;
  }

  resetContext(): void {
    this.messages = [];
    this.mocks.clear();
    this.callCounts.clear();
  }

  registerTool(contract: ToolContract): void {
    this.tools.set(contract.name, contract);
  }

  registerMockTool(tool: string, response: unknown, extra?: Partial<EvalMock>): void {
    const list = this.mocks.get(tool) ?? [];
    list.push({ tool, response, ...extra });
    this.mocks.set(tool, list);
  }

  seedHistory(history: HistoryTurn[]): void {
    this.messages.push(...history);
  }

  getMockPayload(tool: string): unknown | undefined {
    const count = this.callCounts.get(tool) ?? 0;
    const list = this.mocks.get(tool) ?? [];
    const mock = list.find((m) => (m.after_calls ?? 0) <= count) ?? list[0];
    if (!mock) return undefined;
    if (mock.error) {
      return mock.error.body ?? { error: 'error', status: mock.error.status };
    }
    return mock.response;
  }

  async executePrompt(prompt: string): Promise<AgentResponse> {
    this.messages.push({ role: 'user', content: prompt });

    const useScripted =
      this.model === 'scripted' || this.model === 'mock' || (!this.apiKey && this.model !== 'openai');

    let raw: Awaited<ReturnType<AgentDriver>>;
    if (this.driver) {
      raw = await this.driver({
        model: this.model,
        systemPrompt: this.systemPrompt,
        messages: this.messages,
        tools: [...this.tools.values()],
        mocks: this.mocks
      });
    } else if (useScripted) {
      raw = await scriptedDriver({
        model: this.model,
        systemPrompt: this.systemPrompt,
        messages: this.messages,
        tools: [...this.tools.values()],
        mocks: this.mocks
      });
    } else {
      raw = await openAICompatibleDriver({
        model: this.model,
        baseUrl: this.baseUrl,
        apiKey: this.apiKey,
        systemPrompt: this.systemPrompt,
        messages: this.messages,
        tools: [...this.tools.values()]
      });
    }

    // Apply mocked tool side-effects / failure counting for circuit-breaker metrics
    let consecutiveToolFailures = raw.consecutiveToolFailures ?? 0;
    let haltedAutonomousExecution = raw.haltedAutonomousExecution ?? false;

    if (raw.tool_calls.length) {
      for (const call of raw.tool_calls) {
        const n = (this.callCounts.get(call.name) ?? 0) + 1;
        this.callCounts.set(call.name, n);
        const mockList = this.mocks.get(call.name) ?? [];
        const mock = mockList.find((m) => (m.after_calls ?? 0) < n) ?? mockList[0];
        if (mock?.error) {
          consecutiveToolFailures += 1;
          this.messages.push({
            role: 'assistant',
            content: raw.content,
            tool_calls: [call]
          });
          this.messages.push({
            role: 'tool',
            name: call.name,
            content: JSON.stringify(mock.error.body ?? { error: 'error', status: mock.error.status })
          });
        } else if (mock) {
          consecutiveToolFailures = 0;
          this.messages.push({
            role: 'assistant',
            content: raw.content,
            tool_calls: [call]
          });
          this.messages.push({
            role: 'tool',
            name: call.name,
            content: JSON.stringify(mock.response)
          });
        }
      }
    } else {
      this.messages.push({ role: 'assistant', content: raw.content });
    }

    if (consecutiveToolFailures >= this.circuitBreakerThreshold && !raw.tool_calls.length) {
      haltedAutonomousExecution = true;
    }

    // Normalize argument strings for downstream schema_match
    const tool_calls = raw.tool_calls.map((tc) => ({
      name: tc.name,
      arguments:
        typeof tc.arguments === 'string' ? tc.arguments : JSON.stringify(normalizeArgs(tc.arguments))
    }));

    return {
      content: raw.content,
      tool_calls,
      usage: raw.usage,
      consecutiveToolFailures,
      haltedAutonomousExecution,
      routingConfidence: raw.routingConfidence
    };
  }
}
