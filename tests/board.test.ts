import { describe, expect, it } from "vitest";
import { CELLS, HEIGHT, WIDTH, sumStartingIncome } from "../src/data/board.ts";
import { STARTING_INCOME, VICTORY } from "../src/data/catalog.ts";

describe("12×12 schematic board", () => {
  it("is exactly 12×12", () => {
    expect(WIDTH).toBe(12);
    expect(HEIGHT).toBe(12);
    expect(CELLS).toHaveLength(144);
    const keys = new Set(CELLS.map((c) => `${c.x},${c.y}`));
    expect(keys.size).toBe(144);
  });

  it("matches published starting incomes", () => {
    for (const [power, want] of Object.entries(STARTING_INCOME)) {
      expect(sumStartingIncome(power as keyof typeof STARTING_INCOME)).toBe(want);
    }
  });

  it("has thirteen victory cities with the FAQ opening split", () => {
    const vcs = CELLS.filter((c) => c.victoryCity);
    expect(vcs).toHaveLength(VICTORY.total);
    const axis = vcs.filter((c) => c.originalOwner === "germany" || c.originalOwner === "japan");
    const allies = vcs.filter((c) => c.originalOwner === "ussr" || c.originalOwner === "uk" || c.originalOwner === "usa");
    expect(axis).toHaveLength(VICTORY.axisStart);
    expect(allies).toHaveLength(VICTORY.alliesStart);
  });

  it("names the two canals", () => {
    expect(CELLS.some((c) => c.canal === "panama")).toBe(true);
    expect(CELLS.filter((c) => c.canal === "suez")).toHaveLength(2);
  });
});
