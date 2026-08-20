/** Seeded mulberry32. Combat is deterministic given a seed + call sequence. */
export interface Rng {
  next(): number;
  d6(): number;
  int(max: number): number;
  pick<T>(items: T[]): T;
  state(): number;
}

export function createRng(seed: number, savedState?: number): Rng {
  let a = (savedState ?? seed) >>> 0;
  const rng: Rng = {
    next() {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    d6() {
      return 1 + Math.floor(rng.next() * 6);
    },
    int(max: number) {
      if (max <= 0) return 0;
      return Math.floor(rng.next() * max);
    },
    pick<T>(items: T[]): T {
      return items[rng.int(items.length)];
    },
    state() {
      return a >>> 0;
    },
  };
  return rng;
}

export function rollHits(count: number, target: number, rng: Rng): { hits: number; dice: number[] } {
  const dice: number[] = [];
  let hits = 0;
  for (let i = 0; i < count; i++) {
    const d = rng.d6();
    dice.push(d);
    if (d <= target) hits++;
  }
  return { hits, dice };
}
