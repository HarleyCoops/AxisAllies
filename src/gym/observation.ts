import { CELLS, HEIGHT, WIDTH } from "../data/board.ts";
import { POWER_META, TURN_ORDER, UNIT_CATALOG, VICTORY } from "../data/catalog.ts";
import { ipcHeld, victoryCities } from "../engine/income.ts";
import { legalActions } from "../engine/legal.ts";
import type { Action, GameState } from "../engine/types.ts";

export const RULEBOOK = {
  edition: "Axis & Allies 1942 Second Edition (compressed 12×12 schematic)",
  turnOrder: TURN_ORDER,
  phases: ["purchase", "combat_move", "combat", "noncombat_move", "place", "collect"],
  victory: VICTORY,
  units: Object.values(UNIT_CATALOG).map((u) => ({
    id: u.id,
    cost: u.cost,
    attack: u.attack,
    defense: u.defense,
    movement: u.movement,
    specials: u.specials,
  })),
  board: { width: WIDTH, height: HEIGHT, wrap: "east-west" },
  gaps: [
    "Strategic bombing raids are not resolved as a separate sequence (bombers fight in general combat).",
    "Air units are not required to reserve landing movement during combat move; they must land in NCM or they stay put (not destroyed automatically).",
    "Industrial-complex damage/capacity from SBR is not modeled.",
    "Multinational attacking is not used (only the active power attacks).",
    "Submerge-after-combat is not implemented; subs fight or die.",
    "Geography is a 12×12 compression — a few land-land contacts exist that the full board separates by sea.",
    "Opening sea stacks and some merged land stacks are flagged uncertain in src/data/setup.ts.",
  ],
};

export interface Observation {
  schema: "axisallies.obs.v1";
  you: GameState["activePower"];
  turn: number;
  phase: GameState["phase"];
  rulebook: typeof RULEBOOK;
  treasuries: GameState["treasuries"];
  income: GameState["income"];
  victoryCities: { axis: number; allies: number };
  board: Array<{
    id: string;
    x: number;
    y: number;
    kind: string;
    ipc: number;
    controller: string | null;
    vc: string | null;
    factory: boolean;
  }>;
  units: GameState["units"];
  pending: GameState["pending"];
  legal: Action[];
}

export function observe(state: GameState): Observation {
  return {
    schema: "axisallies.obs.v1",
    you: state.activePower,
    turn: state.turn,
    phase: state.phase,
    rulebook: RULEBOOK,
    treasuries: state.treasuries,
    income: {
      ussr: ipcHeld(state, "ussr"),
      germany: ipcHeld(state, "germany"),
      uk: ipcHeld(state, "uk"),
      japan: ipcHeld(state, "japan"),
      usa: ipcHeld(state, "usa"),
    },
    victoryCities: {
      axis: victoryCities(state, "axis"),
      allies: victoryCities(state, "allies"),
    },
    board: CELLS.map((c) => ({
      id: c.id,
      x: c.x,
      y: c.y,
      kind: c.kind,
      ipc: c.ipc,
      controller: state.cells[c.id]?.controller ?? null,
      vc: c.victoryCity,
      factory: state.cells[c.id]?.factory ?? false,
    })),
    units: state.units,
    pending: state.pending,
    legal: legalActions(state),
  };
}

export function renderPrompt(obs: Observation): string {
  const you = POWER_META[obs.you];
  const legal = obs.legal.slice(0, 80);
  const more = obs.legal.length > 80 ? `\n… ${obs.legal.length - 80} more legal actions` : "";
  const stacks = summarizeStacks(obs);
  return [
    `You are the ${you.name} high command (${you.side}).`,
    `This is an isolated invocation: you have no hidden memory beyond this snapshot.`,
    `Turn ${obs.turn} · phase ${obs.phase}.`,
    `Victory cities — Axis ${obs.victoryCities.axis} / Allies ${obs.victoryCities.allies} (win at Axis ${VICTORY.axisStandard} or Allies ${VICTORY.alliesStandard} after the US turn).`,
    `Treasuries: ${JSON.stringify(obs.treasuries)}`,
    `Income (IPC held): ${JSON.stringify(obs.income)}`,
    ``,
    `RULEBOOK (structured, not a publisher text dump)`,
    `- Turn order: ${TURN_ORDER.join(" → ")}`,
    `- Phases: ${obs.rulebook.phases.join(" → ")}`,
    `- Board: ${WIDTH}×${HEIGHT} schematic, east-west wrap.`,
    `- Units (cost/atk/def/move): ${obs.rulebook.units.map((u) => `${u.id} ${u.cost}/${u.attack}/${u.defense}/${u.movement}`).join(", ")}`,
    `- Known engine gaps: ${obs.rulebook.gaps.join(" ")}`,
    ``,
    `BOARD STACKS`,
    stacks,
    ``,
    `LEGAL ACTIONS (you MUST pick exactly one JSON object from this list)`,
    legal.map((a) => JSON.stringify(a)).join("\n") + more,
    ``,
    `Reply with only the JSON action object.`,
  ].join("\n");
}

function summarizeStacks(obs: Observation): string {
  const by = new Map<string, string[]>();
  for (const u of obs.units) {
    if (u.loadedOn) continue;
    const key = `${u.cell}:${u.owner}`;
    if (!by.has(key)) by.set(key, []);
    by.get(key)!.push(u.type);
  }
  const lines: string[] = [];
  for (const [key, types] of [...by.entries()].sort()) {
    const [cell, owner] = key.split(":");
    const counts = new Map<string, number>();
    for (const t of types) counts.set(t, (counts.get(t) ?? 0) + 1);
    const body = [...counts.entries()].map(([t, n]) => `${n}${t.slice(0, 3)}`).join(" ");
    const hex = obs.board.find((b) => b.id === cell);
    lines.push(`  (${hex?.x},${hex?.y}) ${cell} ${owner}: ${body}`);
  }
  return lines.join("\n");
}
