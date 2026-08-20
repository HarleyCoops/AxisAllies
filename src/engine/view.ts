import type { GameState } from "./types.ts";

export function compactFrame(s: GameState) {
  const stacks: Array<{ cell: string; owner: string; type: string; n: number }> = [];
  const tally = new Map<string, number>();
  for (const u of s.units) {
    if (u.loadedOn) continue;
    const k = `${u.cell}|${u.owner}|${u.type}`;
    tally.set(k, (tally.get(k) ?? 0) + 1);
  }
  for (const [k, n] of tally) {
    const [cell, owner, type] = k.split("|");
    stacks.push({ cell, owner, type, n });
  }
  const controllers: Record<string, string | null> = {};
  for (const [id, cell] of Object.entries(s.cells)) controllers[id] = cell.controller;
  return {
    turn: s.turn,
    activePower: s.activePower,
    phase: s.phase,
    treasuries: s.treasuries,
    income: s.income,
    winner: s.winner,
    controllers,
    stacks,
    log: s.log.slice(-10),
  };
}
