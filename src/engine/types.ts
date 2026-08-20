import type { PowerId, Side, UnitType } from "../data/catalog.ts";

export const PHASES = [
  "purchase",
  "combat_move",
  "combat",
  "noncombat_move",
  "place",
  "collect",
] as const;
export type Phase = (typeof PHASES)[number];

export interface Unit {
  id: string;
  type: UnitType;
  owner: PowerId;
  cell: string;
  /** Movement already spent this phase (0 = unmoved). */
  moved: number;
  /** True if the unit made a combat move this turn (blocks most NCM). */
  combatMoved: boolean;
  /** Battleship damage taken in the current battle (0 or 1). */
  hits: number;
  /** Land units loaded on this transport. */
  cargo: string[];
  /** Transport id if this land unit is aboard. */
  loadedOn: string | null;
  /** Carrier id if this fighter is aboard a carrier. */
  carrierId: string | null;
}

export interface CellState {
  id: string;
  controller: PowerId | null;
  factory: boolean;
  factoryDamage: number;
}

export interface Battle {
  cell: string;
  kind: "land" | "sea" | "amphibious" | "sbr";
  attacker: PowerId;
  /** Opening fire already resolved. */
  opened: boolean;
  bombardCells: string[];
  /** Submarine ids that submerged out of this battle. */
  submerged: string[];
  /** Allied powers whose units also attack in this battle. */
  allies: PowerId[];
}

export type LogEvent =
  | { t: "phase"; power: PowerId; phase: Phase; turn: number }
  | { t: "buy"; power: PowerId; unit: UnitType; cost: number }
  | { t: "move"; power: PowerId; unit: UnitType; from: string; to: string; combat: boolean }
  | { t: "load"; power: PowerId; unit: UnitType; transport: string; from: string }
  | { t: "unload"; power: PowerId; unit: UnitType; transport: string; to: string }
  | { t: "capture"; power: PowerId; cell: string; from: PowerId | null; liberatedTo?: PowerId }
  | { t: "combat"; cell: string; summary: string }
  | { t: "roll"; cell: string; side: "attacker" | "defender" | "opening"; hits: number; dice: number[] }
  | { t: "casualty"; cell: string; owner: PowerId; unit: UnitType }
  | { t: "retreat"; power: PowerId; cell: string }
  | { t: "income"; power: PowerId; amount: number; bonus: number }
  | { t: "victory"; side: Side; reason: string }
  | { t: "note"; text: string };

export interface GameState {
  schema: "axisallies.state.v1";
  seed: number;
  rngState: number;
  nextUnitId: number;
  turn: number;
  activePower: PowerId;
  phase: Phase;
  treasuries: Record<PowerId, number>;
  income: Record<PowerId, number>;
  cells: Record<string, CellState>;
  units: Unit[];
  pending: UnitType[];
  /** Cells the active power captured this turn (cannot build there). */
  capturedThisTurn: string[];
  /** Land cells the active power controlled at the start of its current turn. */
  controlledAtTurnStart: string[];
  /** Units placed at each factory cell this turn (production cap). */
  placedThisTurn: Record<string, number>;
  /** Canal passable for the active side at turn start. */
  canalOpen: Record<"panama" | "suez", boolean>;
  battles: Battle[];
  log: LogEvent[];
  winner: Side | null;
  done: boolean;
  lastReward: Record<PowerId, number>;
}

export type Action =
  | { type: "end_phase" }
  | { type: "buy"; unit: UnitType }
  | { type: "move"; unitId: string; to: string }
  | { type: "load"; unitId: string; transportId: string }
  | { type: "unload"; transportId: string; to: string }
  | { type: "fight"; cell: string }
  | { type: "retreat"; cell: string }
  | { type: "submerge"; cell: string }
  | { type: "place"; unit: UnitType; at: string };

export interface StepInfo {
  legalCount: number;
  rejected?: string;
  battle?: string;
}
