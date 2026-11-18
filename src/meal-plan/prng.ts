// src/meal-plan/prng.ts
/**
 * mulberry32 — a small, fast, seedable PRNG.
 * Reference: https://github.com/bryc/code/blob/master/jshash/PRNGs.md#mulberry32
 * Deterministic for a given seed across machines and JS engines.
 * Not for security; only for meal-plan generation so the same (input, seed)
 * always gives the same plan.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}