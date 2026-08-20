export { WIDTH, HEIGHT, CELLS, CELL_BY_ID } from "./data/board.ts";
export {
  POWERS,
  TURN_ORDER,
  UNIT_CATALOG,
  POWER_META,
  STARTING_INCOME,
  VICTORY,
} from "./data/catalog.ts";
export { createInitialState } from "./engine/state.ts";
export { legalActions, isLegal } from "./engine/legal.ts";
export { applyAction } from "./engine/reducer.ts";
export { createEnv } from "./gym/env.ts";
export { ACTION_SCHEMA, validateAction } from "./gym/actions.ts";
export { observe, renderPrompt, RULEBOOK } from "./gym/observation.ts";
export type { GameState, Action } from "./engine/types.ts";
export type { Observation } from "./gym/observation.ts";
