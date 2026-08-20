import { createRng, type Rng } from "../engine/rng.ts";
import type { Action } from "../engine/types.ts";
import { ACTION_SCHEMA, validateAction } from "../gym/actions.ts";
import { renderPrompt, type Observation } from "../gym/observation.ts";

export interface PolicyDecision {
  action: Action;
  prompt?: string;
  transcript?: string;
  source: "random" | "scripted" | "llm" | "llm-dry-run";
}

export interface Policy {
  readonly name: string;
  decide(obs: Observation): Promise<PolicyDecision>;
}

export class RandomLegalPolicy implements Policy {
  readonly name = "RandomLegalPolicy";
  private rng: Rng;

  constructor(seed = 1) {
    this.rng = createRng(seed ^ 0x9e3779b9);
  }

  async decide(obs: Observation): Promise<PolicyDecision> {
    if (!obs.legal.length) throw new Error("no legal actions");
    // Bias slightly toward ending the phase once many moves exist so games finish,
    // but still usually pick a real move.
    const end = obs.legal.find((a) => a.type === "end_phase");
    const rest = obs.legal.filter((a) => a.type !== "end_phase");
    let action: Action;
    if (end && rest.length && this.rng.next() < 0.08) action = end;
    else action = this.rng.pick(obs.legal);
    return { action, source: "random" };
  }
}

export class ScriptedSmokePolicy implements Policy {
  readonly name = "ScriptedSmokePolicy";
  constructor(private readonly script: Action[]) {}
  private i = 0;

  async decide(obs: Observation): Promise<PolicyDecision> {
    if (this.i < this.script.length) {
      const action = this.script[this.i++];
      const parsed = validateAction(action);
      if (!parsed.ok) throw new Error(`scripted action failed schema: ${parsed.error}`);
      return { action: parsed.action, source: "scripted" };
    }
    const end = obs.legal.find((a) => a.type === "end_phase");
    if (end) return { action: end, source: "scripted" };
    if (!obs.legal.length) throw new Error("script exhausted and no legal actions");
    return { action: obs.legal[0], source: "scripted" };
  }
}

export interface LlmPolicyOptions {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  /** When true (default if no key), compose the prompt and fall back to random. */
  dryRun?: boolean;
  fallbackSeed?: number;
}

/**
 * Prompt + schema are real. Live HTTP is optional: without AXISALLIES_API_KEY
 * the policy records the prompt and uses RandomLegalPolicy so a game still runs.
 */
export class LlmPolicy implements Policy {
  readonly name = "LlmPolicy";
  private fallback: RandomLegalPolicy;
  private dryRun: boolean;
  private apiKey?: string;
  private baseUrl: string;
  private model: string;

  constructor(opts: LlmPolicyOptions = {}) {
    this.apiKey = opts.apiKey ?? (typeof process !== "undefined" ? process.env.AXISALLIES_API_KEY : undefined);
    this.dryRun = opts.dryRun ?? !this.apiKey;
    this.baseUrl = opts.baseUrl ?? "https://api.openai.com/v1";
    this.model = opts.model ?? "gpt-4o-mini";
    this.fallback = new RandomLegalPolicy(opts.fallbackSeed ?? 7);
  }

  compose(obs: Observation): { prompt: string; schema: typeof ACTION_SCHEMA } {
    return { prompt: renderPrompt(obs), schema: ACTION_SCHEMA };
  }

  async decide(obs: Observation): Promise<PolicyDecision> {
    const { prompt } = this.compose(obs);
    if (this.dryRun || !this.apiKey) {
      const fb = await this.fallback.decide(obs);
      return { ...fb, prompt, source: "llm-dry-run", transcript: "dry-run: no AXISALLIES_API_KEY, used RandomLegalPolicy" };
    }
    const body = {
      model: this.model,
      messages: [
        { role: "system", content: "You are a schema-constrained wargame agent. Reply with one JSON action." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    };
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = json.choices?.[0]?.message?.content ?? "";
    let parsedRaw: unknown;
    try {
      parsedRaw = JSON.parse(text);
    } catch {
      const fb = await this.fallback.decide(obs);
      return { ...fb, prompt, source: "llm", transcript: `parse-fail, fallback. raw=${text.slice(0, 200)}` };
    }
    const checked = validateAction(parsedRaw);
    if (!checked.ok) {
      const fb = await this.fallback.decide(obs);
      return { ...fb, prompt, source: "llm", transcript: `schema-fail ${checked.error}` };
    }
    const legal = obs.legal.some((a) => JSON.stringify(a) === JSON.stringify(checked.action));
    if (!legal) {
      const fb = await this.fallback.decide(obs);
      return { ...fb, prompt, source: "llm", transcript: "action not in legal mask, fallback" };
    }
    return { action: checked.action, prompt, source: "llm", transcript: text };
  }
}
