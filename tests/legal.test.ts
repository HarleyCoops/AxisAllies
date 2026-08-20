import { describe, expect, it } from "vitest";
import { createInitialState } from "../src/engine/state.ts";
import { applyAction } from "../src/engine/reducer.ts";
import { legalActions } from "../src/engine/legal.ts";

describe("illegal-move rejection", () => {
  it("rejects a move that is not in the legal mask", () => {
    const s = createInitialState(1);
    const r = applyAction(s, { type: "move", unitId: "nope", to: "berlin" });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/illegal/);
  });

  it("rejects buying a unit the treasury cannot afford after spending", () => {
    const s = createInitialState(1);
    s.treasuries.ussr = 2;
    const r = applyAction(s, { type: "buy", unit: "infantry" });
    expect(r.ok).toBe(false);
  });

  it("purchase legal mask includes end_phase and affordable units only", () => {
    const s = createInitialState(1);
    s.treasuries.ussr = 5;
    const legal = legalActions(s);
    expect(legal.some((a) => a.type === "end_phase")).toBe(true);
    expect(legal.some((a) => a.type === "buy" && a.unit === "infantry")).toBe(true);
    expect(legal.some((a) => a.type === "buy" && a.unit === "battleship")).toBe(false);
  });

  it("does not allow a land unit to walk into a sea zone", () => {
    const s = createInitialState(1);
    applyAction(s, { type: "end_phase" });
    expect(s.phase).toBe("combat_move");
    const inf = s.units.find((u) => u.owner === "ussr" && u.type === "infantry")!;
    const r = applyAction(s, { type: "move", unitId: inf.id, to: "sz_0_11" });
    expect(r.ok).toBe(false);
  });
});
