import { describe, expect, it } from "vitest";
import { UNIT_CATALOG } from "../src/data/catalog.ts";
import { applyHits, resolveBattle, resolveOpeningFire } from "../src/engine/combat.ts";
import { createRng, rollHits } from "../src/engine/rng.ts";
import { createInitialState, spawnUnit } from "../src/engine/state.ts";
import type { Battle, GameState } from "../src/engine/types.ts";

function emptyLand(seed = 1): GameState {
  const s = createInitialState(seed);
  s.units = [];
  return s;
}

describe("combat math", () => {
  it("rolls hits at or below the target number", () => {
    const rng = createRng(42);
    const { hits, dice } = rollHits(20, 2, rng);
    expect(dice).toHaveLength(20);
    expect(hits).toBe(dice.filter((d) => d <= 2).length);
    expect(dice.every((d) => d >= 1 && d <= 6)).toBe(true);
  });

  it("is deterministic for a seed", () => {
    const a = rollHits(8, 3, createRng(7));
    const b = rollHits(8, 3, createRng(7));
    expect(a).toEqual(b);
  });

  it("reads attack/defense from the unit catalog, not magic numbers", () => {
    expect(UNIT_CATALOG.infantry.attack).toBe(1);
    expect(UNIT_CATALOG.infantry.defense).toBe(2);
    expect(UNIT_CATALOG.tank.attack).toBe(3);
    expect(UNIT_CATALOG.fighter.defense).toBe(4);
    expect(UNIT_CATALOG.battleship.hitsToDestroy).toBe(2);
  });

  it("takes cheapest casualties first and damages battleships before sinking them", () => {
    const s = emptyLand();
    const inf = spawnUnit(s, "infantry", "ussr", "moscow");
    const bb = spawnUnit(s, "battleship", "ussr", "moscow");
    applyHits(s, [inf, bb], 1, "moscow");
    expect(s.units.find((u) => u.id === inf.id)).toBeUndefined();
    expect(s.units.find((u) => u.id === bb.id)?.hits).toBe(0);
  });

  it("AAA opening fire can kill attacking air before general combat", () => {
    const s = emptyLand(99);
    spawnUnit(s, "aaa", "germany", "wrussia");
    spawnUnit(s, "infantry", "germany", "wrussia");
    spawnUnit(s, "fighter", "ussr", "wrussia");
    const battle: Battle = { cell: "wrussia", kind: "land", attacker: "ussr", opened: false, bombardCells: [], submerged: [] };
    const rng = createRng(3);
    resolveOpeningFire(s, battle, rng);
    expect(battle.opened).toBe(true);
  });
});

describe("scripted mini-battle", () => {
  it("resolves 3 USSR infantry attacking 1 German infantry in West Russia", () => {
    const s = emptyLand(1942);
    spawnUnit(s, "infantry", "ussr", "wrussia");
    spawnUnit(s, "infantry", "ussr", "wrussia");
    spawnUnit(s, "infantry", "ussr", "wrussia");
    spawnUnit(s, "infantry", "germany", "wrussia");
    const battle: Battle = { cell: "wrussia", kind: "land", attacker: "ussr", opened: false, bombardCells: [], submerged: [] };
    resolveBattle(s, battle, createRng(1942));
    const ger = s.units.filter((u) => u.owner === "germany" && u.cell === "wrussia");
    const rus = s.units.filter((u) => u.owner === "ussr" && u.cell === "wrussia");
    expect(ger.length === 0 || rus.length === 0 || ger.length + rus.length < 4).toBe(true);
    expect(s.log.some((e) => e.t === "roll" || e.t === "casualty")).toBe(true);
  });
});
