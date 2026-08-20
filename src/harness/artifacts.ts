import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { PowerId } from "../data/catalog.ts";
import { compactFrame } from "../engine/view.ts";
import type { Action, GameState } from "../engine/types.ts";
import type { Observation } from "../gym/observation.ts";
import type { PolicyDecision } from "./policies.ts";

export { compactFrame };

export interface RunMetadata {
  schema: "axisallies.run.v1";
  runId: string;
  startedAt: string;
  seed: number;
  maxTurns: number;
  policies: Record<PowerId, string>;
  edition: string;
  board: { width: number; height: number };
  notes: string[];
}

export interface TrajectoryStep {
  i: number;
  power: PowerId;
  phase: GameState["phase"];
  turn: number;
  action: Action;
  reward: number;
  source: PolicyDecision["source"];
  done: boolean;
}

export interface ArtifactWriter {
  metadata(meta: RunMetadata): void;
  state(i: number, state: GameState): void;
  decision(i: number, obs: Observation, decision: PolicyDecision, reward: number): void;
  prompt(i: number, text: string): void;
  transcript(i: number, text: string): void;
  trajectory(step: TrajectoryStep): void;
  report(md: string): void;
  finish(meta: RunMetadata & { endedAt: string; winner: string | null; steps: number }): void;
}

export function createArtifactWriter(dir: string): ArtifactWriter {
  mkdirSync(join(dir, "state"), { recursive: true });
  mkdirSync(join(dir, "decisions"), { recursive: true });
  mkdirSync(join(dir, "prompts"), { recursive: true });
  mkdirSync(join(dir, "transcripts"), { recursive: true });
  const traj: TrajectoryStep[] = [];
  const pad = (i: number) => String(i).padStart(5, "0");

  return {
    metadata(meta) {
      writeFileSync(join(dir, "metadata.json"), JSON.stringify(meta, null, 2));
    },
    state(i, state) {
      writeFileSync(join(dir, "state", `${pad(i)}.json`), JSON.stringify(state));
    },
    decision(i, obs, decision, reward) {
      writeFileSync(
        join(dir, "decisions", `${pad(i)}.json`),
        JSON.stringify(
          {
            i,
            you: obs.you,
            phase: obs.phase,
            turn: obs.turn,
            action: decision.action,
            source: decision.source,
            reward,
            legalCount: obs.legal.length,
          },
          null,
          2,
        ),
      );
    },
    prompt(i, text) {
      writeFileSync(join(dir, "prompts", `${pad(i)}.txt`), text);
    },
    transcript(i, text) {
      writeFileSync(join(dir, "transcripts", `${pad(i)}.json`), JSON.stringify({ i, text }, null, 2));
    },
    trajectory(step) {
      traj.push(step);
    },
    report(md) {
      writeFileSync(join(dir, "REPORT.md"), md);
    },
    finish(meta) {
      writeFileSync(join(dir, "trajectory.jsonl"), traj.map((s) => JSON.stringify(s)).join("\n") + "\n");
      writeFileSync(join(dir, "trajectory.json"), JSON.stringify(traj, null, 2));
      writeFileSync(join(dir, "metadata.json"), JSON.stringify(meta, null, 2));
    },
  };
}

export function spectatorBundle(states: GameState[], traj: TrajectoryStep[]): unknown {
  return {
    schema: "axisallies.spectator.v1",
    width: 12,
    height: 12,
    steps: traj,
    frames: states.map(compactFrame),
  };
}
