/**
 * Data-driven 1942 Second Edition tables.
 *
 * Numbers are compiled from public community references and the publicly
 * posted 1942 2e preview/FAQ notes (unit costs, attack/defense/move).
 * If a later rules check disagrees, change this file — combat code reads
 * these tables and must not hard-code combat values.
 *
 * Uncertainty is flagged inline. Do not treat this as a verbatim rulebook.
 */

export const POWERS = ["ussr", "germany", "uk", "japan", "usa"] as const;
export type PowerId = (typeof POWERS)[number];

export const SIDES = ["allies", "axis"] as const;
export type Side = (typeof SIDES)[number];

export const TURN_ORDER: PowerId[] = ["ussr", "germany", "uk", "japan", "usa"];

export const POWER_META: Record<
  PowerId,
  { name: string; short: string; side: Side; color: string; token: string }
> = {
  ussr: { name: "Soviet Union", short: "USSR", side: "allies", color: "#8b1e2d", token: "R" },
  germany: { name: "Germany", short: "GER", side: "axis", color: "#5a5e66", token: "G" },
  uk: { name: "United Kingdom", short: "UK", side: "allies", color: "#c4a574", token: "K" },
  japan: { name: "Japan", short: "JPN", side: "axis", color: "#d17a22", token: "J" },
  usa: { name: "United States", short: "USA", side: "allies", color: "#3f6b4a", token: "U" },
};

export const UNIT_TYPES = [
  "infantry",
  "artillery",
  "tank",
  "aaa",
  "fighter",
  "bomber",
  "submarine",
  "transport",
  "destroyer",
  "cruiser",
  "carrier",
  "battleship",
  "factory",
] as const;
export type UnitType = (typeof UNIT_TYPES)[number];

export type Domain = "land" | "air" | "sea" | "structure";

export interface UnitStats {
  id: UnitType;
  name: string;
  symbol: string;
  cost: number;
  attack: number;
  defense: number;
  movement: number;
  domain: Domain;
  /** Battleship two-hit; encoded so combat is data-driven. */
  hitsToDestroy: number;
  specials: string[];
}

/**
 * 1942 2e unit catalog (public preview / community tables).
 * Artillery cost 4, attack 2, defense 2, move 1 — preview agrees.
 * AAA attack/defense are "—" (no general-combat value); air-defense is special.
 * Transport attack/defense 0; chosen last as a casualty.
 */
export const UNIT_CATALOG: Record<UnitType, UnitStats> = {
  infantry: {
    id: "infantry",
    name: "Infantry",
    symbol: "I",
    cost: 3,
    attack: 1,
    defense: 2,
    movement: 1,
    domain: "land",
    hitsToDestroy: 1,
    specials: ["artillery_support"],
  },
  artillery: {
    id: "artillery",
    name: "Artillery",
    symbol: "A",
    cost: 4,
    attack: 2,
    defense: 2,
    movement: 1,
    domain: "land",
    hitsToDestroy: 1,
    specials: ["supports_infantry"],
  },
  tank: {
    id: "tank",
    name: "Tank",
    symbol: "T",
    cost: 6,
    attack: 3,
    defense: 3,
    movement: 2,
    domain: "land",
    hitsToDestroy: 1,
    specials: ["blitz"],
  },
  aaa: {
    id: "aaa",
    name: "Antiaircraft",
    symbol: "Z",
    cost: 5,
    attack: 0,
    defense: 0,
    movement: 1,
    domain: "land",
    hitsToDestroy: 1,
    specials: ["air_defense", "no_general_combat"],
  },
  fighter: {
    id: "fighter",
    name: "Fighter",
    symbol: "F",
    cost: 10,
    attack: 3,
    defense: 4,
    movement: 4,
    domain: "air",
    hitsToDestroy: 1,
    specials: ["carrier_capable"],
  },
  bomber: {
    id: "bomber",
    name: "Bomber",
    symbol: "B",
    cost: 12,
    attack: 4,
    defense: 1,
    movement: 6,
    domain: "air",
    hitsToDestroy: 1,
    specials: ["strategic_bombing"],
  },
  submarine: {
    id: "submarine",
    name: "Submarine",
    symbol: "S",
    cost: 6,
    attack: 2,
    defense: 1,
    movement: 2,
    domain: "sea",
    hitsToDestroy: 1,
    specials: ["surprise_strike", "submersible", "cannot_hit_air", "does_not_block"],
  },
  transport: {
    id: "transport",
    name: "Transport",
    symbol: "P",
    cost: 7,
    attack: 0,
    defense: 0,
    movement: 2,
    domain: "sea",
    hitsToDestroy: 1,
    specials: ["no_combat_value", "carry_land", "chosen_last", "does_not_block"],
  },
  destroyer: {
    id: "destroyer",
    name: "Destroyer",
    symbol: "D",
    cost: 8,
    attack: 2,
    defense: 2,
    movement: 2,
    domain: "sea",
    hitsToDestroy: 1,
    specials: ["anti_sub"],
  },
  cruiser: {
    id: "cruiser",
    name: "Cruiser",
    symbol: "C",
    cost: 12,
    attack: 3,
    defense: 3,
    movement: 2,
    domain: "sea",
    hitsToDestroy: 1,
    specials: ["shore_bombardment"],
  },
  carrier: {
    id: "carrier",
    name: "Aircraft Carrier",
    symbol: "V",
    cost: 14,
    attack: 1,
    defense: 2,
    movement: 2,
    domain: "sea",
    hitsToDestroy: 1,
    specials: ["carry_fighters"],
  },
  battleship: {
    id: "battleship",
    name: "Battleship",
    symbol: "X",
    cost: 20,
    attack: 4,
    defense: 4,
    movement: 2,
    domain: "sea",
    hitsToDestroy: 2,
    specials: ["shore_bombardment", "two_hits"],
  },
  factory: {
    id: "factory",
    name: "Industrial Complex",
    symbol: "Fcy",
    cost: 15,
    attack: 0,
    defense: 0,
    movement: 0,
    domain: "structure",
    hitsToDestroy: 1,
    specials: ["cannot_move", "subject_to_capture"],
  },
};

/** Opening-fire tables (1942 2e community consensus; correct here if needed). */
export const COMBAT_TABLE = {
  aaaHitOn: 1,
  /** Each AAA unit may fire at up to this many attacking air units. */
  aaaShotsPerUnit: 3,
  artillerySupportsInfantryAttack: 2,
  subSurpriseRequiresNoDestroyer: true,
  airCannotHitSubWithoutDestroyer: true,
  transportCasualtyLast: true,
};

export const VICTORY = {
  /** Standard 1942 2e (FAQ errata): Axis 9 / Allies 10 after the US turn. */
  axisStandard: 9,
  alliesStandard: 10,
  total: 13,
  axisStart: 6,
  alliesStart: 7,
};

export const STARTING_INCOME: Record<PowerId, number> = {
  ussr: 24,
  germany: 41,
  uk: 31,
  japan: 30,
  usa: 42,
};

export function sideOf(power: PowerId): Side {
  return POWER_META[power].side;
}

export function areAllied(a: PowerId, b: PowerId): boolean {
  return sideOf(a) === sideOf(b);
}

export function isLandCombatant(type: UnitType): boolean {
  return type === "infantry" || type === "artillery" || type === "tank";
}

export function isSurfaceWarship(type: UnitType): boolean {
  return type === "destroyer" || type === "cruiser" || type === "carrier" || type === "battleship";
}

export function hasCombatValue(type: UnitType): boolean {
  const u = UNIT_CATALOG[type];
  return u.attack > 0 || u.defense > 0;
}
