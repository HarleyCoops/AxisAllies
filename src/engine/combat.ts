import { adjacentIds, CELL_BY_ID } from "../data/board.ts";
import {
  COMBAT_TABLE,
  POWERS,
  UNIT_CATALOG,
  areAllied,
  isLandCombatant,
  type PowerId,
  type UnitType,
} from "../data/catalog.ts";
import { createRng, rollHits, type Rng } from "./rng.ts";
import { removeUnit, unitsAt } from "./state.ts";
import type { Battle, GameState, Unit } from "./types.ts";

export function attackersIn(state: GameState, battle: Battle): Unit[] {
  return unitsAt(
    state,
    battle.cell,
    (u) =>
      (u.owner === battle.attacker || battle.allies.includes(u.owner)) &&
      participates(u, battle.kind) &&
      !battle.submerged.includes(u.id),
  );
}

export function defendersIn(state: GameState, battle: Battle): Unit[] {
  return unitsAt(
    state,
    battle.cell,
    (u) =>
      u.owner !== battle.attacker &&
      !areAllied(u.owner, battle.attacker) &&
      participates(u, battle.kind) &&
      !battle.submerged.includes(u.id),
  );
}

function participates(u: Unit, kind: Battle["kind"]): boolean {
  const stats = UNIT_CATALOG[u.type];
  if (u.type === "factory" || u.type === "aaa") return false;
  if (kind === "sea") return stats.domain === "sea" || stats.domain === "air";
  return stats.domain === "land" || stats.domain === "air";
}

/** Default casualty hook: cheapest first; transports last; damaged BB first. */
export function casualtyOrder(units: Unit[]): Unit[] {
  return [...units].sort((a, b) => {
    const lastA = a.type === "transport" ? 1 : 0;
    const lastB = b.type === "transport" ? 1 : 0;
    if (lastA !== lastB) return lastA - lastB;
    const ca = UNIT_CATALOG[a.type].cost;
    const cb = UNIT_CATALOG[b.type].cost;
    if (ca !== cb) return ca - cb;
    return b.hits - a.hits;
  });
}

export function applyHits(state: GameState, units: Unit[], hits: number, cell: string): UnitType[] {
  const killed: UnitType[] = [];
  const order = casualtyOrder(units);
  let remaining = hits;
  for (const u of order) {
    if (remaining <= 0) break;
    const need = UNIT_CATALOG[u.type].hitsToDestroy - u.hits;
    if (need > 1 && remaining < need) {
      u.hits += remaining;
      remaining = 0;
      break;
    }
    remaining -= need;
    killed.push(u.type);
    state.log.push({ t: "casualty", cell, owner: u.owner, unit: u.type });
    removeUnit(state, u.id);
  }
  return killed;
}

function infantryAttackValue(attackers: Unit[]): Map<string, number> {
  const values = new Map<string, number>();
  const inf = attackers.filter((u) => u.type === "infantry");
  const art = attackers.filter((u) => u.type === "artillery").length;
  inf.forEach((u, i) => {
    values.set(u.id, i < art ? COMBAT_TABLE.artillerySupportsInfantryAttack : UNIT_CATALOG.infantry.attack);
  });
  return values;
}

function fireGroups(groups: Map<number, number>, rng: Rng): { hits: number; dice: number[] } {
  let hits = 0;
  const dice: number[] = [];
  for (const [target, count] of groups) {
    if (count <= 0 || target <= 0) continue;
    const r = rollHits(count, target, rng);
    hits += r.hits;
    dice.push(...r.dice);
  }
  return { hits, dice };
}

function countByTarget(units: Unit[], values: Map<string, number>, side: "attack" | "defense"): Map<number, number> {
  const g = new Map<number, number>();
  for (const u of units) {
    const target = side === "attack" ? (values.get(u.id) ?? UNIT_CATALOG[u.type].attack) : UNIT_CATALOG[u.type].defense;
    if (target <= 0) continue;
    g.set(target, (g.get(target) ?? 0) + 1);
  }
  return g;
}

function hasDestroyer(units: Unit[]): boolean {
  return units.some((u) => u.type === "destroyer");
}

function airUnits(units: Unit[]): Unit[] {
  return units.filter((u) => UNIT_CATALOG[u.type].domain === "air");
}

function subUnits(units: Unit[]): Unit[] {
  return units.filter((u) => u.type === "submarine");
}

function aaaShots(state: GameState, cell: string, attackingAir: number): number {
  const aaa = unitsAt(state, cell, (u) => u.type === "aaa");
  return Math.min(aaa.length * COMBAT_TABLE.aaaShotsPerUnit, attackingAir);
}

function bombardUnits(state: GameState, battle: Battle): Unit[] {
  if (battle.kind === "sea") return [];
  const out: Unit[] = [];
  for (const seaId of battle.bombardCells) {
    for (const u of unitsAt(state, seaId, (x) => x.owner === battle.attacker)) {
      if (u.type === "battleship" || u.type === "cruiser") out.push(u);
    }
  }
  return out;
}

export function resolveOpeningFire(state: GameState, battle: Battle, rng: Rng): void {
  const atk = attackersIn(state, battle);
  const def = defendersIn(state, battle);
  const air = airUnits(atk);

  if (battle.kind !== "sea" && air.length) {
    const shots = aaaShots(state, battle.cell, air.length);
    if (shots > 0) {
      const r = rollHits(shots, COMBAT_TABLE.aaaHitOn, rng);
      state.log.push({ t: "roll", cell: battle.cell, side: "opening", hits: r.hits, dice: r.dice });
      applyHits(state, air, r.hits, battle.cell);
    }
  }

  const atkNow = attackersIn(state, battle);
  const defNow = defendersIn(state, battle);

  if (battle.kind !== "land") {
    const atkSubs = subUnits(atkNow);
    const defSubs = subUnits(defNow);
    if (atkSubs.length && !hasDestroyer(defNow)) {
      const r = rollHits(atkSubs.length, UNIT_CATALOG.submarine.attack, rng);
      state.log.push({ t: "roll", cell: battle.cell, side: "opening", hits: r.hits, dice: r.dice });
      applyHits(
        state,
        defNow.filter((u) => UNIT_CATALOG[u.type].domain !== "air"),
        r.hits,
        battle.cell,
      );
    }
    const defAfter = defendersIn(state, battle);
    const atkAfter = attackersIn(state, battle);
    if (defSubs.length && !hasDestroyer(atkAfter)) {
      const r = rollHits(defSubs.length, UNIT_CATALOG.submarine.defense, rng);
      state.log.push({ t: "roll", cell: battle.cell, side: "opening", hits: r.hits, dice: r.dice });
      applyHits(
        state,
        atkAfter.filter((u) => UNIT_CATALOG[u.type].domain !== "air"),
        r.hits,
        battle.cell,
      );
    }
    void defAfter;
  }

  const ships = bombardUnits(state, battle);
  if (ships.length) {
    const groups = new Map<number, number>();
    for (const u of ships) {
      const t = UNIT_CATALOG[u.type].attack;
      groups.set(t, (groups.get(t) ?? 0) + 1);
    }
    const r = fireGroups(groups, rng);
    state.log.push({ t: "roll", cell: battle.cell, side: "opening", hits: r.hits, dice: r.dice });
    applyHits(state, defendersIn(state, battle), r.hits, battle.cell);
  }

  battle.opened = true;
}

export function resolveGeneralRound(state: GameState, battle: Battle, rng: Rng): void {
  const atk = attackersIn(state, battle);
  const def = defendersIn(state, battle);
  const defHasDestroyer = hasDestroyer(def);
  const atkHasDestroyer = hasDestroyer(atk);

  // Subs that already used surprise (no destroyer present) skip general fire that round.
  const skipAtkSub = battle.kind !== "land" && !defHasDestroyer && battle.opened;
  const skipDefSub = battle.kind !== "land" && !atkHasDestroyer && battle.opened;

  const atkRollers = atk.filter((u) => {
    if (u.type === "submarine" && skipAtkSub) return false;
    if (UNIT_CATALOG[u.type].attack <= 0 && u.type !== "infantry") return false;
    if (UNIT_CATALOG[u.type].domain === "air" && battle.kind === "sea") {
      const onlySubs = def.every((d) => d.type === "submarine" || d.type === "transport");
      if (onlySubs && !defHasDestroyer) return false;
    }
    return true;
  });

  const defRollers = def.filter((u) => {
    if (u.type === "submarine" && skipDefSub) return false;
    return UNIT_CATALOG[u.type].defense > 0 || u.type === "infantry";
  });

  const atkTargets = def.filter((u) => {
    if (u.type === "submarine" && !atkHasDestroyer) return atkRollers.some((a) => UNIT_CATALOG[a.type].domain !== "air");
    return true;
  });
  const defTargets = atk.filter((u) => {
    if (u.type === "submarine" && !defHasDestroyer) return defRollers.some((d) => UNIT_CATALOG[d.type].domain !== "air");
    return true;
  });

  const atkFire = fireGroups(countByTarget(atkRollers, infantryAttackValue(atkRollers), "attack"), rng);
  const defFire = fireGroups(countByTarget(defRollers, new Map(), "defense"), rng);
  state.log.push({ t: "roll", cell: battle.cell, side: "attacker", hits: atkFire.hits, dice: atkFire.dice });
  state.log.push({ t: "roll", cell: battle.cell, side: "defender", hits: defFire.hits, dice: defFire.dice });

  applyHits(state, atkTargets.length ? atkTargets : def, atkFire.hits, battle.cell);
  applyHits(state, defTargets.length ? defTargets : atk, defFire.hits, battle.cell);
}

export function battleOpen(state: GameState, battle: Battle): boolean {
  return attackersIn(state, battle).length > 0 && defendersIn(state, battle).length > 0;
}

export function resolveStrategicBombing(state: GameState, battle: Battle, rng: Rng): void {
  const cell = battle.cell;
  const bombers = attackersIn(state, battle);
  if (!bombers.length) return;

  // Defending AA fires first (hit on aaaHitOn, up to aaaShotsPerUnit per AA gun).
  const aaa = unitsAt(state, cell, (u) => u.type === "aaa");
  const shots = Math.min(aaa.length * COMBAT_TABLE.aaaShotsPerUnit, bombers.length);
  if (shots > 0) {
    const r = rollHits(shots, COMBAT_TABLE.aaaHitOn, rng);
    state.log.push({ t: "roll", cell, side: "opening", hits: r.hits, dice: r.dice });
    applyHits(state, bombers, r.hits, cell);
  }

  const survivors = attackersIn(state, battle);
  if (!survivors.length) {
    battle.opened = true;
    return;
  }

  // Each surviving bomber rolls one die; total damage, capped at the factory's value.
  const value = CELL_BY_ID[cell]?.ipc ?? 0;
  const current = state.cells[cell].factoryDamage;
  let damage = 0;
  for (let i = 0; i < survivors.length; i++) damage += rng.d6();
  damage = Math.min(damage, Math.max(0, value - current));
  if (damage > 0) state.cells[cell].factoryDamage = current + damage;
  state.log.push({
    t: "note",
    text: `strategic bombing ${cell}: ${damage} damage (factory ${state.cells[cell].factoryDamage}/${value})`,
  });
  battle.opened = true;
}

export function resolveBattle(
  state: GameState,
  battle: Battle,
  rng: Rng,
  opts: { retreatAfter?: number; maxRounds?: number } = {},
): void {
  if (battle.kind === "sbr") {
    resolveStrategicBombing(state, battle, rng);
    return;
  }
  const maxRounds = opts.maxRounds ?? 12;
  if (!battle.opened) resolveOpeningFire(state, battle, rng);
  let round = 0;
  while (battleOpen(state, battle) && round < maxRounds) {
    if (opts.retreatAfter !== undefined && round >= opts.retreatAfter) break;
    resolveGeneralRound(state, battle, rng);
    round++;
  }
  for (const u of [...attackersIn(state, battle), ...defendersIn(state, battle)]) u.hits = 0;
}

export function attachRng(state: GameState): Rng {
  return createRng(state.seed, state.rngState);
}

export function commitRng(state: GameState, rng: Rng): void {
  state.rngState = rng.state();
}

export function fillBombardment(state: GameState, battle: Battle): void {
  if (battle.kind === "sea") return;
  battle.bombardCells = adjacentIds(battle.cell).filter(
    (id) =>
      CELL_BY_ID[id]?.kind === "sea" &&
      unitsAt(state, id, (u) => u.owner === battle.attacker && (u.type === "battleship" || u.type === "cruiser")).length >
        0,
  );
}

function alliedAttackers(state: GameState, cell: string, power: PowerId): PowerId[] {
  return POWERS.filter(
    (p) => p !== power && areAllied(p, power) && unitsAt(state, cell, (x) => x.owner === p && x.type !== "factory").length > 0,
  );
}

export function detectBattles(state: GameState, power: PowerId): Battle[] {
  const battles: Battle[] = [];
  const seen = new Set<string>();
  for (const u of state.units) {
    if (u.owner !== power || u.loadedOn) continue;
    if (seen.has(u.cell)) continue;
    seen.add(u.cell);
    const def = CELL_BY_ID[u.cell];
    if (!def) continue;

    // Strategic bombing raid: the power's bombers alone in an enemy IC territory.
    const bombers = unitsAt(state, u.cell, (x) => x.owner === power && x.type === "bomber");
    const atkLand = unitsAt(state, u.cell, (x) => x.owner === power && isLandCombatant(x.type));
    const controller = state.cells[u.cell]?.controller;
    const hostileIc = def.kind === "land" && Boolean(controller && !areAllied(controller, power)) && def.factory;
    if (hostileIc && bombers.length && !atkLand.length) {
      battles.push({ cell: u.cell, kind: "sbr", attacker: power, opened: false, bombardCells: [], submerged: [], allies: [] });
      continue;
    }

    const enemies = unitsAt(
      state,
      u.cell,
      (x) => x.owner !== power && !areAllied(x.owner, power) && x.type !== "factory" && x.type !== "aaa",
    );
    if (!enemies.length) continue;
    const allies = alliedAttackers(state, u.cell, power);
    if (def.kind === "sea") {
      battles.push({ cell: u.cell, kind: "sea", attacker: power, opened: false, bombardCells: [], submerged: [], allies });
    } else {
      const battle: Battle = { cell: u.cell, kind: "land", attacker: power, opened: false, bombardCells: [], submerged: [], allies };
      fillBombardment(state, battle);
      if (battle.bombardCells.length) battle.kind = "amphibious";
      battles.push(battle);
    }
  }
  return battles;
}
