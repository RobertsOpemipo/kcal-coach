// src/meal-plan/dishes.test.ts
import { describe, it, expect } from 'vitest';
import { SEED_DISHES, DISHES_BY_ID } from './dishes';
import { SEED_FOODS } from '../food/seed';

const foodById = new Map(SEED_FOODS.map((f) => [f.id, f]));

describe('SEED_DISHES — structure', () => {
  it('has at least 20 dishes', () => {
    expect(SEED_DISHES.length).toBeGreaterThanOrEqual(20);
  });

  it('every dish has a unique id and a non-empty mealSlots', () => {
    const ids = SEED_DISHES.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const d of SEED_DISHES) expect(d.mealSlots.length).toBeGreaterThan(0);
  });

  it('every dish has at least 2 prep steps', () => {
    for (const d of SEED_DISHES) {
      expect(d.prepSteps.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('every dish is marked needsReview: true', () => {
    for (const d of SEED_DISHES) expect(d.needsReview).toBe(true);
  });

  it('DISHES_BY_ID contains every dish and only those dishes', () => {
    expect(DISHES_BY_ID.size).toBe(SEED_DISHES.length);
    for (const d of SEED_DISHES) {
      expect(DISHES_BY_ID.get(d.id)).toBe(d);
    }
  });
});

describe('SEED_DISHES — food references', () => {
  it('every ingredient references a food that exists in SEED_FOODS', () => {
    const missing: string[] = [];
    for (const d of SEED_DISHES) {
      for (const ing of d.ingredients) {
        if (!foodById.has(ing.foodId)) missing.push(`${d.id} -> ${ing.foodId}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('every dish has at least one ingredient', () => {
    for (const d of SEED_DISHES) expect(d.ingredients.length).toBeGreaterThan(0);
  });
});

describe('SEED_DISHES — macro consistency vs SEED_FOODS', () => {
  it('stored kcal matches the sum of ingredient macros (within 1%)', () => {
    for (const d of SEED_DISHES) {
      let kcal = 0;
      for (const ing of d.ingredients) {
        const f = foodById.get(ing.foodId);
        if (!f) continue;
        kcal += (ing.grams / 100) * f.kcalPer100g;
      }
      const denom = Math.max(Math.abs(kcal), Math.abs(d.kcal), 1);
      expect(Math.abs(kcal - d.kcal) / denom, `${d.id}: stored ${d.kcal} vs computed ${kcal.toFixed(2)}`).toBeLessThan(0.01);
    }
  });

  it('stored protein matches the sum of ingredient macros (within 1%)', () => {
    for (const d of SEED_DISHES) {
      let p = 0;
      for (const ing of d.ingredients) {
        const f = foodById.get(ing.foodId);
        if (!f) continue;
        p += (ing.grams / 100) * f.proteinPer100g;
      }
      const denom = Math.max(Math.abs(p), Math.abs(d.proteinG), 1);
      expect(Math.abs(p - d.proteinG) / denom, `${d.id}: stored ${d.proteinG} vs computed ${p.toFixed(2)}`).toBeLessThan(0.01);
    }
  });
});

describe('SEED_DISHES — slot coverage', () => {
  it('every breakfast/lunch/dinner slot has at least 4 dishes; snack has at least 3', () => {
    const counts = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
    for (const d of SEED_DISHES) for (const s of d.mealSlots) counts[s]++;
    expect(counts.breakfast).toBeGreaterThanOrEqual(4);
    expect(counts.lunch).toBeGreaterThanOrEqual(4);
    expect(counts.dinner).toBeGreaterThanOrEqual(4);
    expect(counts.snack).toBeGreaterThanOrEqual(3);
  });

  it('every slot has at least one batchCook dish', () => {
    const slots = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
    for (const s of slots) {
      const hasBatch = SEED_DISHES.some((d) => d.mealSlots.includes(s) && d.batchCook);
      expect(hasBatch, `no batchCook dish for ${s}`).toBe(true);
    }
  });

  it('every meal slot has at least 4 dishes that do not require a gas_stove', () => {
    const slots = ['breakfast', 'lunch', 'dinner'] as const;
    for (const s of slots) {
      const fitting = SEED_DISHES.filter(
        (d) => d.mealSlots.includes(s) && !d.requiredAppliances.includes('gas_stove'),
      );
      expect(fitting.length, `slot ${s} has ${fitting.length} non-gas dishes`).toBeGreaterThanOrEqual(4);
    }
  });
});