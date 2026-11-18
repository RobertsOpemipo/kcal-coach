// src/meal-plan/realisticProfiles.test.ts
import { describe, it, expect } from 'vitest';
import type { Appliance, DailyTarget, GoalKind, MealPlanInput } from '../contracts';
import { generatePlan, validatePlan } from './generate';
import { isPlanFailure } from './types';
import { SEED_DISHES } from './dishes';
import { SEED_FOODS } from '../food/seed';
import type { PriceTable } from './prices';

const REAL_PRICES: PriceTable = {
  version: 1,
  updatedAt: '2026-11-01',
  rows: SEED_FOODS.map((f) => ({ foodId: f.id, nairaPerKg: 1000, updatedAt: '2026-11-01' })),
};

/**
 * Build a plausible DailyTarget from weight and kcal. Mirrors GOAL_CONFIG
 * (protein = weight × proteinGPerKg; macro range ±10%), so the test exercises
 * the planner against targets a real profile would produce. If `targetForProfile`
 * differs, this is the one place to adjust.
 */
function makeTarget(weightKg: number, kcal: number, goal: GoalKind): DailyTarget {
  const proteinPerKg = goal === 'gain' ? 1.8 : 1.6;
  const proteinTarget = weightKg * proteinPerKg;
  return {
    status: 'ok',
    kcal,
    tdee: kcal + 200,
    macros: {
      protein: { min: proteinTarget * 0.9, target: proteinTarget, max: proteinTarget * 1.1 },
      fat: { min: kcal * 0.25 * 0.9 / 9, target: kcal * 0.25 / 9, max: kcal * 0.25 * 1.1 / 9 },
      carbs: { min: kcal * 0.5 * 0.9 / 4, target: kcal * 0.5 / 4, max: kcal * 0.5 * 1.1 / 4 },
    },
    notes: [],
  };
}

const ALL_APPLIANCES: Appliance[] = [
  'gas_stove', 'electric_stove', 'charcoal_stove', 'oven',
  'microwave', 'blender', 'pressure_cooker', 'fridge',
];

interface Profile { name: string; weightKg: number; kcal: number; goal: GoalKind; kcalFloor: number }

const PROFILES: Profile[] = [
  { name: '60kg woman · maintain · 1800 kcal', weightKg: 60, kcal: 1800, goal: 'maintain', kcalFloor: 1200 },
  { name: '80kg man · maintain · 2400 kcal', weightKg: 80, kcal: 2400, goal: 'maintain', kcalFloor: 1500 },
  { name: '70kg man · lose · 1900 kcal', weightKg: 70, kcal: 1900, goal: 'lose', kcalFloor: 1500 },
  { name: '55kg woman · maintain · 1500 kcal', weightKg: 55, kcal: 1500, goal: 'maintain', kcalFloor: 1200 },
];

interface Filter { name: string; overrides: Partial<MealPlanInput> }

const FILTERS: Filter[] = [
  { name: 'no filters', overrides: {} },
  { name: 'no fish', overrides: { avoidFoodIds: ['seed-fish-fried'] } },
  // No pork dishes exist in the seed; the filter is a no-op that proves the mechanism works.
  { name: 'no pork', overrides: { avoidFoodIds: ['seed-pork'] } },
  { name: 'no gas stove', overrides: { appliances: ALL_APPLIANCES.filter((a) => a !== 'gas_stove') } },
];

describe('generatePlan — realistic profiles with SEED_DISHES', () => {
  for (const profile of PROFILES) {
    for (const filter of FILTERS) {
      it(`${profile.name} · ${filter.name} produces a valid plan`, () => {
        const input: MealPlanInput = {
          goal: profile.goal,
          target: makeTarget(profile.weightKg, profile.kcal, profile.goal),
          kcalFloor: profile.kcalFloor,
          mealsPerDay: 3,
          budget: { kind: 'amount', naira: 1_000_000 },
          appliances: ALL_APPLIANCES,
          powerCutsCommon: false,
          mustIncludeFoodIds: [],
          avoidFoodIds: [],
          allergenTagsToAvoid: [],
          startDate: '2026-11-17',
          ...filter.overrides,
        };

        const result = generatePlan(input, SEED_DISHES, REAL_PRICES, 42);

        if (isPlanFailure(result)) {
          const tag = result.status === 'failure'
            ? `${result.reason}: ${result.detail}`
            : `needs_prices: [${result.missing.join(', ')}]`;
          console.error(`PROFILE FAILURE — ${profile.name} · ${filter.name} — ${tag}`);
        }
        expect(isPlanFailure(result)).toBe(false);
        if (isPlanFailure(result)) return;

        const v = validatePlan(result, SEED_DISHES, REAL_PRICES);
        expect(v).toBeNull();
      });
    }
  }
});