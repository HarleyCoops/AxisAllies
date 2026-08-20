import { POWERS, type PowerId } from "../data/catalog.ts";
import type { GameState } from "../engine/types.ts";
import { createEnv } from "../gym/env.ts";
import { observe, renderPrompt } from "../gym/observation.ts";
import { createArtifactWriter, type ArtifactWriter, type RunMetadata, type TrajectoryStep } from "./artifacts.ts";
import { RandomLegalPolicy, type Policy } from "./policies.ts";

export interface RunConfig {
  seed?: number;
  maxTurns?: number;
  maxSteps?: number;
  policies?: Partial<Record<PowerId, Policy>>;
  outDir?: string;
  writer?: ArtifactWriter;
  onStep?: (info: { i: number; state: GameState; action: unknown }) => void;
}

export interface RunResult {
  state: GameState;
  steps: number;
  winner: string | null;
  trajectory: TrajectoryStep[];
  frames: GameState[];
}

export async function runGame(cfg: RunConfig = {}): Promise<RunResult> {
  const seed = cfg.seed ?? 1;
  const maxTurns = cfg.maxTurns ?? 8;
  const maxSteps = cfg.maxSteps ?? 4000;
  const env = createEnv();
  let { state } = env.reset(seed);

  const policies: Record<PowerId, Policy> = {
    ussr: cfg.policies?.ussr ?? new RandomLegalPolicy(seed + 11),
    germany: cfg.policies?.germany ?? new RandomLegalPolicy(seed + 22),
    uk: cfg.policies?.uk ?? new RandomLegalPolicy(seed + 33),
    japan: cfg.policies?.japan ?? new RandomLegalPolicy(seed + 44),
    usa: cfg.policies?.usa ?? new RandomLegalPolicy(seed + 55),
  };

  const runId = `run-${seed}-${Date.now()}`;
  const writer = cfg.writer ?? (cfg.outDir ? createArtifactWriter(cfg.outDir) : undefined);
  const meta: RunMetadata = {
    schema: "axisallies.run.v1",
    runId,
    startedAt: new Date().toISOString(),
    seed,
    maxTurns,
    policies: {
      ussr: policies.ussr.name,
      germany: policies.germany.name,
      uk: policies.uk.name,
      japan: policies.japan.name,
      usa: policies.usa.name,
    },
    edition: "1942 2e mechanics on a 12×12 schematic",
    board: { width: 12, height: 12 },
    notes: [
      "Agents play; the harness is the only mutator.",
      "Each decision is schema-validated against the legal-action mask.",
      "Snapshot is frozen while a power chooses.",
    ],
  };
  writer?.metadata(meta);
  writer?.state(0, state);

  const trajectory: TrajectoryStep[] = [];
  const frames: GameState[] = [structuredClone(state)];
  let i = 0;

  while (!state.done && state.turn <= maxTurns && i < maxSteps) {
    const obs = observe(state);
    const frozen = structuredClone(obs);
    const policy = policies[state.activePower];
    const decision = await policy.decide(frozen);
    const result = env.step(state, decision.action);
    if (result.info.rejected) {
      const end = obs.legal.find((a) => a.type === "end_phase") ?? obs.legal[0];
      if (!end) break;
      const retry = env.step(state, end);
      state = retry.state;
    } else {
      state = result.state;
    }
    i += 1;
    const step: TrajectoryStep = {
      i,
      power: frozen.you,
      phase: frozen.phase,
      turn: frozen.turn,
      action: decision.action,
      reward: result.reward,
      source: decision.source,
      done: state.done,
    };
    trajectory.push(step);
    frames.push(structuredClone(state));
    writer?.decision(i, frozen, decision, result.reward);
    writer?.state(i, state);
    const prompt = decision.prompt ?? renderPrompt(frozen);
    writer?.prompt(i, prompt);
    if (decision.transcript) writer?.transcript(i, decision.transcript);
    writer?.trajectory(step);
    cfg.onStep?.({ i, state, action: decision.action });
  }

  if (state.turn > maxTurns && !state.done) {
    state = structuredClone(state);
    state.done = true;
    state.log.push({ t: "note", text: `stopped at maxTurns=${maxTurns}` });
  }

  const report = [
    `# AxisAllies run ${runId}`,
    ``,
    `- Seed: ${seed}`,
    `- Steps: ${i}`,
    `- Turns completed (current): ${state.turn}`,
    `- Winner: ${state.winner ?? "none (cap reached or still playing)"}`,
    `- Policies: ${POWERS.map((p) => `${p}=${policies[p].name}`).join(", ")}`,
    `- Treasuries: ${JSON.stringify(state.treasuries)}`,
    `- Income: ${JSON.stringify(state.income)}`,
    ``,
    `Agents played; humans watch. The harness mutated state; policies only emitted schema-valid actions.`,
  ].join("\n");
  writer?.report(report);
  writer?.finish({ ...meta, endedAt: new Date().toISOString(), winner: state.winner, steps: i });

  return { state, steps: i, winner: state.winner, trajectory, frames };
}
