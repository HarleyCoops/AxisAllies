import { adjacentIds, CANALS, CELL_BY_ID } from "../data/board.ts";
import {
  UNIT_CATALOG,
  UNIT_TYPES,
  areAllied,
  isLandCombatant,
  isSurfaceWarship,
  type PowerId,
  type UnitType,
} from "../data/catalog.ts";
import { unitsAt } from "./state.ts";
import type { Action, GameState, Unit } from "./types.ts";

export function isNeutral(id: string): boolean {
  return CELL_BY_ID[id]?.kind === "neutral";
}

export function isHostileLand(state: GameState, id: string, power: PowerId): boolean {
  const def = CELL_BY_ID[id];
  if (!def || def.kind !== "land") return false;
  const owner = state.cells[id]?.controller;
  return Boolean(owner && !areAllied(owner, power));
}

export function isFriendlyLand(state: GameState, id: string, power: PowerId): boolean {
  const def = CELL_BY_ID[id];
  if (!def || def.kind !== "land") return false;
  const owner = state.cells[id]?.controller;
  return Boolean(owner && areAllied(owner, power));
}

export function isHostileSea(state: GameState, id: string, power: PowerId): boolean {
  if (CELL_BY_ID[id]?.kind !== "sea") return false;
  return unitsAt(state, id, (u) => !areAllied(u.owner, power) && isSurfaceWarship(u.type)).length > 0;
}

export function hasEnemyUnits(state: GameState, id: string, power: PowerId): boolean {
  return unitsAt(state, id, (u) => !areAllied(u.owner, power) && u.type !== "factory").length > 0;
}

export function canalBlocked(state: GameState, from: string, to: string): boolean {
  for (const canal of CANALS) {
    const pair = (canal.seaA === from && canal.seaB === to) || (canal.seaA === to && canal.seaB === from);
    if (pair) return !state.canalOpen[canal.id];
  }
  return false;
}

export function neighborsForMove(state: GameState, from: string): string[] {
  const ids = new Set(adjacentIds(from));
  for (const canal of CANALS) {
    if (canal.seaA === from) ids.add(canal.seaB);
    if (canal.seaB === from) ids.add(canal.seaA);
  }
  return [...ids];
}

function emptyHostile(state: GameState, id: string, power: PowerId): boolean {
  return isHostileLand(state, id, power) && !hasEnemyUnits(state, id, power);
}

/**
 * Graph search up to `range`. `canEnter` is checked before stepping in;
 * `mustStop` means the unit ends there (no further steps).
 */
export function reachable(
  state: GameState,
  start: string,
  range: number,
  canEnter: (id: string, dist: number) => boolean,
  mustStop: (id: string) => boolean,
): string[] {
  const found = new Set<string>();
  const seen = new Map<string, number>();
  const q: Array<{ id: string; d: number }> = [{ id: start, d: 0 }];
  seen.set(start, 0);
  while (q.length) {
    const { id, d } = q.shift()!;
    if (d === range) continue;
    for (const n of neighborsForMove(state, id)) {
      if (n === start) continue;
      if (!canEnter(n, d + 1)) continue;
      const prev = seen.get(n);
      if (prev !== undefined && prev <= d + 1) continue;
      if (canalBlocked(state, id, n)) continue;
      seen.set(n, d + 1);
      found.add(n);
      if (!mustStop(n)) q.push({ id: n, d: d + 1 });
    }
  }
  return [...found];
}

function landCombatEnter(state: GameState, power: PowerId, unit: Unit) {
  return (id: string) => {
    if (isNeutral(id)) return false;
    if (CELL_BY_ID[id]?.kind !== "land") return false;
    if (isFriendlyLand(state, id, power)) return true;
    if (isHostileLand(state, id, power)) return true;
    return false;
  };
}

function landCombatStop(state: GameState, power: PowerId, unit: Unit) {
  return (id: string) => {
    if (!isHostileLand(state, id, power)) return false;
    if (unit.type === "tank" && emptyHostile(state, id, power)) return false; // blitz
    return true;
  };
}

function landNcmEnter(state: GameState, power: PowerId) {
  return (id: string) => isFriendlyLand(state, id, power);
}

function seaEnter(state: GameState, power: PowerId, unit: Unit, combat: boolean) {
  return (id: string) => {
    if (CELL_BY_ID[id]?.kind !== "sea") return false;
    if (isHostileSea(state, id, power)) {
      if (unit.type === "submarine" && !unitsAt(state, id, (u) => !areAllied(u.owner, power) && u.type === "destroyer").length) {
        return true;
      }
      return combat;
    }
    return true;
  };
}

function seaStop(state: GameState, power: PowerId, unit: Unit) {
  return (id: string) => {
    if (unit.type === "submarine") {
      return unitsAt(state, id, (u) => !areAllied(u.owner, power) && u.type === "destroyer").length > 0;
    }
    return isHostileSea(state, id, power);
  };
}

function airEnter(id: string): boolean {
  return !isNeutral(id);
}

function transportCapacityOk(state: GameState, transport: Unit, incoming: Unit): boolean {
  const cargo = transport.cargo.map((id) => state.units.find((u) => u.id === id)).filter(Boolean) as Unit[];
  if (cargo.length >= 2) return false;
  if (cargo.length === 1) {
    const a = cargo[0];
    return a.type === "infantry" || incoming.type === "infantry";
  }
  return isLandCombatant(incoming.type) || incoming.type === "aaa";
}

function carrierHasRoom(state: GameState, sea: string, power: PowerId): boolean {
  const carriers = unitsAt(state, sea, (u) => u.owner === power && u.type === "carrier");
  if (!carriers.length) return false;
  const fighters = unitsAt(state, sea, (u) => areAllied(u.owner, power) && u.type === "fighter").length;
  return fighters < carriers.length * 2;
}

export function destinationsFor(state: GameState, unit: Unit): string[] {
  const power = state.activePower;
  if (unit.owner !== power) return [];
  if (unit.loadedOn) return [];
  const stats = UNIT_CATALOG[unit.type];
  if (stats.movement <= 0) return [];
  const combat = state.phase === "combat_move";
  const ncm = state.phase === "noncombat_move";
  if (!combat && !ncm) return [];
  if (ncm && unit.combatMoved && stats.domain !== "air") return [];
  if (unit.moved > 0) return [];

  const range = stats.movement;
  if (stats.domain === "land") {
    const raw = combat
      ? reachable(state, unit.cell, range, landCombatEnter(state, power, unit), landCombatStop(state, power, unit))
      : reachable(state, unit.cell, range, landNcmEnter(state, power), () => false);
    return combat ? raw.filter((id) => isHostileLand(state, id, power)) : raw.filter((id) => id !== unit.cell);
  }
  if (stats.domain === "sea") {
    const raw = reachable(
      state,
      unit.cell,
      range,
      seaEnter(state, power, unit, combat),
      combat ? seaStop(state, power, unit) : (id) => isHostileSea(state, id, power),
    );
    if (!combat) return raw.filter((id) => !isHostileSea(state, id, power));
    return raw.filter((id) => {
      if (isHostileSea(state, id, power) || hasEnemyUnits(state, id, power)) return true;
      // Amphibious staging: sea next to hostile land.
      return neighborsForMove(state, id).some((n) => isHostileLand(state, n, power));
    });
  }
  // air — reserve one movement so the unit can land on a friendly territory/carrier.
  const airRange = combat ? Math.max(0, stats.movement - 1) : stats.movement;
  const raw = reachable(state, unit.cell, airRange, airEnter, () => false);
  if (combat) {
    return raw.filter((id) => isHostileLand(state, id, power) || (CELL_BY_ID[id]?.kind === "sea" && hasEnemyUnits(state, id, power)));
  }
  return raw.filter((id) => {
    if (isFriendlyLand(state, id, power)) return true;
    if (CELL_BY_ID[id]?.kind === "sea" && carrierHasRoom(state, id, power)) return true;
    return false;
  });
}

export function loadActions(state: GameState): Action[] {
  const power = state.activePower;
  const actions: Action[] = [];
  for (const land of state.units) {
    if (land.owner !== power || land.loadedOn || land.moved > 0) continue;
    if (!isLandCombatant(land.type) && land.type !== "aaa") continue;
    if (state.phase === "noncombat_move" && land.combatMoved) continue;
    for (const sea of neighborsForMove(state, land.cell)) {
      if (CELL_BY_ID[sea]?.kind !== "sea") continue;
      if (isHostileSea(state, sea, power)) continue;
      for (const tr of unitsAt(state, sea, (u) => u.owner === power && u.type === "transport")) {
        if (!transportCapacityOk(state, tr, land)) continue;
        actions.push({ type: "load", unitId: land.id, transportId: tr.id });
      }
    }
  }
  return actions;
}

export function unloadActions(state: GameState): Action[] {
  const power = state.activePower;
  const actions: Action[] = [];
  const combat = state.phase === "combat_move";
  for (const tr of state.units) {
    if (tr.owner !== power || tr.type !== "transport" || !tr.cargo.length) continue;
    if (tr.moved > 0 && combat) {
      // transport may still unload after moving (amphibious).
    }
    for (const land of neighborsForMove(state, tr.cell)) {
      if (CELL_BY_ID[land]?.kind !== "land") continue;
      if (isNeutral(land)) continue;
      if (combat && !isHostileLand(state, land, power)) continue;
      if (!combat && !isFriendlyLand(state, land, power)) continue;
      actions.push({ type: "unload", transportId: tr.id, to: land });
    }
  }
  return actions;
}

function eligibleFactories(state: GameState): string[] {
  return state.controlledAtTurnStart.filter((id) => state.cells[id]?.factory && state.cells[id]?.controller === state.activePower);
}

export function placeActions(state: GameState): Action[] {
  const types = [...new Set(state.pending)];
  const actions: Action[] = [];
  const factories = eligibleFactories(state);
  for (const unit of types) {
    const domain = UNIT_CATALOG[unit].domain;
    if (unit === "factory") {
      for (const id of state.controlledAtTurnStart) {
        const def = CELL_BY_ID[id];
        if (def?.kind === "land" && !state.cells[id].factory) {
          actions.push({ type: "place", unit, at: id });
        }
      }
      continue;
    }
    for (const f of factories) {
      if (domain === "sea") {
        for (const sea of neighborsForMove(state, f)) {
          if (CELL_BY_ID[sea]?.kind === "sea") actions.push({ type: "place", unit, at: sea });
        }
      } else {
        actions.push({ type: "place", unit, at: f });
      }
    }
  }
  return actions;
}

export function legalActions(state: GameState): Action[] {
  if (state.done) return [];
  const power = state.activePower;
  switch (state.phase) {
    case "purchase": {
      const acts: Action[] = [{ type: "end_phase" }];
      for (const unit of UNIT_TYPES) {
        if (UNIT_CATALOG[unit].cost <= state.treasuries[power]) {
          acts.push({ type: "buy", unit });
        }
      }
      return acts;
    }
    case "combat_move":
    case "noncombat_move": {
      const acts: Action[] = [{ type: "end_phase" }];
      for (const u of state.units) {
        if (u.owner !== power) continue;
        for (const to of destinationsFor(state, u)) {
          acts.push({ type: "move", unitId: u.id, to });
        }
      }
      acts.push(...loadActions(state), ...unloadActions(state));
      return acts;
    }
    case "combat": {
      const acts: Action[] = [];
      for (const b of state.battles) {
        acts.push({ type: "fight", cell: b.cell });
        acts.push({ type: "retreat", cell: b.cell });
        if (b.kind === "sea") {
          const hasSub = unitsAt(
            state,
            b.cell,
            (u) => u.owner === power && u.type === "submarine" && !b.submerged.includes(u.id),
          ).length > 0;
          const enemyDestroyer = unitsAt(state, b.cell, (u) => !areAllied(u.owner, power) && u.type === "destroyer").length > 0;
          if (hasSub && !enemyDestroyer) acts.push({ type: "submerge", cell: b.cell });
        }
      }
      if (!acts.length) acts.push({ type: "end_phase" });
      return acts;
    }
    case "place": {
      const acts = placeActions(state);
      acts.push({ type: "end_phase" });
      return acts;
    }
    case "collect":
      return [{ type: "end_phase" }];
    default:
      return [{ type: "end_phase" }];
  }
}

export function actionKey(a: Action): string {
  return JSON.stringify(a);
}

export function isLegal(state: GameState, action: Action): boolean {
  return legalActions(state).some((x) => actionKey(x) === actionKey(action));
}
