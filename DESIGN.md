# Design notes

This is a **multi-agent / RL gym**, not a human hot-seat client. Five isolated policies emit schema-valid actions. The harness is the only mutator. A spectator watches recorded or live-random trajectories.

## Edition hypothesis

Mechanics follow public descriptions of **Axis & Allies 1942 Second Edition** (Avalon Hill / Hasbro, 2009/2012): five powers, turn order USSR → Germany → UK → Japan → USA, IPC economy, 13 victory cities, land/sea/air units, industrial complexes, Panama and Suez canals, impassable neutrals.

Numbers live in `src/data/`. Combat code reads those tables. If a public rules reference disagrees with a figure, change the table.

Known published errata used here (FAQ, 2014):

- Standard victory: Axis 9 / Allies 10 after the US turn (Honolulu counts).
- Germany starting income 41, United Kingdom 31.

Community / preview figures used for the rest (USSR 24, Japan 30, USA 42, unit combat values). Flagged when a stack was compressed or a navy was placed by theatre rather than by numbered sea zone.

This file is **not** a copy of any publisher rulebook.

## 12×12 geography

The playable board is **WIDTH=12, HEIGHT=12**, coordinates 0–11, east–west wrap. That matches the spatial size of the turf-war canvas so later agent harnesses can share a coordinate space. It is **not** a 60-territory facsimile of the 1942 map.

Compression consequences (intentional):

- Several official territories are merged (e.g. Canada, Eastern Europe, China, NW Europe into France).
- IPC values are retuned so starting incomes still match the edition table.
- A few land-land contacts exist that the full board separates with sea (Japan is an island; the UK is an island; Hawaii sits in the Pacific column). Extra adjacencies and canal wormholes restore the load-bearing connections (WUS–CUS–EUS, Libya–Egypt, Panama, Suez, Archangel–North Atlantic).
- Opening sea stacks are **uncertain**: official cards name numbered sea zones this schematic does not have.

## Gym loop

```
reset(seed) → Observation (rulebook + state + legal mask)
policy.decide(frozen snapshot) → Action
validate schema → reject if not in schema
step(state, action) → only the reducer mutates → (state, reward, done, info)
```

Rewards are a linear combination of IPC held, victory cities for the side, capital control, and a terminal win/loss. Weights are in `src/gym/rewards.ts` so an RL policy can replace the LLM later.

## Combat

Opening fire (AAA vs air, sub surprise if no destroyer, BB/CA shore bombardment) then general rounds. Default casualties: cheapest first, transports last, damaged battleships before sunk. `applyHits` is the hook for a later manual-casualty policy.

Dice use a seeded mulberry32 stream stored on the state (`rngState`) so a seed plus action sequence is deterministic.

## Known gaps (v1)

- Strategic bombing is not a separate sequence; bombers fight in general combat.
- Air units are not forced to reserve landing movement during combat move.
- IC damage / placement caps from SBR are not modeled.
- Only the active power attacks (no multinational attack).
- Subs do not submerge after a round; they fight or die.
- Optional neutrals-can-be-attacked rule is off: neutrals are impassable.
- Carrier-fighter pairing is approximate (fighters in the same sea, 2 per carrier).
- Some merged land stacks and almost all navies are best-effort.

## Protocol (ideas, not a vendor)

Reimplemented, not copied from infoxiao/turf-war:

1. Isolated agent invocations — no hidden shared memory.
2. Schema-validated decisions only.
3. Harness-only state mutation (pure reducer).
4. Frozen snapshot while a power chooses.
5. Artifacts: `metadata`, `state/`, `decisions/`, `prompts/`, `transcripts/`, `trajectory.jsonl`, `REPORT.md`.
6. Watcher UI is a replay / live spectator of the 12×12 grid.

Diplomacy / public messages between powers are out of scope for this slice.

## Spectator chrome

The Vite spectator (`index.html`, `src/spectator/`) is an original visual tribute to a 1942 Second Edition table: felt app chrome, parchment continents with paper grain, deep / coastal teal sea, Special Elite map labels, Source Serif 4 UI, painted control rims, victory-city stars, and hand-drawn 12–16px unit silhouettes. It does not ship official scans, box art, logos, trademarked fonts, or traced plastic sculpts.

The gym is unchanged: `WIDTH=12` `HEIGHT=12`, `src/data/board.ts` geography, legal moves, combat, and rewards stay as specified in this file. Chrome-only files may be restyled; engine and data tables must not be forked for looks.
