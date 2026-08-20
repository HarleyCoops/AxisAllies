import { adjacentIds, CELL_BY_ID, CELLS, HEIGHT, WIDTH, type CellDef } from "../data/board.ts";
import { POWER_META, POWERS, type PowerId } from "../data/catalog.ts";
import type { GameState } from "../engine/types.ts";
import { createEnv } from "../gym/env.ts";
import { observe } from "../gym/observation.ts";
import { compactFrame } from "../engine/view.ts";
import { RandomLegalPolicy } from "../harness/policies.ts";
import { factoryGlyph, stackGlyph } from "./tokens.ts";

const COASTAL_SEA = new Set<string>();
for (const cell of CELLS) {
  if (cell.kind !== "sea") continue;
  if (adjacentIds(cell.id).some((id) => CELL_BY_ID[id]?.kind !== "sea")) {
    COASTAL_SEA.add(cell.id);
  }
}

function isNamedTheatre(def: CellDef): boolean {
  return def.kind === "sea" && !def.name.startsWith("Sea ");
}

function cellClassName(def: CellDef, ctrl: string | null | undefined): string {
  const parts = ["cell", def.kind];
  if (ctrl) parts.push(ctrl);
  if (def.canal) parts.push("canal");
  if (def.capital) parts.push("capital");
  if (def.victoryCity) parts.push("victory");
  if (def.factory) parts.push("has-factory");
  if (def.kind === "sea" && COASTAL_SEA.has(def.id)) parts.push("coast");
  if (isNamedTheatre(def)) parts.push("theatre");
  return parts.join(" ");
}

interface Frame {
  turn: number;
  activePower: PowerId;
  phase: string;
  treasuries: GameState["treasuries"];
  income: GameState["income"];
  winner: string | null;
  controllers?: Record<string, string | null>;
  cells?: GameState["cells"];
  stacks?: Array<{ cell: string; owner: string; type: string; n: number }>;
  units?: GameState["units"];
  log: GameState["log"];
}

interface Bundle {
  schema?: string;
  frames?: Frame[];
  steps?: Array<{ i: number; action: unknown; power: PowerId; phase: string }>;
}

const boardEl = document.querySelector("#board") as HTMLDivElement;
const statusEl = document.querySelector("#status") as HTMLElement;
const powersEl = document.querySelector("#powers") as HTMLElement;
const logEl = document.querySelector("#log") as HTMLOListElement;
const actionEl = document.querySelector("#action") as HTMLElement;

let frames: Frame[] = [];
let steps: Bundle["steps"] = [];
let cursor = 0;
let playing = false;
let timer = 0;

function slim(state: GameState): Frame {
  return compactFrame(state) as Frame;
}

function render(frame: Frame, action?: unknown): void {
  boardEl.innerHTML = "";
  boardEl.style.gridTemplateColumns = `repeat(${WIDTH}, minmax(64px, 1fr))`;
  boardEl.style.gridTemplateRows = `repeat(${HEIGHT}, minmax(64px, 1fr))`;

  const stacks = new Map<string, Map<string, Map<string, number>>>();
  if (frame.stacks) {
    for (const row of frame.stacks) {
      if (!stacks.has(row.cell)) stacks.set(row.cell, new Map());
      const byOwner = stacks.get(row.cell)!;
      if (!byOwner.has(row.owner)) byOwner.set(row.owner, new Map());
      byOwner.get(row.owner)!.set(row.type, row.n);
    }
  } else {
    for (const u of frame.units ?? []) {
      if (u.loadedOn) continue;
      if (!stacks.has(u.cell)) stacks.set(u.cell, new Map());
      const byOwner = stacks.get(u.cell)!;
      if (!byOwner.has(u.owner)) byOwner.set(u.owner, new Map());
      const byType = byOwner.get(u.owner)!;
      byType.set(u.type, (byType.get(u.type) ?? 0) + 1);
    }
  }

  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const def = CELLS.find((c) => c.x === x && c.y === y)!;
      const ctrl = frame.controllers?.[def.id] ?? frame.cells?.[def.id]?.controller;
      const el = document.createElement("div");
      el.className = cellClassName(def, ctrl);
      const marks: string[] = [];
      if (def.victoryCity) {
        marks.push(`<div class="vc"><span class="star" aria-hidden="true">★</span>${def.victoryCity}</div>`);
      }
      if (def.factory) {
        marks.push(`<span class="factory-mark" title="Industrial complex">${factoryGlyph()}</span>`);
      }
      const ipc = def.kind === "land" ? `<span class="ipc">${def.ipc}</span>` : "";
      let chips = "";
      const here = def.kind === "neutral" ? undefined : stacks.get(def.id);
      if (here) {
        chips = `<div class="stacks">${[...here.entries()]
          .map(([owner, types]) =>
            [...types.entries()]
              .map(
                ([t, n]) =>
                  `<span class="stack ${owner}" title="${owner} ${t}">${n}${stackGlyph(t)}</span>`,
              )
              .join(""),
          )
          .join("")}</div>`;
      }
      el.innerHTML = `<div class="name">${def.short}</div><div class="marks">${marks.join("")}</div>${ipc}${chips}`;
      boardEl.appendChild(el);
    }
  }

  const meta = POWER_META[frame.activePower];
  statusEl.textContent = frame.winner
    ? `Game over — ${frame.winner} win. Turn ${frame.turn}.`
    : `Turn ${frame.turn} · ${meta.name} · ${frame.phase} · frame ${cursor + 1}/${frames.length}`;

  powersEl.innerHTML = POWERS.map((p) => {
    const m = POWER_META[p];
    return `<div class="power-row ${p}" title="${m.name}"><span class="tick" aria-hidden="true"></span><span class="short">${m.short}</span><span class="tally">${frame.treasuries[p]} IPC · inc ${frame.income[p]}</span></div>`;
  }).join("");

  logEl.innerHTML = "";
  for (const ev of frame.log.slice(-12)) {
    const li = document.createElement("li");
    li.textContent = JSON.stringify(ev);
    logEl.appendChild(li);
  }
  actionEl.textContent = action ? JSON.stringify(action, null, 2) : "—";
}

function show(i: number): void {
  cursor = Math.max(0, Math.min(i, frames.length - 1));
  render(frames[cursor], steps?.[cursor - 1]?.action);
}

function tick(): void {
  if (!playing) return;
  if (cursor >= frames.length - 1) {
    playing = false;
    return;
  }
  show(cursor + 1);
  const speed = Number((document.querySelector("#speed") as HTMLInputElement).value);
  timer = window.setTimeout(tick, Math.max(40, 900 / speed));
}

async function liveRandom(): Promise<void> {
  const seed = 1942;
  const env = createEnv();
  let { state } = env.reset(seed);
  const policies = {
    ussr: new RandomLegalPolicy(seed + 11),
    germany: new RandomLegalPolicy(seed + 22),
    uk: new RandomLegalPolicy(seed + 33),
    japan: new RandomLegalPolicy(seed + 44),
    usa: new RandomLegalPolicy(seed + 55),
  };
  frames = [slim(state)];
  steps = [];
  const maxSteps = 800;
  for (let i = 0; i < maxSteps && !state.done && state.turn <= 4; i++) {
    const obs = observe(state);
    const decision = await policies[state.activePower].decide(obs);
    const result = env.step(state, decision.action);
    if (result.info.rejected) {
      const end = obs.legal.find((a) => a.type === "end_phase") ?? obs.legal[0];
      if (!end) break;
      state = env.step(state, end).state;
    } else {
      state = result.state;
    }
    frames.push(slim(state));
    steps.push({ i, action: decision.action, power: obs.you, phase: obs.phase });
  }
  cursor = 0;
  playing = true;
  show(0);
  tick();
}

function loadBundle(bundle: Bundle): void {
  frames = bundle.frames ?? [];
  steps = bundle.steps ?? [];
  playing = true;
  show(0);
  tick();
}

document.querySelector("#live")?.addEventListener("click", () => {
  void liveRandom();
});
document.querySelector("#pause")?.addEventListener("click", () => {
  playing = !playing;
  if (playing) tick();
  else window.clearTimeout(timer);
});
document.querySelector("#file")?.addEventListener("change", async (ev) => {
  const file = (ev.target as HTMLInputElement).files?.[0];
  if (!file) return;
  loadBundle(JSON.parse(await file.text()) as Bundle);
});

void fetch("/latest-run.json")
  .then((r) => (r.ok ? r.json() : null))
  .then((bundle: Bundle | null) => {
    if (bundle?.frames?.length) {
      loadBundle(bundle);
      return;
    }
    return liveRandom();
  })
  .catch(() => liveRandom());
