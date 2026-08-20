import { POWERS, POWER_META, type PowerId } from "../data/catalog.ts";
import { capitalsHeld, ipcHeld, victoryCities } from "../engine/income.ts";
import type { GameState } from "../engine/types.ts";

/** Tunable linear reward. Later RL policies can replace the LLM without changing the env. */
export const REWARD_WEIGHTS = {
  ipc: 0.02,
  vc: 0.35,
  capital: 1.5,
  win: 10,
  loss: -10,
};

export function potential(state: GameState, power: PowerId): number {
  const side = POWER_META[power].side;
  return (
    REWARD_WEIGHTS.ipc * ipcHeld(state, power) +
    REWARD_WEIGHTS.vc * victoryCities(state, side) +
    REWARD_WEIGHTS.capital * capitalsHeld(state, power)
  );
}

export function stepReward(before: GameState, after: GameState, power: PowerId): number {
  let r = potential(after, power) - potential(before, power);
  if (after.done && after.winner) {
    const won = POWER_META[power].side === after.winner;
    r += won ? REWARD_WEIGHTS.win : REWARD_WEIGHTS.loss;
  }
  return r;
}

export function rewardVector(before: GameState, after: GameState): Record<PowerId, number> {
  const out = {} as Record<PowerId, number>;
  for (const p of POWERS) out[p] = stepReward(before, after, p);
  return out;
}
