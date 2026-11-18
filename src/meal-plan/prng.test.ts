// src/meal-plan/prng.test.ts
import { describe, it, expect } from 'vitest';
import { mulberry32 } from './prng';

describe('mulberry32', () => {
  it('is deterministic for the same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 20; i++) expect(a()).toBe(b());
  });

  it('gives different sequences for different seeds', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    let differed = false;
    for (let i = 0; i < 20; i++) {
      if (a() !== b()) { differed = true; break; }
    }
    expect(differed).toBe(true);
  });

  it('returns numbers in [0, 1)', () => {
    const r = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('does not return the same value every call', () => {
    const r = mulberry32(7);
    const seen = new Set<number>();
    for (let i = 0; i < 10; i++) seen.add(r());
    expect(seen.size).toBeGreaterThan(1);
  });

  it('handles seed 0 (does not get stuck)', () => {
    const r = mulberry32(0);
    const seen = new Set<number>();
    for (let i = 0; i < 10; i++) seen.add(r());
    expect(seen.size).toBeGreaterThan(1);
  });
});