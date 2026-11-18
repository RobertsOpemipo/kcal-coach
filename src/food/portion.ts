import type { Food } from '../contracts';

export interface Nutrients { kcal: number; proteinG: number; carbsG: number; fatG: number }

export function nutrientsFor(food: Pick<Food, 'kcalPer100g' | 'proteinPer100g' | 'carbsPer100g' | 'fatPer100g'>, grams: number): Nutrients {
  const k = Math.max(0, grams) / 100;
  return {
    kcal: food.kcalPer100g * k,
    proteinG: food.proteinPer100g * k,
    carbsG: food.carbsPer100g * k,
    fatG: food.fatPer100g * k,
  };
}

/** Parse a typed number leniently ("250", "250.5", "1,5"). Returns null when not a positive number. */
export function parsePositive(text: string): number | null {
  const n = Number(text.trim().replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}
