import { CELL_BY_ID } from "../data/board.ts";
import { POWERS, POWER_META, VICTORY, type PowerId, type Side } from "../data/catalog.ts";
import type { GameState } from "./types.ts";

export function ipcHeld(state: GameState, power: PowerId): number {
  let n = 0;
  for (const cell of Object.values(state.cells)) {
    if (cell.controller === power) n += CELL_BY_ID[cell.id]?.ipc ?? 0;
  }
  return n;
}

export function controlsCapital(state: GameState, power: PowerId): boolean {
  const cap = Object.values(CELL_BY_ID).find((c) => c.capital === power);
  if (!cap) return false;
  return state.cells[cap.id]?.controller === power;
}

export function victoryCities(state: GameState, side: Side): number {
  let n = 0;
  for (const def of Object.values(CELL_BY_ID)) {
    if (!def.victoryCity) continue;
    const owner = state.cells[def.id]?.controller;
    if (owner && POWER_META[owner].side === side) n++;
  }
  return n;
}

export function capitalsHeld(state: GameState, power: PowerId): number {
  return controlsCapital(state, power) ? 1 : 0;
}

export function collectIncome(state: GameState, power: PowerId): { amount: number; bonus: number } {
  if (!controlsCapital(state, power)) {
    state.income[power] = ipcHeld(state, power);
    return { amount: 0, bonus: 0 };
  }
  const amount = ipcHeld(state, power);
  state.income[power] = amount;
  // 1942 2e: no bonus IPC for capturing a capital in this edition (unlike some others).
  // Encoded as 0 so a later table can add it.
  const bonus = 0;
  state.treasuries[power] += amount + bonus;
  return { amount, bonus };
}

export function checkVictory(state: GameState): Side | null {
  const axis = victoryCities(state, "axis");
  const allies = victoryCities(state, "allies");
  if (axis >= VICTORY.axisStandard) return "axis";
  if (allies >= VICTORY.alliesStandard) return "allies";
  return null;
}

export function scoreVector(state: GameState): Record<PowerId, { ipc: number; vc: number; capital: number }> {
  const out = {} as Record<PowerId, { ipc: number; vc: number; capital: number }>;
  for (const p of POWERS) {
    const side = POWER_META[p].side;
    out[p] = {
      ipc: ipcHeld(state, p),
      vc: victoryCities(state, side),
      capital: capitalsHeld(state, p),
    };
  }
  return out;
}
