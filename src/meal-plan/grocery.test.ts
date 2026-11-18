// src/meal-plan/grocery.test.ts
import { describe, it, expect } from 'vitest';
import type { Dish, PlanMeal } from '../contracts';
import { aggregateGrocery, totalCostNaira } from './grocery';
import { emptyPriceTable, type PriceTable } from './prices';

function makeDish(overrides: Partial<Dish> = {}): Dish {
  return {
    id: 'd1',
    name: 'Test dish',
    mealSlots: ['lunch'],
    ingredients: [{ foodId: 'rice', grams: 100, section: 'grains_and_tubers' }],
    kcal: 200, proteinG: 4, carbsG: 40, fatG: 1,
    allergenTags: [], requiredAppliances: ['gas_stove'],
    fridgeDependent: false, batchCook: false,
    prepSteps: ['Boil', 'Serve'], needsReview: true,
    ...overrides,
  };
}

function makeMeal(overrides: Partial<PlanMeal> = {}): PlanMeal {
  return {
    slot: 'lunch', dishId: 'd1', dishName: 'Test dish', portionScale: 1,
    kcal: 200, proteinG: 4, carbsG: 40, fatG: 1,
    prepSteps: ['Boil', 'Serve'],
    ...overrides,
  };
}

describe('aggregateGrocery', () => {
  it('sums grams across two meals of the same dish with different scales', () => {
    const dishes = new Map<string, Dish>([['d1', makeDish()]]);
    const meals: PlanMeal[] = [makeMeal({ portionScale: 1.0 }), makeMeal({ portionScale: 1.5 })];
    const lines = aggregateGrocery(meals, dishes, emptyPriceTable());
    expect(lines.length).toBe(1);
    expect(lines[0]!.foodId).toBe('rice');
    expect(lines[0]!.grams).toBeCloseTo(250, 6);
  });

  it('groups by section order', () => {
    const dishes = new Map<string, Dish>([
      ['veg', makeDish({ id: 'veg', ingredients: [{ foodId: 'tomato', grams: 200, section: 'vegetables_and_peppers' }] })],
      ['prot', makeDish({ id: 'prot', ingredients: [{ foodId: 'beans', grams: 150, section: 'proteins' }] })],
      ['grain', makeDish({ id: 'grain', ingredients: [{ foodId: 'rice', grams: 100, section: 'grains_and_tubers' }] })],
    ]);
    const meals: PlanMeal[] = [
      makeMeal({ dishId: 'veg' }),
      makeMeal({ dishId: 'prot' }),
      makeMeal({ dishId: 'grain' }),
    ];
    const lines = aggregateGrocery(meals, dishes, emptyPriceTable());
    expect(lines.map((l) => l.section)).toEqual([
      'grains_and_tubers', 'vegetables_and_peppers', 'proteins',
    ]);
  });

  it('leaves costNaira null when a price is missing', () => {
    const dishes = new Map<string, Dish>([['d1', makeDish()]]);
    const lines = aggregateGrocery([makeMeal()], dishes, emptyPriceTable());
    expect(lines[0]!.costNaira).toBeNull();
    expect(lines[0]!.estimateLabel).toBe('estimate');
  });

  it('fills costNaira from the price table (naira per kg, kobo-rounded)', () => {
    const dishes = new Map<string, Dish>([['d1', makeDish()]]);
    const prices: PriceTable = {
      version: 1, updatedAt: '2026-11-01',
      rows: [{ foodId: 'rice', nairaPerKg: 1200, updatedAt: '2026-11-01' }],
    };
    const lines = aggregateGrocery([makeMeal()], dishes, prices);
    expect(lines[0]!.costNaira).toBeCloseTo(120, 2);
  });

  it('is deterministic for the same inputs', () => {
    const dishes = new Map<string, Dish>([['d1', makeDish()]]);
    const a = aggregateGrocery([makeMeal()], dishes, emptyPriceTable());
    const b = aggregateGrocery([makeMeal()], dishes, emptyPriceTable());
    expect(a).toEqual(b);
  });

  it('returns [] for no meals', () => {
    expect(aggregateGrocery([], new Map(), emptyPriceTable())).toEqual([]);
  });
});

describe('totalCostNaira', () => {
  it('returns null when any line is unpriced', () => {
    const lines = [
      { foodId: 'a', section: 'grains_and_tubers' as const, grams: 100, costNaira: 100, estimateLabel: 'estimate' as const },
      { foodId: 'b', section: 'proteins' as const, grams: 100, costNaira: null, estimateLabel: 'estimate' as const },
    ];
    expect(totalCostNaira(lines)).toBeNull();
  });

  it('sums line costs and rounds to kobo', () => {
    const lines = [
      { foodId: 'a', section: 'grains_and_tubers' as const, grams: 100, costNaira: 100.11, estimateLabel: 'estimate' as const },
      { foodId: 'b', section: 'proteins' as const, grams: 100, costNaira: 200.22, estimateLabel: 'estimate' as const },
    ];
    expect(totalCostNaira(lines)).toBeCloseTo(300.33, 2);
  });

  it('returns 0 for no lines', () => {
    expect(totalCostNaira([])).toBe(0);
  });
});
