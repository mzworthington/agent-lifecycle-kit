import { execFile as nodeExecFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ProviderHttpError, withProviderRetry } from './provider-retry.js';

const execFileAsync = promisify(nodeExecFile);

/**
 * Driven port: complete a judge prompt and return parsed JSON.
 * Implemented by infrastructure; domain judges stay pure.
 */
export type JudgeCompletionPort = (input: {
  model: string;
  baseUrl?: string;
  apiKey?: string;
  prompt: string;
}) => Promise<Record<string, unknown>>;

/** How the harness obtains judge completions. */
export type JudgeBackend = 'http' | 'cli' | 'heuristic';

/** Known local code-assistant CLIs with headless JSON mode. */
export type JudgeCliPreset = 'claude' | 'cursor-agent' | 'agy' | 'antigravity';

export type ExecFileFn = (
  file: string,
  args: string[],
  options: { encoding: 'utf8'; maxBuffer: number; timeout: number }
) => Promise<{ stdout: string; stderr: string }>;

const defaultExecFile: ExecFileFn = async (file, args, options) => {
  const result = await execFileAsync(file, args, options);
  return { stdout: String(result.stdout), stderr: String(result.stderr) };
};

/**
 * OpenAI-compatible `/chat/completions` adapter for LLM-as-judge calls.
 * Used for CI (paid/provider HTTP) and local model servers (Ollama, LM Studio, vLLM).
 */
export const openAiCompatibleJudgeCompletion: JudgeCompletionPort = async (input) => {
  const baseUrl = (input.baseUrl ?? process.env.KIT_EVAL_BASE_URL ?? 'https://api.openai.com/v1').replace(
    /\/$/,
    ''
  );
  const apiKey = input.apiKey || 'local';
  return withProviderRetry(async () => {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: input.model,
        messages: [{ role: 'user', content: input.prompt }],
        temperature: 0,
        response_format: { type: 'json_object' }
      })
    });

    if (!res.ok) {
      const body = await res.text();
      throw new ProviderHttpError('Judge', res.status, body);
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content ?? '{}';
    try {
      return JSON.parse(content) as Record<string, unknown>;
    } catch {
      return {};
    }
  });
};

function tryParseJsonObject(text: string): Record<string, unknown> | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    /* fall through */
  }
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) return undefined;
  try {
    const parsed = JSON.parse(match[0]) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

/**
 * Normalize CLI envelopes (Claude Code / Cursor Agent / Antigravity) into judge JSON.
 * Accepts a raw judge object, or an envelope whose result/response/content is JSON text.
 */
export function parseJudgeCliStdout(stdout: string): Record<string, unknown> {
  const envelope = tryParseJsonObject(stdout);
  if (!envelope) return {};

  if ('score' in envelope || 'results' in envelope) {
    return envelope;
  }

  for (const key of ['result', 'response', 'content', 'message', 'text', 'output']) {
    const value = envelope[key];
    if (typeof value === 'string') {
      const inner = tryParseJsonObject(value);
      if (inner) return inner;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>;
      if ('score' in obj || 'results' in obj) return obj;
      if (typeof obj.content === 'string') {
        const nested = tryParseJsonObject(obj.content);
        if (nested) return nested;
      }
      if (typeof obj.text === 'string') {
        const nested = tryParseJsonObject(obj.text);
        if (nested) return nested;
      }
    }
  }

  return envelope;
}

export interface CliJudgePresetConfig {
  command: string;
  buildArgs: (input: { prompt: string; model: string }) => string[];
}

function modelFlag(model: string): string[] {
  if (!model || model === 'scripted' || model === 'mock' || model === 'local') return [];
  return ['--model', model];
}

/** Preset argv builders for known headless assistant CLIs. */
export const JUDGE_CLI_PRESETS: Record<JudgeCliPreset, CliJudgePresetConfig> = {
  claude: {
    command: 'claude',
    buildArgs: ({ prompt, model }) => ['-p', prompt, '--output-format', 'json', ...modelFlag(model)]
  },
  'cursor-agent': {
    command: 'cursor-agent',
    buildArgs: ({ prompt, model }) => [
      '-p',
      prompt,
      '--trust',
      '--output-format',
      'json',
      ...modelFlag(model)
    ]
  },
  agy: {
    command: 'agy',
    buildArgs: ({ prompt, model }) => ['-p', prompt, '--output-format', 'json', ...modelFlag(model)]
  },
  antigravity: {
    command: 'agy',
    buildArgs: ({ prompt, model }) => ['-p', prompt, '--output-format', 'json', ...modelFlag(model)]
  }
};

export interface CreateCliJudgeCompletionOptions {
  /** Preset name (`claude`, `cursor-agent`, `agy`) or a bare binary on PATH. */
  cli?: string;
  command?: string;
  buildArgs?: (input: { prompt: string; model: string }) => string[];
  /** Injectable for tests. */
  execFile?: ExecFileFn;
  /** Soft timeout per judge call (ms). */
  timeoutMs?: number;
}

/**
 * Shell-out JudgeCompletionPort for local code assistants with headless JSON mode.
 * Prefer for local/dev-loop judging; keep HTTP for CI merge gates.
 */
export function createCliJudgeCompletion(options: CreateCliJudgeCompletionOptions = {}): JudgeCompletionPort {
  const presetKey = (options.cli ?? 'claude') as JudgeCliPreset;
  const preset = JUDGE_CLI_PRESETS[presetKey];
  const command = options.command ?? preset?.command ?? (options.cli || 'claude');
  const buildArgs =
    options.buildArgs ??
    preset?.buildArgs ??
    (({ prompt, model }: { prompt: string; model: string }) => [
      '-p',
      prompt,
      '--output-format',
      'json',
      ...modelFlag(model)
    ]);
  const execFile = options.execFile ?? defaultExecFile;
  const timeoutMs = options.timeoutMs ?? 120_000;

  return async (input) => {
    const args = buildArgs({ prompt: input.prompt, model: input.model });
    try {
      const { stdout } = await execFile(command, args, {
        encoding: 'utf8',
        maxBuffer: 8 * 1024 * 1024,
        timeout: timeoutMs
      });
      return parseJudgeCliStdout(stdout);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Judge CLI (${command}) failed: ${message}`);
    }
  };
}

/** Claude Code: `claude -p … --output-format json`. */
export const claudeCodeJudgeCompletion: JudgeCompletionPort = createCliJudgeCompletion({ cli: 'claude' });

/** Cursor Agent CLI: `cursor-agent -p --trust --output-format json`. */
export const cursorAgentJudgeCompletion: JudgeCompletionPort = createCliJudgeCompletion({
  cli: 'cursor-agent'
});

/** Antigravity CLI: `agy -p --output-format json`. */
export const antigravityJudgeCompletion: JudgeCompletionPort = createCliJudgeCompletion({ cli: 'agy' });

export interface ResolveJudgeOptions {
  /** Explicit backend; default is inferred from key/baseUrl/model. */
  judge?: string;
  /** CLI preset or binary when backend is `cli`. */
  judgeCli?: string;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  /** Override port (tests / custom adapters). */
  complete?: JudgeCompletionPort;
  execFile?: ExecFileFn;
}

/**
 * Infer judge backend:
 * - explicit `--judge` wins
 * - scripted/mock/local models stay on heuristic unless overridden
 * - otherwise `http` when API key or base URL is present
 */
export function resolveJudgeBackend(options: ResolveJudgeOptions): JudgeBackend {
  const explicit = options.judge?.trim().toLowerCase();
  if (explicit === 'cli' || explicit === 'http' || explicit === 'heuristic') {
    return explicit;
  }
  if (options.complete) return 'http';
  if (options.model === 'scripted' || options.model === 'mock' || options.model === 'local') {
    return 'heuristic';
  }
  if (options.apiKey || options.baseUrl) return 'http';
  return 'heuristic';
}

/** Resolve the concrete JudgeCompletionPort for the chosen backend (undefined for heuristic). */
export function resolveJudgeCompletion(options: ResolveJudgeOptions): JudgeCompletionPort | undefined {
  if (options.complete) return options.complete;
  const backend = resolveJudgeBackend(options);
  if (backend === 'heuristic') return undefined;
  if (backend === 'cli') {
    return createCliJudgeCompletion({
      cli: options.judgeCli ?? 'claude',
      execFile: options.execFile
    });
  }
  return openAiCompatibleJudgeCompletion;
}

/** Dummy bearer accepted by most local OpenAI-compatible servers when no real key is set. */
export function resolveJudgeApiKey(apiKey?: string, baseUrl?: string, backend?: JudgeBackend): string | undefined {
  if (apiKey) return apiKey;
  if (backend === 'cli') return 'cli';
  if (baseUrl || backend === 'http') return 'local';
  return undefined;
}
