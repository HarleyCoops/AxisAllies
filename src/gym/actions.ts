import type { UnitType } from "../data/catalog.ts";
import type { Action } from "../engine/types.ts";

/** JSON Schema for harness-validated decisions. Agents may only emit one of these. */
export const ACTION_SCHEMA = {
  $id: "https://harleycoops.github.io/axisallies/schema/action.v1.json",
  title: "AxisAlliesAction",
  oneOf: [
    { type: "object", additionalProperties: false, required: ["type"], properties: { type: { const: "end_phase" } } },
    {
      type: "object",
      additionalProperties: false,
      required: ["type", "unit"],
      properties: {
        type: { const: "buy" },
        unit: { type: "string" },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["type", "unitId", "to"],
      properties: {
        type: { const: "move" },
        unitId: { type: "string" },
        to: { type: "string" },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["type", "unitId", "transportId"],
      properties: {
        type: { const: "load" },
        unitId: { type: "string" },
        transportId: { type: "string" },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["type", "transportId", "to"],
      properties: {
        type: { const: "unload" },
        transportId: { type: "string" },
        to: { type: "string" },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["type", "cell"],
      properties: {
        type: { const: "fight" },
        cell: { type: "string" },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["type", "cell"],
      properties: {
        type: { const: "retreat" },
        cell: { type: "string" },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["type", "unit", "at"],
      properties: {
        type: { const: "place" },
        unit: { type: "string" },
        at: { type: "string" },
      },
    },
  ],
} as const;

const TYPES = new Set(["end_phase", "buy", "move", "load", "unload", "fight", "retreat", "place"]);

export function validateAction(raw: unknown): { ok: true; action: Action } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "action must be an object" };
  const a = raw as Record<string, unknown>;
  if (typeof a.type !== "string" || !TYPES.has(a.type)) return { ok: false, error: `unknown type ${String(a.type)}` };
  const extra = Object.keys(a).filter((k) => k !== "type");
  switch (a.type) {
    case "end_phase":
      if (extra.length) return { ok: false, error: "end_phase takes no fields" };
      return { ok: true, action: { type: "end_phase" } };
    case "buy":
      if (typeof a.unit !== "string") return { ok: false, error: "buy.unit required" };
      return { ok: true, action: { type: "buy", unit: a.unit as UnitType } };
    case "move":
      if (typeof a.unitId !== "string" || typeof a.to !== "string") return { ok: false, error: "move needs unitId,to" };
      return { ok: true, action: { type: "move", unitId: a.unitId, to: a.to } };
    case "load":
      if (typeof a.unitId !== "string" || typeof a.transportId !== "string") {
        return { ok: false, error: "load needs unitId,transportId" };
      }
      return { ok: true, action: { type: "load", unitId: a.unitId, transportId: a.transportId } };
    case "unload":
      if (typeof a.transportId !== "string" || typeof a.to !== "string") {
        return { ok: false, error: "unload needs transportId,to" };
      }
      return { ok: true, action: { type: "unload", transportId: a.transportId, to: a.to } };
    case "fight":
      if (typeof a.cell !== "string") return { ok: false, error: "fight.cell required" };
      return { ok: true, action: { type: "fight", cell: a.cell } };
    case "retreat":
      if (typeof a.cell !== "string") return { ok: false, error: "retreat.cell required" };
      return { ok: true, action: { type: "retreat", cell: a.cell } };
    case "place":
      if (typeof a.unit !== "string" || typeof a.at !== "string") return { ok: false, error: "place needs unit,at" };
      return { ok: true, action: { type: "place", unit: a.unit as UnitType, at: a.at } };
    default:
      return { ok: false, error: "unhandled type" };
  }
}
