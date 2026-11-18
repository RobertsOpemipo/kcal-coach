import type { MealSlot } from '../contracts';

export const MEAL_SLOTS: readonly MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];
export const MEAL_LABEL: Record<MealSlot, string> = {
  breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snacks',
};

/** Suggest a meal slot from the hour (0-23, Lagos). The user can always change it. */
export function defaultMeal(hour: number): MealSlot {
  if (hour >= 4 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 16) return 'lunch';
  if (hour >= 16 && hour < 22) return 'dinner';
  return 'snack';
}

/** Validate a route param into a meal slot, falling back to the slot for the given hour. */
export const asMeal = (value: string | undefined, hour: number): MealSlot =>
  MEAL_SLOTS.find((s) => s === value) ?? defaultMeal(hour);
