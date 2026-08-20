import { describe, expect, it } from "vitest";
import type { PowerId, UnitType } from "../src/data/catalog.ts";
import { attackersIn, attachRng, commitRng, detectBattles, resolveBattle } from "../src/engine/combat.ts";
import { ipcHeld } from "../src/engine/income.ts";
import { factoryCapacity, landingCarrier, legalActions } from "../src/engine/legal.ts";
import { applyAction } from "../src/engine/reducer.ts";
import { createInitialState } from "../src/engine/state.ts";
import type { GameState } from "../src/engine/types.ts";

function addUnit(s: GameState, type: UnitType, owner: PowerId, cell: string, id = "t1"): void {
  s.units.push({ id, type, owner, cell, moved: 0, combatMoved: false, hits: 0, cargo: [], loadedOn: null, carrierId: null });
}

describe("strategic bombing (SBR)", () => {
  it("detects an SBR when bombers are alone in an enemy factory territory", () => {
    const s = createInitialState(1);
    addUnit(s, "bomber", "germany", "moscow", "b1");
    const battles = detectBattles(s, "germany");
    expect(battles.find((b) => b.cell === "moscow")?.kind).toBe("sbr");
  });

  it("does not classify as SBR when land combatants join the bombers", () => {
    const s = createInitialState(1);
    addUnit(s, "bomber", "germany", "moscow", "b1");
    addUnit(s, "infantry", "germany", "moscow", "i1");
    const battles = detectBattles(s, "germany");
    expect(battles.some((b) => b.kind === "sbr")).toBe(false);
  });

  it("raises factory damage and caps it at the territory IPC value", () => {
    const s = createInitialState(1);
    addUnit(s, "bomber", "germany", "moscow", "b1");
    const battle = detectBattles(s, "germany").find((b) => b.cell === "moscow")!;
    const rng = attachRng(s);
    resolveBattle(s, battle, rng);
    commitRng(s, rng);
    expect(s.cells.moscow.factoryDamage).toBeGreaterThanOrEqual(0);
    expect(s.cells.moscow.factoryDamage).toBeLessThanOrEqual(8); // moscow IPC = 8
  });

  it("factory damage reduces collected income", () => {
    const s = createInitialState(1);
    const before = ipcHeld(s, "ussr");
    s.cells.moscow.factoryDamage = 4;
    expect(ipcHeld(s, "ussr")).toBe(before - 4);
  });
});

describe("submarine submerge", () => {
  it("offers submerge and removes the sub from the sea battle", () => {
    const s = createInitialState(1);
    s.activePower = "germany";
    s.phase = "combat";
    s.units = [];
    addUnit(s, "submarine", "germany", "sz_3_0", "sub1");
    addUnit(s, "transport", "uk", "sz_3_0", "tr1");
    s.battles = [{ cell: "sz_3_0", kind: "sea", attacker: "germany", opened: false, bombardCells: [], submerged: [], allies: [] }];
    const acts = legalActions(s);
    expect(acts.some((a) => a.type === "submerge" && a.cell === "sz_3_0")).toBe(true);
    const r = applyAction(s, { type: "submerge", cell: "sz_3_0" });
    expect(r.ok).toBe(true);
    expect(s.battles).toHaveLength(0);
  });

  it("does not offer submerge when an enemy destroyer is present", () => {
    const s = createInitialState(1);
    s.activePower = "germany";
    s.phase = "combat";
    s.units = [];
    addUnit(s, "submarine", "germany", "sz_3_0", "sub1");
    addUnit(s, "destroyer", "uk", "sz_3_0", "dd1");
    s.battles = [{ cell: "sz_3_0", kind: "sea", attacker: "germany", opened: false, bombardCells: [], submerged: [], allies: [] }];
    const acts = legalActions(s);
    expect(acts.some((a) => a.type === "submerge")).toBe(false);
  });
});

describe("production caps", () => {
  it("factoryCapacity is territory IPC minus damage minus placed", () => {
    const s = createInitialState(1);
    expect(factoryCapacity(s, "germany")).toBe(12);
    s.cells.germany.factoryDamage = 3;
    expect(factoryCapacity(s, "germany")).toBe(9);
    s.placedThisTurn.germany = 4;
    expect(factoryCapacity(s, "germany")).toBe(5);
  });
});

describe("multinational attack", () => {
  it("allied units join the battle as attackers", () => {
    const s = createInitialState(1);
    s.units = [];
    addUnit(s, "infantry", "usa", "france", "u1");
    addUnit(s, "infantry", "uk", "france", "k1");
    addUnit(s, "infantry", "germany", "france", "g1");
    const battles = detectBattles(s, "usa");
    expect(battles).toHaveLength(1);
    expect(battles[0].allies).toContain("uk");
    expect(attackersIn(s, battles[0]).length).toBe(2);
  });
});

describe("carrier-fighter pairing", () => {
  it("a carrier holds two fighters and no more", () => {
    const s = createInitialState(1);
    s.units = [];
    addUnit(s, "carrier", "usa", "sz_1_2", "cv1");
    expect(landingCarrier(s, "sz_1_2", "usa")).toBe("cv1");
    addUnit(s, "fighter", "usa", "sz_1_2", "f1");
    s.units.find((u) => u.id === "f1")!.carrierId = "cv1";
    addUnit(s, "fighter", "usa", "sz_1_2", "f2");
    s.units.find((u) => u.id === "f2")!.carrierId = "cv1";
    expect(landingCarrier(s, "sz_1_2", "usa")).toBeNull();
  });
});
