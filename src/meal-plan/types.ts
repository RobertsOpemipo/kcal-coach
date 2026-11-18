// src/meal-plan/types.ts
import type { MealPlan, PlanFailure } from '../contracts';

/** Narrowing helper for callers holding `MealPlan | PlanFailure`. */
export function isPlanFailure(x: MealPlan | PlanFailure): x is PlanFailure {
  return 'status' in x;
}