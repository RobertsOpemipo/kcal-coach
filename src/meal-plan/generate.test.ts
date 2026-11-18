// src/meal-plan/generate.test.ts
import { describe, it, expect } from 'vitest';
import type {
  Appliance, DailyTarget, Dish, MealPlan, MealPlanInput, MealSlot,
  PlanDay, PlanFailure, PlanFailureReason, PlanMeal,
} from '../contracts';
import { generatePlan, validatePlan } from './generate';
import { isPlanFailure } from './types';
import type { PriceTable } from './prices';

// ---- fixtures ----

function makeDish(id: string, overrides: Partial<Dish> = {}): Dish {
  return {
    id,
    name: id,
    mealSlots: ['lunch', 'dinner'],
    ingredients: [{ foodId: `food-${id}`, grams: 100, section: 'proteins' }],
    kcal: 600, proteinG: 20, carbsG: 60, fatG: 15,
    allergenTags: [], requiredAppliances: ['gas_stove'],
    fridgeDependent: false, batchCook: false,
    prepSteps: ['Prep', 'Cook'],
    needsReview: true,
    ...overrides,
  };
}

const FIXTURE_DISHES: Dish[] = [
  makeDish('b1', { mealSlots: ['breakfast'], ingredients: [{ foodId: 'food-b1', grams: 100, section: 'proteins' }] }),
  makeDish('b2', { mealSlots: ['breakfast'], ingredients: [{ foodId: 'food-b2', grams: 100, section: 'grains_and_tubers' }] }),
  makeDish('b3', { mealSlots: ['breakfast'], ingredients: [{ foodId: 'food-b3', grams: 100, section: 'dairy_and_eggs' }] }),
  makeDish('b4', { mealSlots: ['breakfast'], batchCook: true, ingredients: [{ foodId: 'food-b4', grams: 100, section: 'vegetables_and_peppers' }] }),
  makeDish('l1', { mealSlots: ['lunch'], ingredients: [{ foodId: 'food-l1', grams: 100, section: 'proteins' }] }),
  makeDish('l2', { mealSlots: ['lunch'], ingredients: [{ foodId: 'food-l2', grams: 100, section: 'grains_and_tubers' }] }),
  makeDish('l3', { mealSlots: ['lunch'], ingredients: [{ foodId: 'food-l3', grams: 100, section: 'oils_and_seasonings' }] }),
  makeDish('l4', { mealSlots: ['lunch'], batchCook: true, ingredients: [{ foodId: 'food-l4', grams: 100, section: 'fruit' }] }),
  makeDish('d1', { mealSlots: ['dinner'], ingredients: [{ foodId: 'food-d1', grams: 100, section: 'proteins' }] }),
  makeDish('d2', { mealSlots: ['dinner'], ingredients: [{ foodId: 'food-d2', grams: 100, section: 'grains_and_tubers' }] }),
  makeDish('d3', { mealSlots: ['dinner'], ingredients: [{ foodId: 'food-d3', grams: 100, section: 'vegetables_and_peppers' }] }),
  makeDish('d4', { mealSlots: ['dinner'], batchCook: true, ingredients: [{ foodId: 'food-d4', grams: 100, section: 'dairy_and_eggs' }] }),
];

const PRICE_TABLE: PriceTable = {
  version: 1,
  updatedAt: '2026-11-01',
  rows: FIXTURE_DISHES.flatMap((d) => d.ingredients.map((i) => ({
    foodId: i.foodId, nairaPerKg: 1000, updatedAt: '2026-11-01',
  }))),
};

function target1800(): DailyTarget {
  return {
    status: 'ok',
    kcal: 1800,
    tdee: 2200,
    macros: {
      protein: { min: 50, target: 65, max: 90 },
      fat: { min: 40, target: 60, max: 80 },
      carbs: { min: 200, target: 250, max: 300 },
    },
    notes: [],
  };
}

function makeInput(overrides: Partial<MealPlanInput> = {}): MealPlanInput {
  return {
    goal: 'maintain',
    target: target1800(),
    kcalFloor: 1200,
    mealsPerDay: 3,
    budget: { kind: 'amount', naira: 50000 },
    appliances: ['gas_stove', 'fridge'],
    powerCutsCommon: false,
    mustIncludeFoodIds: [],
    avoidFoodIds: [],
    allergenTagsToAvoid: [],
    startDate: '2026-11-17',
    ...overrides,
  };
}

function expectFailureReason(result: MealPlan | PlanFailure, expected: PlanFailureReason): void {
  expect(isPlanFailure(result)).toBe(true);
  if (!isPlanFailure(result)) return;
  expect(result.status).toBe('failure');
  if (result.status !== 'failure') return;
  expect(result.reason).toBe(expected);
}

// ---- generation ----

describe('generatePlan — determinism', () => {
  it('same input + same seed gives the same plan', () => {
    const input = makeInput();
    const a = generatePlan(input, FIXTURE_DISHES, PRICE_TABLE, 42);
    const b = generatePlan(input, FIXTURE_DISHES, PRICE_TABLE, 42);
    expect(isPlanFailure(a)).toBe(false);
    expect(isPlanFailure(b)).toBe(false);
    expect(a).toEqual(b);
  });

  it('different seeds can produce different dish sequences', () => {
    const input = makeInput();
    const a = generatePlan(input, FIXTURE_DISHES, PRICE_TABLE, 1);
    const b = generatePlan(input, FIXTURE_DISHES, PRICE_TABLE, 2);
    expect(isPlanFailure(a)).toBe(false);
    expect(isPlanFailure(b)).toBe(false);
    if (isPlanFailure(a) || isPlanFailure(b)) return;
    const idsA = a.days.map((d) => d.meals.map((m) => m.dishId).join(',')).join('|');
    const idsB = b.days.map((d) => d.meals.map((m) => m.dishId).join(',')).join('|');
    expect(idsA).not.toBe(idsB);
  });
});

describe('generatePlan — hard filters', () => {
  it('removes dishes carrying a forbidden allergen', () => {
    const dishes = FIXTURE_DISHES.map((d) =>
      d.id === 'l1' ? { ...d, allergenTags: ['peanut'] } : d,
    );
    const input = makeInput({ allergenTagsToAvoid: ['peanut'] });
    const result = generatePlan(input, dishes, PRICE_TABLE, 42);
    expect(isPlanFailure(result)).toBe(false);
    if (isPlanFailure(result)) return;
    for (const day of result.days) for (const m of day.meals) expect(m.dishId).not.toBe('l1');
  });

  it('removes dishes containing an avoided food', () => {
    const input = makeInput({ avoidFoodIds: ['food-l2'] });
    const result = generatePlan(input, FIXTURE_DISHES, PRICE_TABLE, 42);
    expect(isPlanFailure(result)).toBe(false);
    if (isPlanFailure(result)) return;
    for (const day of result.days) for (const m of day.meals) expect(m.dishId).not.toBe('l2');
  });

  it('removes dishes needing a missing appliance', () => {
    const dishes = FIXTURE_DISHES.map((d) =>
      d.id === 'd1' ? { ...d, requiredAppliances: ['oven'] as Appliance[] } : d,
    );
    const input = makeInput({ appliances: ['gas_stove', 'fridge'] });
    const result = generatePlan(input, dishes, PRICE_TABLE, 42);
    expect(isPlanFailure(result)).toBe(false);
    if (isPlanFailure(result)) return;
    for (const day of result.days) for (const m of day.meals) expect(m.dishId).not.toBe('d1');
  });

  it('removes fridge-dependent dishes when powerCutsCommon is true', () => {
    const dishes = FIXTURE_DISHES.map((d) => d.id === 'b2' ? { ...d, fridgeDependent: true } : d);
    const input = makeInput({ powerCutsCommon: true });
    const result = generatePlan(input, dishes, PRICE_TABLE, 42);
    expect(isPlanFailure(result)).toBe(false);
    if (isPlanFailure(result)) return;
    for (const day of result.days) for (const m of day.meals) expect(m.dishId).not.toBe('b2');
  });

  it('returns no_dishes_available when every dish is filtered out', () => {
    const dishes = FIXTURE_DISHES.map((d) => ({ ...d, allergenTags: ['peanut'] }));
    const input = makeInput({ allergenTagsToAvoid: ['peanut'] });
    expectFailureReason(generatePlan(input, dishes, PRICE_TABLE, 42), 'no_dishes_available');
  });
});

describe('generatePlan — must-include', () => {
  it('every must-include food appears at least once', () => {
    const input = makeInput({ mustIncludeFoodIds: ['food-l1', 'food-d3'] });
    const result = generatePlan(input, FIXTURE_DISHES, PRICE_TABLE, 42);
    expect(isPlanFailure(result)).toBe(false);
    if (isPlanFailure(result)) return;
    const present = new Set<string>();
    for (const day of result.days) for (const m of day.meals) {
      const d = FIXTURE_DISHES.find((x) => x.id === m.dishId)!;
      for (const ing of d.ingredients) present.add(ing.foodId);
    }
    expect(present.has('food-l1')).toBe(true);
    expect(present.has('food-d3')).toBe(true);
  });

  it('returns must_include_unavailable when no dish contains the food', () => {
    const input = makeInput({ mustIncludeFoodIds: ['nonexistent-food'] });
    expectFailureReason(generatePlan(input, FIXTURE_DISHES, PRICE_TABLE, 42), 'must_include_unavailable');
  });
});

describe('generatePlan — calorie window and floor', () => {
  it('every day lands within 5% of target kcal', () => {
    const input = makeInput();
    const result = generatePlan(input, FIXTURE_DISHES, PRICE_TABLE, 42);
    expect(isPlanFailure(result)).toBe(false);
    if (isPlanFailure(result)) return;
    for (const day of result.days) {
      expect(day.kcal).toBeGreaterThanOrEqual(1800 * 0.95 - 1e-6);
      expect(day.kcal).toBeLessThanOrEqual(1800 * 1.05 + 1e-6);
    }
  });

  it('every day is at or above kcalFloor', () => {
    const input = makeInput({ kcalFloor: 1700 });
    const result = generatePlan(input, FIXTURE_DISHES, PRICE_TABLE, 42);
    expect(isPlanFailure(result)).toBe(false);
    if (isPlanFailure(result)) return;
    for (const day of result.days) expect(day.kcal).toBeGreaterThanOrEqual(1700 - 1e-6);
  });

  it('returns cannot_meet_calorie_window when the base cannot reach the target', () => {
    const input = makeInput({ target: { ...target1800(), kcal: 4000 } });
    expectFailureReason(generatePlan(input, FIXTURE_DISHES, PRICE_TABLE, 42), 'cannot_meet_calorie_window');
  });
});

describe('generatePlan — protein', () => {
  it('every day protein is inside [min, max]', () => {
    const input = makeInput();
    const result = generatePlan(input, FIXTURE_DISHES, PRICE_TABLE, 42);
    expect(isPlanFailure(result)).toBe(false);
    if (isPlanFailure(result)) return;
    for (const day of result.days) {
      expect(day.proteinG).toBeGreaterThanOrEqual(50 - 1e-6);
      expect(day.proteinG).toBeLessThanOrEqual(90 + 1e-6);
    }
  });

  it('returns cannot_meet_protein_range when min is unreachable at max scale', () => {
    const input = makeInput({
      target: {
        ...target1800(),
        macros: {
          protein: { min: 100, target: 110, max: 130 },
          fat: { min: 40, target: 60, max: 80 },
          carbs: { min: 200, target: 250, max: 300 },
        },
      },
    });
    expectFailureReason(generatePlan(input, FIXTURE_DISHES, PRICE_TABLE, 42), 'cannot_meet_protein_range');
  });
});

describe('generatePlan — portion scale', () => {
  it('stays within [0.75, 1.5]', () => {
    const input = makeInput();
    const result = generatePlan(input, FIXTURE_DISHES, PRICE_TABLE, 42);
    expect(isPlanFailure(result)).toBe(false);
    if (isPlanFailure(result)) return;
    for (const day of result.days) for (const m of day.meals) {
      expect(m.portionScale).toBeGreaterThanOrEqual(0.75);
      expect(m.portionScale).toBeLessThanOrEqual(1.5);
    }
  });
});

describe('generatePlan — repeats', () => {
  it('non-batchCook dishes are used at most twice', () => {
    const input = makeInput();
    const result = generatePlan(input, FIXTURE_DISHES, PRICE_TABLE, 42);
    expect(isPlanFailure(result)).toBe(false);
    if (isPlanFailure(result)) return;
    const counts = new Map<string, number>();
    for (const day of result.days) for (const m of day.meals) counts.set(m.dishId, (counts.get(m.dishId) ?? 0) + 1);
    for (const [id, n] of counts) {
      const d = FIXTURE_DISHES.find((x) => x.id === id)!;
      if (!d.batchCook) expect(n).toBeLessThanOrEqual(2);
    }
  });

  it('returns insufficient_dishes_for_variety when the slot pool is too small', () => {
    const small: Dish[] = [
      makeDish('b1', { mealSlots: ['breakfast'] }),
      makeDish('b2', { mealSlots: ['breakfast'] }),
      makeDish('l1', { mealSlots: ['lunch'] }),
      makeDish('l2', { mealSlots: ['lunch'] }),
      makeDish('d1', { mealSlots: ['dinner'] }),
      makeDish('d2', { mealSlots: ['dinner'] }),
    ];
    const prices: PriceTable = {
      version: 1, updatedAt: '2026-11-01',
      rows: small.flatMap((d) => d.ingredients.map((i) => ({ foodId: i.foodId, nairaPerKg: 1000, updatedAt: '2026-11-01' }))),
    };
    expectFailureReason(generatePlan(makeInput(), small, prices, 42), 'insufficient_dishes_for_variety');
  });
});

describe('generatePlan — budget', () => {
  it('total cost is at or under budget.amount', () => {
    const input = makeInput({ budget: { kind: 'amount', naira: 50000 } });
    const result = generatePlan(input, FIXTURE_DISHES, PRICE_TABLE, 42);
    expect(isPlanFailure(result)).toBe(false);
    if (isPlanFailure(result)) return;
    expect(result.totalCostNaira).not.toBeNull();
    expect(result.totalCostNaira!).toBeLessThanOrEqual(50000);
  });

  it('returns cannot_meet_budget when total exceeds budget.amount', () => {
    const input = makeInput({ budget: { kind: 'amount', naira: 100 } });
    expectFailureReason(generatePlan(input, FIXTURE_DISHES, PRICE_TABLE, 42), 'cannot_meet_budget');
  });

  it('returns cannot_meet_budget when the tier is not configured', () => {
    const input = makeInput({ budget: { kind: 'tier', tier: 'low' } });
    expectFailureReason(generatePlan(input, FIXTURE_DISHES, PRICE_TABLE, 42), 'cannot_meet_budget');
  });
});

describe('generatePlan — prices', () => {
  it('returns needs_prices when the table lacks a food', () => {
    const input = makeInput();
    const result = generatePlan(input, FIXTURE_DISHES, { version: 0, updatedAt: '1970-01-01', rows: [] }, 42);
    expect(isPlanFailure(result)).toBe(true);
    if (!isPlanFailure(result)) return;
    expect(result.status).toBe('needs_prices');
    if (result.status !== 'needs_prices') return;
    expect(result.missing.length).toBeGreaterThan(0);
  });
});

describe('generatePlan — maintenance-only', () => {
  it('a maintenance_only target builds a plan at maintenance kcal, not a deficit', () => {
    const maintenanceTarget: DailyTarget = {
      status: 'maintenance_only',
      kcal: 1800,
      tdee: 1800,
      reason: 'bmi_under_18_5',
      macros: {
        protein: { min: 50, target: 65, max: 90 },
        fat: { min: 40, target: 60, max: 80 },
        carbs: { min: 200, target: 250, max: 300 },
      },
      notes: [],
    };
    const input = makeInput({ goal: 'lose', target: maintenanceTarget });
    const result = generatePlan(input, FIXTURE_DISHES, PRICE_TABLE, 42);
    expect(isPlanFailure(result)).toBe(false);
    if (isPlanFailure(result)) return;
    for (const day of result.days) {
      expect(day.kcal).toBeGreaterThanOrEqual(1800 * 0.95 - 1e-6);
      expect(day.kcal).toBeLessThanOrEqual(1800 * 1.05 + 1e-6);
    }
  });
});

// ---- validatePlan ----

function makeValidPlan(input: MealPlanInput = makeInput()): MealPlan {
  const result = generatePlan(input, FIXTURE_DISHES, PRICE_TABLE, 42);
  if (isPlanFailure(result)) throw new Error('fixture: expected a valid plan, got ' + result.status);
  return result;
}

describe('validatePlan — independent of generatePlan', () => {
  it('accepts a plan produced by generatePlan', () => {
    const plan = makeValidPlan();
    expect(validatePlan(plan, FIXTURE_DISHES, PRICE_TABLE)).toBeNull();
  });

  it('rejects a plan with fewer than 7 days', () => {
    const plan = makeValidPlan();
    const broken: MealPlan = { ...plan, days: plan.days.slice(0, 6) };
    const v = validatePlan(broken, FIXTURE_DISHES, PRICE_TABLE);
    expect(v).not.toBeNull();
    if (!v || v.status !== 'failure') return;
    expect(v.reason).toBe('cannot_meet_calorie_window');
  });

  it('rejects a day whose kcal is outside the target window', () => {
    const plan = makeValidPlan();
    const broken: MealPlan = {
      ...plan,
      days: plan.days.map((d, i) => i === 0 ? {
        ...d,
        meals: d.meals.map((m) => {
          const dish = FIXTURE_DISHES.find((x) => x.id === m.dishId)!;
          return {
            ...m, portionScale: 1.5,
            kcal: dish.kcal * 1.5, proteinG: dish.proteinG * 1.5,
            carbsG: dish.carbsG * 1.5, fatG: dish.fatG * 1.5,
          };
        }),
        kcal: d.meals.reduce((s, m) => {
          const dish = FIXTURE_DISHES.find((x) => x.id === m.dishId)!;
          return s + dish.kcal * 1.5;
        }, 0),
      } : d),
    };
    const v = validatePlan(broken, FIXTURE_DISHES, PRICE_TABLE);
    expect(v).not.toBeNull();
    if (!v || v.status !== 'failure') return;
    expect(v.reason).toBe('cannot_meet_calorie_window');
  });

  it('rejects a plan containing a dish that now carries a forbidden allergen', () => {
    const dishes = FIXTURE_DISHES.map((d) =>
      d.id === 'l1' ? { ...d, allergenTags: ['peanut'] } : d,
    );
    const input = makeInput({ mustIncludeFoodIds: ['food-l1'] });
    const baseResult = generatePlan(input, dishes, PRICE_TABLE, 42);
    if (isPlanFailure(baseResult)) throw new Error('fixture: expected a valid plan');
    const broken: MealPlan = {
      ...baseResult,
      input: { ...input, allergenTagsToAvoid: ['peanut'] },
    };
    const v = validatePlan(broken, dishes, PRICE_TABLE);
    expect(v).not.toBeNull();
    if (!v || v.status !== 'failure') return;
    expect(v.reason).toBe('no_dishes_available');
  });

  it('rejects a plan missing a must-include food', () => {
    const plan = makeValidPlan();
    const broken: MealPlan = {
      ...plan,
      input: { ...plan.input, mustIncludeFoodIds: ['food-nonexistent'] },
    };
    const v = validatePlan(broken, FIXTURE_DISHES, PRICE_TABLE);
    expect(v).not.toBeNull();
    if (!v || v.status !== 'failure') return;
    expect(v.reason).toBe('must_include_unavailable');
  });

  it('rejects a plan that exceeds budget', () => {
    const plan = makeValidPlan();
    const broken: MealPlan = {
      ...plan,
      input: { ...plan.input, budget: { kind: 'amount', naira: 100 } },
    };
    const v = validatePlan(broken, FIXTURE_DISHES, PRICE_TABLE);
    expect(v).not.toBeNull();
    if (!v || v.status !== 'failure') return;
    expect(v.reason).toBe('cannot_meet_budget');
  });

  it('rejects a plan when prices are missing', () => {
    const plan = makeValidPlan();
    const v = validatePlan(plan, FIXTURE_DISHES, { version: 0, updatedAt: '1970-01-01', rows: [] });
    expect(v).not.toBeNull();
    if (!v) return;
    expect(v.status).toBe('needs_prices');
  });

  it('rejects a plan whose stored kcal totals disagree with recomputed totals', () => {
    const plan = makeValidPlan();
    const broken: MealPlan = {
      ...plan,
      days: plan.days.map((d, i) => i === 0 ? { ...d, kcal: d.kcal + 1 } : d),
    };
    const v = validatePlan(broken, FIXTURE_DISHES, PRICE_TABLE);
    expect(v).not.toBeNull();
    if (!v || v.status !== 'failure') return;
    expect(v.reason).toBe('cannot_meet_calorie_window');
  });
});

// ---- D22: protein is a LOWER bound only ----

describe('generatePlan — D22: protein LOWER bound only', () => {
  it('above the upper bound passes a day (no upper limit)', () => {
    const narrowTarget: DailyTarget = {
      ...target1800(),
      macros: {
        protein: { min: 40, target: 45, max: 50 },
        fat: { min: 40, target: 60, max: 80 },
        carbs: { min: 200, target: 250, max: 300 },
      },
    };
    const input = makeInput({ target: narrowTarget });
    const result = generatePlan(input, FIXTURE_DISHES, PRICE_TABLE, 42);
    expect(isPlanFailure(result)).toBe(false);
    if (isPlanFailure(result)) return;
    for (const day of result.days) {
      expect(day.proteinG).toBeGreaterThan(50);
      expect(day.proteinG).toBeGreaterThanOrEqual(40);
    }
    expect(validatePlan(result, FIXTURE_DISHES, PRICE_TABLE)).toBeNull();
  });

  it('below the lower bound fails (unreachable protein min)', () => {
    const strictTarget: DailyTarget = {
      ...target1800(),
      macros: {
        protein: { min: 500, target: 500, max: 500 },
        fat: { min: 40, target: 60, max: 80 },
        carbs: { min: 200, target: 250, max: 300 },
      },
    };
    const input = makeInput({ target: strictTarget });
    expectFailureReason(
      generatePlan(input, FIXTURE_DISHES, PRICE_TABLE, 42),
      'cannot_meet_protein_range',
    );
  });
});

describe('validatePlan — D22: below lower bound fails', () => {
  it('rejects a hand-crafted plan whose day is below the protein min', () => {
    const highp: Dish = makeDish('highp', {
      kcal: 600, proteinG: 20, carbsG: 60, fatG: 15,
      batchCook: true,
      mealSlots: ['breakfast', 'lunch', 'dinner'],
      ingredients: [{ foodId: 'food-highp', grams: 100, section: 'proteins' }],
    });
    const lowp: Dish = makeDish('lowp', {
      kcal: 600, proteinG: 0, carbsG: 100, fatG: 10,
      batchCook: true,
      mealSlots: ['breakfast', 'lunch', 'dinner'],
      ingredients: [{ foodId: 'food-lowp', grams: 100, section: 'proteins' }],
    });
    const dishes: Dish[] = [highp, lowp];
    const prices: PriceTable = {
      version: 1, updatedAt: '2026-11-01',
      rows: [
        { foodId: 'food-highp', nairaPerKg: 1000, updatedAt: '2026-11-01' },
        { foodId: 'food-lowp', nairaPerKg: 1000, updatedAt: '2026-11-01' },
      ],
    };
    const mkMeal = (slot: MealSlot, d: Dish): PlanMeal => ({
      slot, dishId: d.id, dishName: d.name, portionScale: 1,
      kcal: d.kcal, proteinG: d.proteinG, carbsG: d.carbsG, fatG: d.fatG,
      prepSteps: d.prepSteps.slice(),
    });
    const badDay: PlanDay = {
      localDate: '2026-11-17',
      meals: [mkMeal('breakfast', lowp), mkMeal('lunch', lowp), mkMeal('dinner', lowp)],
      kcal: 1800, proteinG: 0, carbsG: 300, fatG: 30,
    };
    const goodDay = (date: string): PlanDay => ({
      localDate: date,
      meals: [mkMeal('breakfast', highp), mkMeal('lunch', highp), mkMeal('dinner', highp)],
      kcal: 1800, proteinG: 60, carbsG: 180, fatG: 45,
    });
    const plan: MealPlan = {
      input: makeInput(),
      seed: 42,
      days: [
        badDay,
        goodDay('2026-11-18'),
        goodDay('2026-11-19'),
        goodDay('2026-11-20'),
        goodDay('2026-11-21'),
        goodDay('2026-11-22'),
        goodDay('2026-11-23'),
      ],
      grocery: [],
      totalCostNaira: null,
    };
    const v = validatePlan(plan, dishes, prices);
    expect(v).not.toBeNull();
    if (!v || v.status !== 'failure') return;
    expect(v.reason).toBe('cannot_meet_protein_range');
  });
});