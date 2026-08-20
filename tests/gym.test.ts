import { describe, expect, it } from "vitest";
import { createEnv } from "../src/gym/env.ts";
import { validateAction } from "../src/gym/actions.ts";
import { ScriptedSmokePolicy } from "../src/harness/policies.ts";
import { runGame } from "../src/harness/runner.ts";

describe("gym API", () => {
  it("reset(seed) is deterministic", () => {
    const env = createEnv();
    const a = env.reset(9).state;
    const b = env.reset(9).state;
    expect(a.units.length).toBe(b.units.length);
    expect(a.treasuries).toEqual(b.treasuries);
    expect(a.activePower).toBe("ussr");
    expect(a.phase).toBe("purchase");
  });

  it("legal_actions + step end_phase advances the USSR into combat move", () => {
    const env = createEnv();
    const { state } = env.reset(1);
    const legal = env.legal_actions(state, "ussr");
    expect(legal.some((a) => a.type === "end_phase")).toBe(true);
    const next = env.step(state, { type: "end_phase" });
    expect(next.info.rejected).toBeUndefined();
    expect(next.state.phase).toBe("combat_move");
    expect(next.state.activePower).toBe("ussr");
  });

  it("rejects a schema-invalid payload without mutating state", () => {
    const env = createEnv();
    const { state } = env.reset(1);
    const next = env.step(state, { type: "paint", x: 3, y: 3 });
    expect(next.info.rejected).toBeTruthy();
    expect(next.state.phase).toBe("purchase");
    expect(next.state).toBe(state);
  });

  it("validateAction accepts only the published action schema", () => {
    expect(validateAction({ type: "end_phase" }).ok).toBe(true);
    expect(validateAction({ type: "buy", unit: "infantry" }).ok).toBe(true);
    expect(validateAction({ type: "yield" }).ok).toBe(false);
  });
});

describe("scripted smoke policy", () => {
  it("can walk the USSR through a purchase-only opening", async () => {
    const policy = new ScriptedSmokePolicy([
      { type: "buy", unit: "infantry" },
      { type: "end_phase" },
      { type: "end_phase" },
      { type: "end_phase" },
      { type: "end_phase" },
      { type: "end_phase" },
    ]);
    const result = await runGame({
      seed: 2,
      maxTurns: 1,
      maxSteps: 40,
      policies: {
        ussr: policy,
        germany: new ScriptedSmokePolicy([]),
        uk: new ScriptedSmokePolicy([]),
        japan: new ScriptedSmokePolicy([]),
        usa: new ScriptedSmokePolicy([]),
      },
    });
    expect(result.steps).toBeGreaterThan(5);
    expect(result.state.treasuries.ussr).toBeGreaterThanOrEqual(24 + 24 - 3);
  });
});
