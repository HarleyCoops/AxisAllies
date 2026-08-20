import { describe, expect, it } from "vitest";
import { STARTING_INCOME } from "../src/data/catalog.ts";
import { collectIncome, ipcHeld } from "../src/engine/income.ts";
import { createInitialState } from "../src/engine/state.ts";
import { applyAction } from "../src/engine/reducer.ts";

describe("income on collect", () => {
  it("USSR opening income is 24", () => {
    const s = createInitialState(1);
    expect(ipcHeld(s, "ussr")).toBe(STARTING_INCOME.ussr);
    const before = s.treasuries.ussr;
    const { amount } = collectIncome(s, "ussr");
    expect(amount).toBe(24);
    expect(s.treasuries.ussr).toBe(before + 24);
  });

  it("a power with a lost capital collects nothing", () => {
    const s = createInitialState(1);
    s.cells.moscow.controller = "germany";
    const before = s.treasuries.ussr;
    const { amount } = collectIncome(s, "ussr");
    expect(amount).toBe(0);
    expect(s.treasuries.ussr).toBe(before);
  });

  it("completing a USSR turn via end_phase collects income", () => {
    const s = createInitialState(1);
    const start = s.treasuries.ussr;
    // purchase → combat move → combat → ncm → place → collect
    for (let i = 0; i < 8 && s.activePower === "ussr"; i++) {
      const r = applyAction(s, { type: "end_phase" });
      expect(r.ok).toBe(true);
    }
    expect(s.activePower).toBe("germany");
    expect(s.treasuries.ussr).toBe(start + 24);
    expect(s.log.some((e) => e.t === "income" && e.power === "ussr" && e.amount === 24)).toBe(true);
  });
});
