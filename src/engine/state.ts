import { CELLS, CELL_BY_ID } from "../data/board.ts";
import {
  POWERS,
  STARTING_INCOME,
  type PowerId,
  type UnitType,
} from "../data/catalog.ts";
import { STARTING_STACKS } from "../data/setup.ts";
import { createRng } from "./rng.ts";
import type { CellState, GameState, Unit } from "./types.ts";

export function emptyTreasuries(): Record<PowerId, number> {
  return {
    ussr: STARTING_INCOME.ussr,
    germany: STARTING_INCOME.germany,
    uk: STARTING_INCOME.uk,
    japan: STARTING_INCOME.japan,
    usa: STARTING_INCOME.usa,
  };
}

export function createInitialState(seed = 1): GameState {
  const cells: Record<string, CellState> = {};
  for (const c of CELLS) {
    cells[c.id] = {
      id: c.id,
      controller: c.kind === "land" ? c.originalOwner : null,
      factory: c.factory,
      factoryDamage: 0,
    };
  }

  const units: Unit[] = [];
  let nextUnitId = 1;
  for (const stack of STARTING_STACKS) {
    if (!CELL_BY_ID[stack.cell]) {
      throw new Error(`Setup references missing cell ${stack.cell}`);
    }
    for (const [type, count] of Object.entries(stack.units) as [UnitType, number][]) {
      if (type === "factory") continue;
      for (let i = 0; i < (count ?? 0); i++) {
        units.push({
          id: `u${nextUnitId++}`,
          type,
          owner: stack.owner,
          cell: stack.cell,
          moved: 0,
          combatMoved: false,
          hits: 0,
          cargo: [],
          loadedOn: null,
        });
      }
    }
  }

  const ussrLand = CELLS.filter((c) => c.kind === "land" && cells[c.id].controller === "ussr").map(
    (c) => c.id,
  );

  const rng = createRng(seed);
  return {
    schema: "axisallies.state.v1",
    seed,
    rngState: rng.state(),
    nextUnitId,
    turn: 1,
    activePower: "ussr",
    phase: "purchase",
    treasuries: emptyTreasuries(),
    income: { ...STARTING_INCOME },
    cells,
    units,
    pending: [],
    capturedThisTurn: [],
    controlledAtTurnStart: ussrLand,
    canalOpen: { panama: true, suez: true },
    battles: [],
    log: [{ t: "phase", power: "ussr", phase: "purchase", turn: 1 }],
    winner: null,
    done: false,
    lastReward: { ussr: 0, germany: 0, uk: 0, japan: 0, usa: 0 },
  };
}

export function cloneState(state: GameState): GameState {
  return structuredClone(state);
}

export function unitsAt(state: GameState, cell: string, predicate?: (u: Unit) => boolean): Unit[] {
  return state.units.filter((u) => u.cell === cell && !u.loadedOn && (!predicate || predicate(u)));
}

export function unitById(state: GameState, id: string): Unit | undefined {
  return state.units.find((u) => u.id === id);
}

export function removeUnit(state: GameState, id: string): void {
  const u = unitById(state, id);
  if (!u) return;
  if (u.cargo.length) {
    for (const cid of u.cargo) {
      state.units = state.units.filter((x) => x.id !== cid);
    }
  }
  if (u.loadedOn) {
    const tr = unitById(state, u.loadedOn);
    if (tr) tr.cargo = tr.cargo.filter((c) => c !== id);
  }
  state.units = state.units.filter((x) => x.id !== id);
}

export function spawnUnit(state: GameState, type: UnitType, owner: PowerId, cell: string): Unit {
  const u: Unit = {
    id: `u${state.nextUnitId++}`,
    type,
    owner,
    cell,
    moved: 0,
    combatMoved: false,
    hits: 0,
    cargo: [],
    loadedOn: null,
  };
  state.units.push(u);
  return u;
}

export function resetTurnFlags(state: GameState): void {
  for (const u of state.units) {
    u.moved = 0;
    u.combatMoved = false;
    u.hits = 0;
  }
}

export function snapshot(state: GameState): GameState {
  return structuredClone(state);
}
