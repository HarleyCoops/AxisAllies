import { adjacentIds, CANALS, CELL_BY_ID, CELLS } from "../data/board.ts";
import {
  POWERS,
  POWER_META,
  TURN_ORDER,
  UNIT_CATALOG,
  areAllied,
  isLandCombatant,
  type PowerId,
} from "../data/catalog.ts";
import {
  attackersIn,
  attachRng,
  battleOpen,
  commitRng,
  defendersIn,
  detectBattles,
  fillBombardment,
  resolveBattle,
} from "./combat.ts";
import { checkVictory, collectIncome, ipcHeld } from "./income.ts";
import { isFriendlyLand, isLegal, isNeutral, neighborsForMove } from "./legal.ts";
import { resetTurnFlags, spawnUnit, unitById, unitsAt } from "./state.ts";
import type { Action, GameState, Phase, Unit } from "./types.ts";

const PHASE_AFTER: Record<Phase, Phase | "next_power"> = {
  purchase: "combat_move",
  combat_move: "combat",
  combat: "noncombat_move",
  noncombat_move: "place",
  place: "collect",
  collect: "next_power",
};

function alliedController(state: GameState, id: string, power: PowerId): boolean {
  const c = state.cells[id]?.controller;
  return Boolean(c && areAllied(c, power));
}

export function snapshotCanals(state: GameState, power: PowerId): void {
  for (const canal of CANALS) {
    state.canalOpen[canal.id] = canal.requires.every((id) => alliedController(state, id, power));
  }
}

function beginPowerTurn(state: GameState, power: PowerId): void {
  state.activePower = power;
  state.phase = "purchase";
  state.pending = [];
  state.capturedThisTurn = [];
  state.battles = [];
  state.controlledAtTurnStart = CELLS.filter(
    (c) => c.kind === "land" && state.cells[c.id].controller === power,
  ).map((c) => c.id);
  snapshotCanals(state, power);
  resetTurnFlags(state);
  state.log.push({ t: "phase", power, phase: "purchase", turn: state.turn });
}

function captureCell(state: GameState, cell: string, taker: PowerId): void {
  const def = CELL_BY_ID[cell];
  if (!def || def.kind !== "land") return;
  const prev = state.cells[cell].controller;
  if (prev === taker) return;
  let liberatedTo: PowerId | undefined;
  if (def.originalOwner && def.originalOwner !== taker && areAllied(def.originalOwner, taker)) {
    const cap = CELLS.find((c) => c.capital === def.originalOwner);
    if (cap && state.cells[cap.id].controller === def.originalOwner) {
      liberatedTo = def.originalOwner;
    }
  }
  const next = liberatedTo ?? taker;
  state.cells[cell].controller = next;
  if (next === taker) state.capturedThisTurn.push(cell);
  state.log.push({ t: "capture", power: taker, cell, from: prev, liberatedTo });

  if (def.capital && prev && def.capital === prev) {
    const loot = state.treasuries[prev];
    state.treasuries[prev] = 0;
    state.treasuries[taker] += loot;
    state.log.push({ t: "note", text: `${taker} captured ${prev} capital and ${loot} IPC` });
  }

  for (const aaa of unitsAt(state, cell, (u) => u.type === "aaa" && u.owner !== next && !areAllied(u.owner, next))) {
    state.units = state.units.filter((u) => u.id !== aaa.id);
  }
}

function landConquerors(state: GameState, cell: string, power: PowerId): Unit[] {
  return unitsAt(state, cell, (u) => u.owner === power && isLandCombatant(u.type));
}

function resolveUncontested(state: GameState, power: PowerId): void {
  const seen = new Set<string>();
  for (const u of state.units) {
    if (u.owner !== power || u.loadedOn) continue;
    if (seen.has(u.cell)) continue;
    seen.add(u.cell);
    const def = CELL_BY_ID[u.cell];
    if (!def || def.kind !== "land") continue;
    if (!landConquerors(state, u.cell, power).length) continue;
    const owner = state.cells[u.cell].controller;
    if (!owner || areAllied(owner, power)) continue;
    const enemies = unitsAt(
      state,
      u.cell,
      (x) => !areAllied(x.owner, power) && x.type !== "aaa" && x.type !== "factory",
    );
    if (!enemies.length) captureCell(state, u.cell, power);
  }
}

function enterCombatPhase(state: GameState): void {
  const power = state.activePower;
  resolveUncontested(state, power);
  const battles = detectBattles(state, power);
  for (const b of battles) fillBombardment(state, b);
  state.battles = battles;
  if (!battles.length) {
    // skip empty combat
  }
}

function finishBattle(state: GameState, cell: string): void {
  const battle = state.battles.find((b) => b.cell === cell);
  state.battles = state.battles.filter((b) => b.cell !== cell);
  const power = state.activePower;
  const def = CELL_BY_ID[cell];
  if (battle?.kind === "sbr") {
    // Strategic bombers return to a friendly-controlled land cell after the raid.
    const home = state.controlledAtTurnStart.find(
      (id) => CELL_BY_ID[id]?.kind === "land" && state.cells[id]?.controller === power,
    );
    if (home) {
      for (const u of unitsAt(state, cell, (x) => x.owner === power && x.type === "bomber")) {
        u.cell = home;
      }
    }
    return;
  }
  if (def?.kind === "land" && landConquerors(state, cell, power).length) {
    const owner = state.cells[cell].controller;
    if (owner && !areAllied(owner, power)) {
      const enemies = unitsAt(
        state,
        cell,
        (x) => !areAllied(x.owner, power) && x.type !== "aaa" && x.type !== "factory",
      );
      if (!enemies.length) captureCell(state, cell, power);
    }
  }
}

function retreatUnits(state: GameState, cell: string, power: PowerId): boolean {
  const def = CELL_BY_ID[cell];
  const retreatTo = neighborsForMove(state, cell).find((id) => {
    if (isNeutral(id)) return false;
    if (def?.kind === "sea") return CELL_BY_ID[id]?.kind === "sea" && !isHostileish(state, id, power);
    return isFriendlyLand(state, id, power);
  });
  if (!retreatTo) return false;
  for (const u of unitsAt(state, cell, (x) => x.owner === power)) {
    u.cell = retreatTo;
    for (const cid of u.cargo) {
      const c = unitById(state, cid);
      if (c) c.cell = retreatTo;
    }
  }
  state.log.push({ t: "retreat", power, cell });
  return true;
}

function isHostileish(state: GameState, id: string, power: PowerId): boolean {
  return unitsAt(state, id, (u) => !areAllied(u.owner, power) && (u.type === "destroyer" || u.type === "cruiser" || u.type === "carrier" || u.type === "battleship")).length > 0;
}

function nextPower(state: GameState): void {
  const idx = TURN_ORDER.indexOf(state.activePower);
  if (idx === TURN_ORDER.length - 1) {
    const winner = checkVictory(state);
    if (winner) {
      state.winner = winner;
      state.done = true;
      state.log.push({ t: "victory", side: winner, reason: "standard victory cities after US turn" });
      return;
    }
    state.turn += 1;
    beginPowerTurn(state, TURN_ORDER[0]);
    return;
  }
  beginPowerTurn(state, TURN_ORDER[idx + 1]);
}

function advancePhase(state: GameState): void {
  const next = PHASE_AFTER[state.phase];
  if (next === "next_power") {
    nextPower(state);
    return;
  }
  state.phase = next;
  state.log.push({ t: "phase", power: state.activePower, phase: next, turn: state.turn });
  if (next === "combat") enterCombatPhase(state);
  if (next === "collect") {
    const { amount, bonus } = collectIncome(state, state.activePower);
    state.log.push({ t: "income", power: state.activePower, amount, bonus });
    state.income[state.activePower] = ipcHeld(state, state.activePower);
    advancePhase(state);
  }
}

function applyBuy(state: GameState, unit: (typeof UNIT_CATALOG)[keyof typeof UNIT_CATALOG]["id"]): void {
  const cost = UNIT_CATALOG[unit].cost;
  state.treasuries[state.activePower] -= cost;
  state.pending.push(unit);
  state.log.push({ t: "buy", power: state.activePower, unit, cost });
}

function applyMove(state: GameState, unitId: string, to: string): void {
  const u = unitById(state, unitId);
  if (!u) return;
  const from = u.cell;
  u.cell = to;
  u.moved += 1;
  if (state.phase === "combat_move") u.combatMoved = true;
  for (const cid of u.cargo) {
    const c = unitById(state, cid);
    if (c) c.cell = to;
  }
  state.log.push({
    t: "move",
    power: state.activePower,
    unit: u.type,
    from,
    to,
    combat: state.phase === "combat_move",
  });
}

function applyLoad(state: GameState, unitId: string, transportId: string): void {
  const u = unitById(state, unitId);
  const tr = unitById(state, transportId);
  if (!u || !tr) return;
  u.loadedOn = tr.id;
  u.cell = tr.cell;
  u.moved += 1;
  if (state.phase === "combat_move") u.combatMoved = true;
  tr.cargo.push(u.id);
  state.log.push({ t: "load", power: state.activePower, unit: u.type, transport: tr.id, from: u.cell });
}

function applyUnload(state: GameState, transportId: string, to: string): void {
  const tr = unitById(state, transportId);
  if (!tr) return;
  for (const cid of [...tr.cargo]) {
    const c = unitById(state, cid);
    if (!c) continue;
    c.loadedOn = null;
    c.cell = to;
    c.moved += 1;
    if (state.phase === "combat_move") c.combatMoved = true;
    state.log.push({ t: "unload", power: state.activePower, unit: c.type, transport: tr.id, to });
  }
  tr.cargo = [];
  tr.moved += 1;
  if (state.phase === "combat_move") tr.combatMoved = true;
}

function applyPlace(state: GameState, unit: (typeof UNIT_CATALOG)[keyof typeof UNIT_CATALOG]["id"], at: string): void {
  const idx = state.pending.indexOf(unit);
  if (idx < 0) return;
  state.pending.splice(idx, 1);
  if (unit === "factory") {
    state.cells[at].factory = true;
    state.log.push({ t: "note", text: `${state.activePower} placed factory in ${at}` });
    return;
  }
  spawnUnit(state, unit, state.activePower, at);
  state.log.push({ t: "note", text: `${state.activePower} placed ${unit} in ${at}` });
}

function applyFight(state: GameState, cell: string): void {
  const battle = state.battles.find((b) => b.cell === cell);
  if (!battle) return;
  const rng = attachRng(state);
  resolveBattle(state, battle, rng);
  commitRng(state, rng);
  const atk = attackersIn(state, battle).length;
  const def = defendersIn(state, battle).length;
  state.log.push({ t: "combat", cell, summary: `resolved ${battle.kind} battle atk=${atk} def=${def}` });
  finishBattle(state, cell);
}

function applyRetreat(state: GameState, cell: string): void {
  const battle = state.battles.find((b) => b.cell === cell);
  if (!battle) return;
  if (!retreatUnits(state, cell, state.activePower)) {
    applyFight(state, cell);
    return;
  }
  finishBattle(state, cell);
}

function applySubmerge(state: GameState, cell: string): void {
  const battle = state.battles.find((b) => b.cell === cell);
  if (!battle || battle.kind !== "sea") return;
  for (const u of unitsAt(
    state,
    cell,
    (x) => x.owner === state.activePower && x.type === "submarine" && !battle.submerged.includes(x.id),
  )) {
    battle.submerged.push(u.id);
  }
  state.log.push({ t: "note", text: `${state.activePower} submerged submarines in ${cell}` });
}

export function applyAction(state: GameState, action: Action): { ok: boolean; reason?: string } {
  if (state.done) return { ok: false, reason: "game over" };
  if (!isLegal(state, action)) return { ok: false, reason: "illegal action" };

  switch (action.type) {
    case "end_phase":
      if (state.phase === "combat") {
        for (const b of [...state.battles]) applyFight(state, b.cell);
      }
      if (state.phase === "place") {
        state.pending = [];
      }
      advancePhase(state);
      break;
    case "buy":
      applyBuy(state, action.unit);
      break;
    case "move":
      applyMove(state, action.unitId, action.to);
      break;
    case "load":
      applyLoad(state, action.unitId, action.transportId);
      break;
    case "unload":
      applyUnload(state, action.transportId, action.to);
      break;
    case "fight":
      applyFight(state, action.cell);
      if (!state.battles.length) advancePhase(state);
      break;
    case "retreat":
      applyRetreat(state, action.cell);
      if (!state.battles.length) advancePhase(state);
      break;
    case "submerge":
      applySubmerge(state, action.cell);
      {
        const sb = state.battles.find((b) => b.cell === action.cell);
        if (sb && !battleOpen(state, sb)) {
          state.battles = state.battles.filter((b) => b.cell !== action.cell);
        }
      }
      if (!state.battles.length) advancePhase(state);
      break;
    case "place":
      applyPlace(state, action.unit, action.at);
      if (!state.pending.length) advancePhase(state);
      break;
    default:
      return { ok: false, reason: "unknown action" };
  }
  return { ok: true };
}

export { adjacentIds, POWER_META, POWERS };
