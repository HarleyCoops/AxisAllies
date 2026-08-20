# AxisAllies

A **multi-agent / RL gym** for classic global WWII blockette-game mechanics, compressed onto a **12×12** board.

**Agents play. Humans watch.**

This is a fan-made tribute and an original implementation. It is **not** affiliated with, endorsed by, or licensed by Hasbro, Avalon Hill, or Wizards of the Coast. “Axis & Allies” is a trademark of its owner. This repository implements original code, an original schematic map, and original tokens. It does not ship official scans, box art, fonts, or logos.

The playable geography is a 12×12 schematic (same *size* as a 12×12 research canvas: coordinates 0–11), not a reproduction of any published board. Rules are a data-driven 1942 Second Edition hypothesis — see [DESIGN.md](DESIGN.md).

## What this is

Five powers (USSR → Germany → UK → Japan → USA) take turns through Purchase → Combat Move → Combat → Noncombat Move → Place Units → Collect Income. Each power is an isolated policy. The harness is the only thing that mutates state. Decisions must match the action schema **and** the current legal-action mask.

The spectator is a replay / live watcher of that 12×12 grid: stacks, phase, treasuries, battle log. It is not a purchase-sheet hot-seat client. Its board chrome is an original tribute to the 1942 Second Edition table look (parchment land, deep teal sea, period type, silhouette stacks). The gym is unchanged.

## Edition

Target mechanics: **Axis & Allies 1942 Second Edition** (public community / FAQ numbers). Unit costs, combat values, starting incomes, victory cities, canals, and neutrals live in `src/data/`. If a number is wrong, fix the table.

Starting incomes encoded here: USSR 24, Germany 41, UK 31, Japan 30, USA 42. Standard victory: Axis 9 / Allies 10 victory cities after the US turn.

## Requirements

- Node.js 20+

## How to run

```bash
npm install
npm test
npm run play -- --seed 1942 --rounds 6
npm run dev
```

- `npm test` — combat math, income, illegal-move rejection, gym API, a scripted mini-battle, a short 5-policy random game.
- `npm run play` — five `RandomLegalPolicy` agents play a game. Writes a turf-war-style artifact tree under `runs/run-<seed>/` (`metadata.json`, `state/`, `decisions/`, `prompts/`, `transcripts/`, `trajectory.jsonl`, `REPORT.md`, `spectator.json`) and copies a bundle to `public/latest-run.json`.
- `npm run dev` — spectator UI. Loads `latest-run.json` if present, otherwise plays a live random match in the browser.
- `npm run play -- --llm` — uses the `LlmPolicy` stub (prompt + schema). Live HTTP only if `AXISALLIES_API_KEY` is set; otherwise it dry-runs and falls back to random while still writing prompts.

Optional flags: `--seed N`, `--rounds N`, `--out dir`.

## Gym API

```ts
import { createEnv } from "./src/index.ts";

const env = createEnv();
let { state, observation } = env.reset(1942);
const legal = env.legal_actions(state, "ussr");
const { state: next, reward, done, info } = env.step(state, legal[0]);
```

`step` never applies an action that fails schema validation or the legal mask. Policies cannot touch the board directly.

Reward is a linear mix of IPC held, victory cities, capital control, and terminal win/loss (`src/gym/rewards.ts`) so a later RL policy can replace the LLM.

## Policies

| Policy | Role |
| --- | --- |
| `RandomLegalPolicy` | Uniform-ish pick from the legal mask. Default. No API keys. |
| `ScriptedSmokePolicy` | Replay a list of actions; used in tests. |
| `LlmPolicy` | Builds a rulebook + state + legal-mask prompt. Live calls optional. |

## What works / what's next

**Works**

- Data-driven 1942 2e unit / power / income / victory tables
- 12×12 schematic with named theatres, 13 victory cities, Panama & Suez, neutrals
- Compressed opening stacks (land mostly from public setup charts; navies flagged uncertain)
- Phase machine and legal-move mask (range, combat vs noncombat, amphibious load/unload, canals, no flying neutrals)
- Dice combat with opening fire, cheapest-casualty default, seeded RNG
- Gym `reset` / `legal_actions` / `step`
- Five isolated policies, artifact runs, spectator grid

**Next**

- Tighter air-landing and SBR
- Manual casualty / retreat policies
- Optional public messages between powers
- A real LLM or RL learner on this env
- Static-page deploy of the spectator

## IP / licensing

- Code in this repository is **MIT** (our work).
- Do not add official map scans, plastic-sculpt photos, Hasbro fonts, or TripleA XML/maps.
- TripleA may be used only as a rules memory jog, never as a file source.
- This project was **not** rebuilt from a turf-war engine and does not vendor infoxiao/turf-war. It reimplements a harness *protocol* (isolated agents, schema-valid actions, reducer-only mutation, artifacts, spectator) for a different environment.
