/**
 * Compressed 1942 2e opening stacks on the 12×12 schematic.
 *
 * Land stacks are best-effort compressions of the public setup chart
 * (axisandallies.org community chart + preview notes). Multiple official
 * territories are merged into one cell; counts are summed where the
 * chart was readable and estimated where it was not.
 *
 * Sea stacks are MORE UNCERTAIN — official setup cards list numbered
 * sea zones this board does not have. Navy is placed in the schematic
 * sea cell that plays the same theatre role. Flagged below.
 */

import type { PowerId, UnitType } from "./catalog.ts";

export interface StackSpec {
  cell: string;
  owner: PowerId;
  units: Partial<Record<UnitType, number>>;
  /** True when the stack is a compressed estimate, not a direct chart row. */
  uncertain?: boolean;
  note?: string;
}

export const STARTING_STACKS: StackSpec[] = [
  // ——— USSR ———
  { cell: "moscow", owner: "ussr", units: { infantry: 4, artillery: 1, aaa: 1, tank: 2, fighter: 1 } },
  { cell: "karelia", owner: "ussr", units: { infantry: 4, artillery: 1, fighter: 1 } },
  { cell: "archangel", owner: "ussr", units: { infantry: 1, tank: 1 } },
  { cell: "caucasus", owner: "ussr", units: { infantry: 3, artillery: 1, aaa: 1, tank: 1 } },
  {
    cell: "n_siberia",
    owner: "ussr",
    units: { infantry: 4 },
    uncertain: true,
    note: "Novosibirsk + Evenki + Kazakh compressed.",
  },
  {
    cell: "yakut",
    owner: "ussr",
    units: { infantry: 3 },
    uncertain: true,
    note: "Yakut + Buryatia compressed.",
  },
  { cell: "far_east", owner: "ussr", units: { infantry: 2 } },
  {
    cell: "sz_3_0",
    owner: "ussr",
    units: { submarine: 1, transport: 1 },
    uncertain: true,
    note: "Arctic / White Sea fleet placed on the North Atlantic convoy cell.",
  },

  // ——— Germany ———
  {
    cell: "germany",
    owner: "germany",
    units: { infantry: 5, aaa: 1, tank: 2, fighter: 1, bomber: 1 },
    uncertain: true,
    note: "Home infantry count varies by chart transcription; 5 is the working figure.",
  },
  { cell: "france", owner: "germany", units: { infantry: 1, aaa: 1, tank: 2 } },
  {
    cell: "france",
    owner: "germany",
    units: { infantry: 1, tank: 1, fighter: 1 },
    uncertain: true,
    note: "Northwestern Europe stack folded into France.",
  },
  { cell: "norway", owner: "germany", units: { infantry: 2, fighter: 1 } },
  { cell: "finland", owner: "germany", units: { infantry: 3 } },
  { cell: "wrussia", owner: "germany", units: { infantry: 3, artillery: 1, tank: 1 } },
  { cell: "ukraine", owner: "germany", units: { infantry: 3, artillery: 1, tank: 1, fighter: 1 } },
  {
    cell: "eeurope",
    owner: "germany",
    units: { infantry: 6, tank: 2, fighter: 2 },
    uncertain: true,
    note: "Poland + Baltic States + Bulgaria-Romania + Belorussia compressed.",
  },
  {
    cell: "italy",
    owner: "germany",
    units: { infantry: 2, artillery: 1, aaa: 1, tank: 1 },
    uncertain: true,
    note: "Italy + Southern Europe compressed; IC stays on Italy.",
  },
  { cell: "libya", owner: "germany", units: { infantry: 1, tank: 1 } },
  {
    cell: "libya",
    owner: "germany",
    units: { infantry: 2, artillery: 1 },
    uncertain: true,
    note: "Morocco + Algeria folded into Libya.",
  },
  {
    cell: "sz_4_1",
    owner: "germany",
    units: { battleship: 1, cruiser: 1, submarine: 1, transport: 1 },
    uncertain: true,
    note: "Baltic fleet in the Channel cell (Baltic + North Sea compressed).",
  },
  {
    cell: "sz_5_4",
    owner: "germany",
    units: { cruiser: 1, destroyer: 1, submarine: 1, transport: 1 },
    uncertain: true,
    note: "Mediterranean / Italian fleet.",
  },

  // ——— United Kingdom ———
  { cell: "uk", owner: "uk", units: { infantry: 2, artillery: 1, aaa: 1, tank: 1, fighter: 2, bomber: 1 } },
  { cell: "canada", owner: "uk", units: { infantry: 1, tank: 1 }, uncertain: true, note: "E. Canada tank + W. Canada infantry." },
  { cell: "egypt", owner: "uk", units: { infantry: 1, artillery: 1, tank: 1, fighter: 1 } },
  { cell: "safrica", owner: "uk", units: { infantry: 1 } },
  { cell: "mideast", owner: "uk", units: { infantry: 1 } },
  { cell: "persia", owner: "uk", units: { infantry: 1 } },
  { cell: "india", owner: "uk", units: { infantry: 3, aaa: 1 } },
  { cell: "burma", owner: "uk", units: { infantry: 1 } },
  { cell: "waus", owner: "uk", units: { infantry: 1 } },
  { cell: "eaus", owner: "uk", units: { infantry: 2 }, uncertain: true, note: "E. Australia + New Zealand." },
  { cell: "wafrica", owner: "uk", units: { infantry: 1 } },
  { cell: "eafrica", owner: "uk", units: { infantry: 1 } },
  {
    cell: "sz_3_2",
    owner: "uk",
    units: { battleship: 1, cruiser: 1, destroyer: 1, transport: 1 },
    uncertain: true,
    note: "Home fleet in Mid-Atlantic.",
  },
  {
    cell: "sz_4_4",
    owner: "uk",
    units: { destroyer: 1, transport: 1 },
    uncertain: true,
    note: "Med / Suez covering force.",
  },
  {
    cell: "sz_7_5",
    owner: "uk",
    units: { destroyer: 1, transport: 1 },
    uncertain: true,
    note: "Indian Ocean squadron.",
  },

  // ——— Japan ———
  {
    cell: "japan",
    owner: "japan",
    units: { infantry: 4, artillery: 1, aaa: 1, tank: 1, fighter: 2, bomber: 1 },
    uncertain: true,
    note: "Home infantry count is a compression of the Japan card.",
  },
  {
    cell: "manchuria",
    owner: "japan",
    units: { infantry: 6, fighter: 1 },
    uncertain: true,
    note: "Manchuria + Kwangtung compressed.",
  },
  { cell: "shanghai", owner: "japan", units: { infantry: 4 }, uncertain: true, note: "Kiangsu / coastal China." },
  { cell: "fic", owner: "japan", units: { infantry: 2, artillery: 1, fighter: 1 } },
  { cell: "philippines", owner: "japan", units: { infantry: 1, artillery: 1 } },
  { cell: "malaya", owner: "japan", units: { infantry: 1 } },
  { cell: "east_indies", owner: "japan", units: { infantry: 2 } },
  { cell: "borneo", owner: "japan", units: { infantry: 1 } },
  { cell: "new_guinea", owner: "japan", units: { infantry: 1 } },
  { cell: "solomons", owner: "japan", units: { infantry: 1 } },
  { cell: "carolines", owner: "japan", units: { infantry: 1 } },
  { cell: "wake", owner: "japan", units: { infantry: 1 } },
  {
    cell: "sz_10_1",
    owner: "japan",
    units: { battleship: 1, carrier: 1, fighter: 2, cruiser: 1, destroyer: 1, transport: 1 },
    uncertain: true,
    note: "Combined Fleet at Tsushima / Home Islands sea. Carrier starts with 2 fighters in the same sea.",
  },
  {
    cell: "sz_10_3",
    owner: "japan",
    units: { battleship: 1, destroyer: 1, transport: 1 },
    uncertain: true,
    note: "Southern Expeditionary fleet (Philippine Sea).",
  },
  {
    cell: "sz_11_4",
    owner: "japan",
    units: { destroyer: 1, transport: 1 },
    uncertain: true,
    note: "Mandate / Carolines screen (sea east of the island cell).",
  },

  // ——— United States ———
  { cell: "eus", owner: "usa", units: { infantry: 2, artillery: 1, aaa: 1, tank: 1, fighter: 1, bomber: 1 } },
  { cell: "cus", owner: "usa", units: { infantry: 1 } },
  { cell: "wus", owner: "usa", units: { infantry: 2, aaa: 1, fighter: 1 } },
  { cell: "alaska", owner: "usa", units: { infantry: 1 } },
  { cell: "hawaii", owner: "usa", units: { infantry: 1, fighter: 1 } },
  { cell: "midway", owner: "usa", units: { infantry: 1 } },
  {
    cell: "china",
    owner: "usa",
    units: { infantry: 6, fighter: 1 },
    uncertain: true,
    note: "Yunnan + Szechwan + Anhwei compressed; Chinese units are US-controlled in 1942 2e.",
  },
  {
    cell: "sz_3_3",
    owner: "usa",
    units: { destroyer: 1, transport: 1 },
    uncertain: true,
    note: "Atlantic seaboard.",
  },
  {
    cell: "sz_1_2",
    owner: "usa",
    units: { battleship: 1, destroyer: 1, transport: 1 },
    uncertain: true,
    note: "Pacific Fleet compressed onto East Pacific (Pearl/West Coast).",
  },
];
