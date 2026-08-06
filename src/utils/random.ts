export type RNG = () => number;

/** Small deterministic PRNG so runs are reproducible in tests. */
export function mulberry32(seed: number): RNG {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates. Returns a new array; never mutates the input. */
export function shuffle<T>(items: readonly T[], rng: RNG = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function uid(prefix = 'id'): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return prefix + '_' + Date.now().toString(36) + '_' + rand;
}
