import { describe, expect, it } from 'vitest';
import { defaultMeal } from './meal';
import { nutrientsFor, parsePositive } from './portion';
import { SEED_FOODS } from './seed';
import { searchFoods } from './search';

describe('seed list', () => {
  it('has unique stable ids and sane numbers', () => {
    const ids = new Set(SEED_FOODS.map((f) => f.id));
    expect(ids.size).toBe(SEED_FOODS.length);
    for (const f of SEED_FOODS) {
      expect(f.id).toMatch(/^seed-[a-z0-9-]+$/);
      expect(f.portionG).toBeGreaterThan(0);
      expect(f.needsReview).toBe(true);
      // Atwater check: macros should roughly explain the kcal (alcohol and rounding allowed)
      const est = f.proteinPer100g * 4 + f.carbsPer100g * 4 + f.fatPer100g * 9;
      if (f.name !== 'Beer') expect(Math.abs(est - f.kcalPer100g)).toBeLessThan(f.kcalPer100g * 0.35 + 25);
    }
  });
});

describe('search', () => {
  it('finds by name, prefix, and alias', () => {
    expect(searchFoods(SEED_FOODS, 'jollof')[0]?.name).toBe('Jollof rice');
    expect(searchFoods(SEED_FOODS, 'dodo')[0]?.name).toBe('Plantain, fried');
    expect(searchFoods(SEED_FOODS, 'ewa')[0]?.name).toBe('Beans, boiled');
    expect(searchFoods(SEED_FOODS, 'EGUSI').map((f) => f.name)).toContain('Egusi soup');
  });
  it('ranks prefix matches before contains matches', () => {
    const r = searchFoods(SEED_FOODS, 'rice').map((f) => f.name);
    expect(r.indexOf('Rice')).toBe(-1);
    expect(r.length).toBeGreaterThan(2);
  });
  it('returns nothing for empty or unknown queries', () => {
    expect(searchFoods(SEED_FOODS, '   ')).toEqual([]);
    expect(searchFoods(SEED_FOODS, 'zzzzqq')).toEqual([]);
  });
  it('matches multi-word queries', () => {
    expect(searchFoods(SEED_FOODS, 'fried rice')[0]?.name).toBe('Fried rice');
  });
  it('respects the limit', () => expect(searchFoods(SEED_FOODS, 'a', 3).length).toBeLessThanOrEqual(3));
});

describe('portions', () => {
  const jollof = SEED_FOODS.find((f) => f.name === 'Jollof rice')!;
  it('scales per-100g values', () => {
    const n = nutrientsFor(jollof, 250);
    expect(n.kcal).toBeCloseTo(375, 6);
    expect(n.carbsG).toBeCloseTo(67.5, 6);
    expect(nutrientsFor(jollof, -5).kcal).toBe(0);
  });
  it('parses typed numbers leniently', () => {
    expect(parsePositive('250')).toBe(250);
    expect(parsePositive(' 1,5 ')).toBe(1.5);
    for (const bad of ['', 'abc', '0', '-3']) expect(parsePositive(bad)).toBeNull();
  });
});

describe('default meal slot', () => {
  it.each([[3, 'snack'], [4, 'breakfast'], [10, 'breakfast'], [11, 'lunch'], [15, 'lunch'], [16, 'dinner'], [21, 'dinner'], [22, 'snack'], [0, 'snack']] as const)(
    'hour %i is %s', (h, m) => expect(defaultMeal(h)).toBe(m));
});

describe('asMeal', () => {
  it('accepts a valid slot and falls back by hour otherwise', async () => {
    const { asMeal } = await import('./meal');
    expect(asMeal('dinner', 8)).toBe('dinner');
    expect(asMeal('nonsense', 8)).toBe('breakfast');
    expect(asMeal(undefined, 13)).toBe('lunch');
  });
});
