/**
 * 12×12 schematic world — same spatial size as the turf-war canvas
 * (WIDTH=12, HEIGHT=12, coordinates 0–11) but a different environment.
 *
 * Geography is compressed: named cells hold capitals, victory cities,
 * canals, and theatres. Unnamed cells are generic sea zones. The grid
 * wraps east–west (Pacific). North/south edges do not wrap.
 *
 * IPC totals on starting-controlled land are tuned to the published
 * 1942 2e starting incomes (FAQ: GER 41, UK 31; community: USSR 24,
 * JPN 30, USA 42). Individual territory values are compressed and
 * should be treated as correctable data, not gospel.
 */

import {
  STARTING_INCOME,
  type PowerId,
} from "./catalog.ts";

export const WIDTH = 12;
export const HEIGHT = 12;

export type CellKind = "land" | "sea" | "neutral";

export interface CellDef {
  id: string;
  name: string;
  short: string;
  x: number;
  y: number;
  kind: CellKind;
  ipc: number;
  originalOwner: PowerId | null;
  victoryCity: string | null;
  capital: PowerId | null;
  factory: boolean;
  /** Land that gates a canal. */
  canal: "panama" | "suez" | null;
}

interface NamedSpec {
  id: string;
  name: string;
  short: string;
  kind: CellKind;
  owner?: PowerId;
  ipc?: number;
  vc?: string;
  capital?: PowerId;
  factory?: boolean;
  canal?: "panama" | "suez";
}

/**
 * Sparse overlay on the 12×12 grid. `null` / missing → generic sea `sz_x_y`.
 * Row 0 is north. Column 0 is the central Pacific (wraps to column 11).
 */
const NAMED: Array<[number, number, NamedSpec]> = [
  // y=0 far north
  [1, 0, { id: "alaska", name: "Alaska", short: "Alsk", kind: "land", owner: "usa", ipc: 2 }],
  [2, 0, { id: "canada", name: "Canada", short: "Can", kind: "land", owner: "uk", ipc: 5 }],
  [4, 0, { id: "norway", name: "Norway", short: "Nor", kind: "land", owner: "germany", ipc: 3 }],
  [5, 0, { id: "finland", name: "Finland", short: "Fin", kind: "land", owner: "germany", ipc: 1 }],
  [6, 0, { id: "archangel", name: "Archangel", short: "Arch", kind: "land", owner: "ussr", ipc: 2 }],
  [7, 0, { id: "n_siberia", name: "North Siberia", short: "NSib", kind: "land", owner: "ussr", ipc: 2 }],
  [8, 0, { id: "mongolia", name: "Mongolia", short: "Mngl", kind: "neutral" }],
  [9, 0, { id: "far_east", name: "Soviet Far East", short: "SFE", kind: "land", owner: "ussr", ipc: 1 }],

  // y=1 capital / arctic belt
  [1, 1, { id: "wus", name: "Western United States", short: "WUS", kind: "land", owner: "usa", ipc: 10, vc: "San Francisco", factory: true }],
  [3, 1, { id: "uk", name: "United Kingdom", short: "UK", kind: "land", owner: "uk", ipc: 8, vc: "London", capital: "uk", factory: true }],
  [5, 1, { id: "karelia", name: "Karelia", short: "Kar", kind: "land", owner: "ussr", ipc: 3, vc: "Leningrad", factory: true }],
  [6, 1, { id: "wrussia", name: "West Russia", short: "WRus", kind: "land", owner: "germany", ipc: 2 }],
  [7, 1, { id: "moscow", name: "Moscow", short: "Mosc", kind: "land", owner: "ussr", ipc: 8, vc: "Moscow", capital: "ussr", factory: true }],
  [8, 1, { id: "yakut", name: "Yakutia", short: "Ykut", kind: "land", owner: "ussr", ipc: 2 }],
  [9, 1, { id: "manchuria", name: "Manchuria", short: "Mnch", kind: "land", owner: "japan", ipc: 3 }],
  [11, 1, { id: "japan", name: "Japan", short: "Jpn", kind: "land", owner: "japan", ipc: 8, vc: "Tokyo", capital: "japan", factory: true }],

  // y=2 mid-north
  [0, 2, { id: "hawaii", name: "Hawaiian Islands", short: "Haw", kind: "land", owner: "usa", ipc: 1, vc: "Honolulu" }],
  [2, 2, { id: "eus", name: "Eastern United States", short: "EUS", kind: "land", owner: "usa", ipc: 12, vc: "Washington", capital: "usa", factory: true }],
  [4, 2, { id: "france", name: "France", short: "Fra", kind: "land", owner: "germany", ipc: 8, vc: "Paris" }],
  [5, 2, { id: "germany", name: "Germany", short: "Ger", kind: "land", owner: "germany", ipc: 12, vc: "Berlin", capital: "germany", factory: true }],
  [6, 2, { id: "ukraine", name: "Ukraine", short: "Ukr", kind: "land", owner: "germany", ipc: 4 }],
  [7, 2, { id: "caucasus", name: "Caucasus", short: "Cauc", kind: "land", owner: "ussr", ipc: 6, factory: true }],
  [8, 2, { id: "china", name: "China", short: "Chn", kind: "land", owner: "usa", ipc: 10 }],
  [9, 2, { id: "shanghai", name: "Shanghai coast", short: "Shng", kind: "land", owner: "japan", ipc: 3, vc: "Shanghai" }],

  // y=3 mid
  [0, 3, { id: "midway", name: "Midway", short: "Mid", kind: "land", owner: "usa", ipc: 0 }],
  [1, 3, { id: "cus", name: "Central United States", short: "CUS", kind: "land", owner: "usa", ipc: 6 }],
  [5, 3, { id: "italy", name: "Italy", short: "Ita", kind: "land", owner: "germany", ipc: 4, vc: "Rome", factory: true }],
  [6, 3, { id: "eeurope", name: "Eastern Europe", short: "EEu", kind: "land", owner: "germany", ipc: 5 }],
  [7, 3, { id: "persia", name: "Persia", short: "Per", kind: "land", owner: "uk", ipc: 1 }],
  [8, 3, { id: "india", name: "India", short: "Ind", kind: "land", owner: "uk", ipc: 4, vc: "Calcutta", factory: true }],
  [9, 3, { id: "fic", name: "French Indochina", short: "FIC", kind: "land", owner: "japan", ipc: 2 }],
  [11, 3, { id: "philippines", name: "Philippines", short: "Phil", kind: "land", owner: "japan", ipc: 3, vc: "Manila" }],

  // y=4 canals / tropics
  [0, 4, { id: "wake", name: "Wake Island", short: "Wake", kind: "land", owner: "japan", ipc: 0 }],
  [1, 4, { id: "panama", name: "Panama", short: "Pan", kind: "land", owner: "usa", ipc: 1, canal: "panama" }],
  [4, 3, { id: "iberia", name: "Iberia", short: "Ibr", kind: "neutral" }],
  [6, 4, { id: "egypt", name: "Egypt", short: "Egy", kind: "land", owner: "uk", ipc: 2, canal: "suez" }],
  [7, 4, { id: "mideast", name: "Middle East", short: "ME", kind: "land", owner: "uk", ipc: 2, canal: "suez" }],
  [8, 4, { id: "burma", name: "Burma", short: "Brm", kind: "land", owner: "uk", ipc: 1 }],
  [9, 4, { id: "malaya", name: "Malaya", short: "Mal", kind: "land", owner: "japan", ipc: 3 }],
  [10, 4, { id: "carolines", name: "Caroline Islands", short: "Car", kind: "land", owner: "japan", ipc: 0 }],

  // y=5
  [1, 5, { id: "brazil", name: "Brazil", short: "Bra", kind: "neutral" }],
  [4, 5, { id: "wafrica", name: "West Africa", short: "WAf", kind: "land", owner: "uk", ipc: 1 }],
  [5, 5, { id: "libya", name: "Libya", short: "Lby", kind: "land", owner: "germany", ipc: 2 }],
  [6, 5, { id: "eafrica", name: "East Africa", short: "EAf", kind: "land", owner: "uk", ipc: 1 }],
  [8, 5, { id: "east_indies", name: "East Indies", short: "EI", kind: "land", owner: "japan", ipc: 4 }],
  [9, 5, { id: "borneo", name: "Borneo", short: "Brn", kind: "land", owner: "japan", ipc: 4 }],
  [10, 5, { id: "new_guinea", name: "New Guinea", short: "NG", kind: "land", owner: "japan", ipc: 0 }],

  // y=6 south
  [1, 6, { id: "argentina", name: "Argentina", short: "Arg", kind: "neutral" }],
  [4, 6, { id: "safrica", name: "South Africa", short: "SAf", kind: "land", owner: "uk", ipc: 2 }],
  [5, 6, { id: "sahara", name: "Sahara", short: "Sah", kind: "neutral" }],
  [8, 6, { id: "waus", name: "Western Australia", short: "WAus", kind: "land", owner: "uk", ipc: 1 }],
  [9, 6, { id: "eaus", name: "Eastern Australia", short: "EAus", kind: "land", owner: "uk", ipc: 3 }],
  [10, 6, { id: "solomons", name: "Solomon Islands", short: "Sol", kind: "land", owner: "japan", ipc: 0 }],
];

/** Extra 4-neighbour exceptions forced by 12×12 packing. */
export const EXTRA_ADJACENCY: Array<[string, string]> = [
  // FAQ-style continental joins that the grid would otherwise split.
  ["wus", "cus"],
  ["cus", "eus"],
  // North Africa land front (Libya/Egypt are diagonal on the grid).
  ["libya", "egypt"],
  // Arctic: Archangel touches the North Atlantic convoy sea.
  ["archangel", "sz_3_0"],
  // White Sea / Baltic compressed access for Karelia.
  ["karelia", "sz_4_1"],
];

/**
 * Canals: sea units may step between seaA and seaB only if every required
 * land cell has been friendly-controlled since the start of the turn.
 */
export const CANALS: Array<{
  id: "panama" | "suez";
  seaA: string;
  seaB: string;
  requires: string[];
}> = [
  { id: "panama", seaA: "sz_1_2", seaB: "sz_2_4", requires: ["panama"] },
  { id: "suez", seaA: "sz_5_4", seaB: "sz_7_5", requires: ["egypt", "mideast"] },
];

function seaName(x: number, y: number): { name: string; short: string } {
  const theatres: Record<string, [string, string]> = {
    "3,0": ["North Atlantic", "NAtl"],
    "2,1": ["NW Atlantic", "NWA"],
    "4,1": ["English Channel", "Chnl"],
    "10,1": ["Tsushima Sea", "Tsu"],
    "1,2": ["East Pacific", "EPac"],
    "3,2": ["Mid Atlantic", "MAtl"],
    "10,2": ["Home Islands Sea", "JpS"],
    "11,2": ["Central Pacific", "CPac"],
    "2,3": ["Caribbean", "Crb"],
    "3,3": ["South Atlantic N", "SAtN"],
    "4,3": ["West Med", "WMed"],
    "10,3": ["Philippine Sea", "PhS"],
    "2,4": ["Caribbean S", "CrbS"],
    "3,4": ["South Atlantic", "SAtl"],
    "4,4": ["East Med", "EMed"],
    "5,4": ["Central Med", "CMed"],
    "7,5": ["Indian Ocean", "IO"],
    "7,6": ["South Indian Ocean", "SIO"],
  };
  const hit = theatres[`${x},${y}`];
  if (hit) return { name: hit[0], short: hit[1] };
  return { name: `Sea ${x},${y}`, short: `S${x}${y}` };
}

function buildCells(): CellDef[] {
  const overlay = new Map<string, NamedSpec>();
  for (const [x, y, spec] of NAMED) overlay.set(`${x},${y}`, spec);

  const cells: CellDef[] = [];
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const spec = overlay.get(`${x},${y}`);
      if (spec) {
        cells.push({
          id: spec.id,
          name: spec.name,
          short: spec.short,
          x,
          y,
          kind: spec.kind,
          ipc: spec.ipc ?? 0,
          originalOwner: spec.owner ?? null,
          victoryCity: spec.vc ?? null,
          capital: spec.capital ?? null,
          factory: Boolean(spec.factory),
          canal: spec.canal ?? null,
        });
      } else {
        const label = seaName(x, y);
        cells.push({
          id: `sz_${x}_${y}`,
          name: label.name,
          short: label.short,
          x,
          y,
          kind: "sea",
          ipc: 0,
          originalOwner: null,
          victoryCity: null,
          capital: null,
          factory: false,
          canal: null,
        });
      }
    }
  }
  return cells;
}

export const CELLS: CellDef[] = buildCells();
export const CELL_BY_ID: Record<string, CellDef> = Object.fromEntries(CELLS.map((c) => [c.id, c]));
export const CELL_BY_XY: CellDef[][] = Array.from({ length: HEIGHT }, () => Array.from({ length: WIDTH }));
for (const c of CELLS) CELL_BY_XY[c.y][c.x] = c;

export function cellAt(x: number, y: number): CellDef {
  const xx = ((x % WIDTH) + WIDTH) % WIDTH;
  if (y < 0 || y >= HEIGHT) {
    throw new Error(`y out of range: ${y}`);
  }
  return CELL_BY_XY[y][xx];
}

export function wrapX(x: number): number {
  return ((x % WIDTH) + WIDTH) % WIDTH;
}

export function gridNeighbors(x: number, y: number): CellDef[] {
  const out: CellDef[] = [];
  out.push(cellAt(x - 1, y));
  out.push(cellAt(x + 1, y));
  if (y > 0) out.push(cellAt(x, y - 1));
  if (y < HEIGHT - 1) out.push(cellAt(x, y + 1));
  return out;
}

const EXTRA_SET = new Map<string, string[]>();
for (const [a, b] of EXTRA_ADJACENCY) {
  if (!EXTRA_SET.has(a)) EXTRA_SET.set(a, []);
  if (!EXTRA_SET.has(b)) EXTRA_SET.set(b, []);
  EXTRA_SET.get(a)!.push(b);
  EXTRA_SET.get(b)!.push(a);
}

export function adjacentIds(id: string): string[] {
  const cell = CELL_BY_ID[id];
  if (!cell) return [];
  const ids = new Set(gridNeighbors(cell.x, cell.y).map((c) => c.id));
  for (const extra of EXTRA_SET.get(id) ?? []) ids.add(extra);
  return [...ids];
}

export function landCells(): CellDef[] {
  return CELLS.filter((c) => c.kind === "land");
}

export function startingController(cell: CellDef): PowerId | null {
  return cell.kind === "land" ? cell.originalOwner : null;
}

export function sumStartingIncome(power: PowerId): number {
  return CELLS.filter((c) => c.kind === "land" && c.originalOwner === power).reduce((n, c) => n + c.ipc, 0);
}

export function assertIncomeTables(): void {
  for (const p of Object.keys(STARTING_INCOME) as PowerId[]) {
    const got = sumStartingIncome(p);
    const want = STARTING_INCOME[p];
    if (got !== want) {
      throw new Error(`Starting IPC for ${p} is ${got}, table says ${want}. Fix board.ts.`);
    }
  }
}

assertIncomeTables();
