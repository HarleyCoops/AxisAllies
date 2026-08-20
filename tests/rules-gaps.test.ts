import { describe, expect, it } from "vitest";
import type { PowerId, UnitType } from "../src/data/catalog.ts";
import { attachRng, commitRng, detectBattles, resolveBattle } from "../src/engine/combat.ts";
import { ipcHeld } from "../src/engine/income.ts";
import { legalActions } from "../src/engine/legal.ts";
import { applyAction } from "../src/engine/reducer.ts";
import { createInitialState } from "../src/engine/state.ts";
import type { GameState } from "../src/engine/types.ts";

function addUnit(s: GameState, type: UnitType, owner: PowerId, cell: string, id = "t1"): void {
  s.units.push({ id, type, owner, cell, moved: 0, combatMoved: false, hits: 0, cargo: [], loadedOn: null });
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
    s.battles = [{ cell: "sz_3_0", kind: "sea", attacker: "germany", opened: false, bombardCells: [], submerged: [] }];
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
    s.battles = [{ cell: "sz_3_0", kind: "sea", attacker: "germany", opened: false, bombardCells: [], submerged: [] }];
    const acts = legalActions(s);
    expect(acts.some((a) => a.type === "submerge")).toBe(false);
  });
});
