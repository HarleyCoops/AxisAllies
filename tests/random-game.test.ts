import { describe, expect, it } from "vitest";
import { RandomLegalPolicy } from "../src/harness/policies.ts";
import { runGame } from "../src/harness/runner.ts";

describe("five-policy random game", () => {
  it("plays at least one full round with RandomLegalPolicy for every power", async () => {
    const result = await runGame({
      seed: 1942,
      maxTurns: 2,
      maxSteps: 2500,
      policies: {
        ussr: new RandomLegalPolicy(1),
        germany: new RandomLegalPolicy(2),
        uk: new RandomLegalPolicy(3),
        japan: new RandomLegalPolicy(4),
        usa: new RandomLegalPolicy(5),
      },
    });
    expect(result.steps).toBeGreaterThan(20);
    expect(result.state.turn).toBeGreaterThanOrEqual(2);
    expect(result.trajectory.some((s) => s.power === "ussr")).toBe(true);
    expect(result.trajectory.some((s) => s.power === "usa")).toBe(true);
    expect(result.trajectory.some((s) => s.phase === "combat_move")).toBe(true);
    expect(result.state.log.some((e) => e.t === "income")).toBe(true);
  }, 60_000);
});
