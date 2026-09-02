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
  /** @deprecated Use --cli. */
  agentCli?: string;
  /** @deprecated Use --cli. */
  judgeCli?: string;
  /** Removed: agent and judge share --model. */
  judgeModel?: string;
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
  if (input.judgeModel?.trim()) {
    throw new Error('--judge-model is removed. Agent and judge share --model (one model per run).');
  }

  const fromStyle = parseStyleToken(input.style, '--style');

  const cliValues = [input.cli, input.agentCli, input.judgeCli]
    .map((v) => v?.trim())
    .filter((v): v is string => Boolean(v));
  const uniqueCli = [...new Set(cliValues)];
  if (uniqueCli.length > 1) {
    throw new Error(`--cli must be a single binary (got ${uniqueCli.join(' vs ')}).`);
  }

  let style = fromStyle;
  if (!style) {
    style = uniqueCli.length ? 'cli' : inferStyle(input);
  }

  if (style === 'local' && uniqueCli.length) {
    throw new Error('--cli is only valid with --style cli');
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
    cli: uniqueCli[0],
    skipRequiresLiveCases: style === 'local'
  };
}
