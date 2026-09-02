/** How one eval run talks to both the agent and the judge. */
export type EvalStyle = 'local' | 'http' | 'cli';

/** Judge implementation that matches the run style (local → heuristic). */
export type JudgeBackend = 'heuristic' | 'http' | 'cli';

const LOCAL_MODEL_IDS = new Set(['', 'local', 'scripted', 'mock']);

export function isLocalModelId(model: string): boolean {
  return LOCAL_MODEL_IDS.has(model.trim().toLowerCase());
}

export function judgeBackendForStyle(style: EvalStyle): JudgeBackend {
  return style === 'local' ? 'heuristic' : style;
}

export interface ResolveEvalRunInput {
  style?: string;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  cli?: string;
}

export interface EvalRun {
  style: EvalStyle;
  model: string;
  cli?: string;
}

function parseStyleToken(raw: string | undefined, flag: string): EvalStyle | undefined {
  if (!raw) return undefined;
  const t = raw.trim().toLowerCase();
  if (t === 'local' || t === 'scripted' || t === 'mock' || t === 'heuristic') return 'local';
  if (t === 'http' || t === 'live') return 'http';
  if (t === 'cli') return 'cli';
  throw new Error(`Unknown ${flag} "${raw}". Use local, http, or cli.`);
}

function inferStyle(input: ResolveEvalRunInput): EvalStyle {
  if (isLocalModelId(input.model)) return 'local';
  if (input.apiKey || input.baseUrl || input.model === 'openai') return 'http';
  return 'local';
}

/** One style and one model for agent + judge. Mixing backends is not supported. */
export function resolveEvalRun(input: ResolveEvalRunInput): EvalRun {
  const fromStyle = parseStyleToken(input.style, '--style');
  const cli = input.cli?.trim() || undefined;
  const style = fromStyle ?? (cli ? 'cli' : inferStyle(input));

  if (style === 'local' && cli) {
    throw new Error('--cli is only valid with --style cli');
  }
  if (style === 'cli' && !cli) {
    throw new Error('--style cli requires --cli <binary> (cursor-agent, claude, agy, or a PATH binary)');
  }
  if (style !== 'local' && isLocalModelId(input.model)) {
    throw new Error(
      `--style ${style} requires --model <model id> (not local/scripted), e.g. ${
        style === 'cli' ? 'cursor-grok-4.6-medium' : 'gpt-4o-mini'
      }`
    );
  }

  return { style, model: input.model, cli };
}
