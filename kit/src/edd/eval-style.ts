/** How one eval run talks to both the agent and the judge. */
export type EvalStyle = 'local' | 'http' | 'cli';

export type StyleJudgeBackend = 'heuristic' | 'http' | 'cli';

const LOCAL_MODEL_IDS = new Set(['', 'local', 'scripted', 'mock']);

export function isLocalModelId(model: string): boolean {
  return LOCAL_MODEL_IDS.has(model.trim().toLowerCase());
}

export function judgeBackendForStyle(style: EvalStyle): StyleJudgeBackend {
  if (style === 'local') return 'heuristic';
  return style;
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
  skipRequiresLiveCases: boolean;
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

  let style = fromStyle;
  if (!style) {
    style = cli ? 'cli' : inferStyle(input);
  }

  if (style === 'local' && cli) {
    throw new Error('--cli is only valid with --style cli');
  }
  if (style === 'cli' && !cli) {
    throw new Error('--style cli requires --cli <binary> (cursor-agent, claude, agy, or a PATH binary)');
  }
  if (style === 'cli' && isLocalModelId(input.model)) {
    throw new Error(
      '--style cli requires --model <assistant model id> (not local/scripted), e.g. cursor-grok-4.6-medium'
    );
  }
  if (style === 'http' && isLocalModelId(input.model)) {
    throw new Error('--style http requires --model <provider model id>, e.g. gpt-4o-mini');
  }

  return {
    style,
    model: input.model,
    cli,
    skipRequiresLiveCases: style === 'local'
  };
}
