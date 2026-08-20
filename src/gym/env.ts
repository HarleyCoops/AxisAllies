import { createInitialState, snapshot } from "../engine/state.ts";
import { legalActions } from "../engine/legal.ts";
import { applyAction } from "../engine/reducer.ts";
import type { Action, GameState, StepInfo } from "../engine/types.ts";
import { validateAction } from "./actions.ts";
import { observe, type Observation } from "./observation.ts";
import { rewardVector, stepReward } from "./rewards.ts";
import type { PowerId } from "../data/catalog.ts";

export interface StepResult {
  state: GameState;
  reward: number;
  rewards: Record<PowerId, number>;
  done: boolean;
  info: StepInfo;
  observation: Observation;
}

export interface AxisAlliesEnv {
  reset(seed?: number): { state: GameState; observation: Observation };
  legal_actions(state: GameState, power?: PowerId): Action[];
  step(state: GameState, action: unknown): StepResult;
}

export function createEnv(): AxisAlliesEnv {
  return {
    reset(seed = 1) {
      const state = createInitialState(seed);
      return { state, observation: observe(state) };
    },
    legal_actions(state, power) {
      if (power && power !== state.activePower) return [];
      return legalActions(state);
    },
    step(state, raw) {
      const parsed = validateAction(raw);
      if (!parsed.ok) {
        return {
          state,
          reward: 0,
          rewards: { ussr: 0, germany: 0, uk: 0, japan: 0, usa: 0 },
          done: state.done,
          info: { legalCount: legalActions(state).length, rejected: parsed.error },
          observation: observe(state),
        };
      }
      const before = snapshot(state);
      const next = snapshot(state);
      const applied = applyAction(next, parsed.action);
      if (!applied.ok) {
        return {
          state,
          reward: 0,
          rewards: { ussr: 0, germany: 0, uk: 0, japan: 0, usa: 0 },
          done: state.done,
          info: { legalCount: legalActions(state).length, rejected: applied.reason },
          observation: observe(state),
        };
      }
      const rewards = rewardVector(before, next);
      return {
        state: next,
        reward: stepReward(before, next, before.activePower),
        rewards,
        done: next.done,
        info: { legalCount: legalActions(next).length },
        observation: observe(next),
      };
    },
  };
}
