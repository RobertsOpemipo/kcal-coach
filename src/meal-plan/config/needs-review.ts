// src/meal-plan/config/needs-review.ts
/**
 * NEEDS EXPERT REVIEW. Every number here is a placeholder set by the logic
 * engineer to be confirmed by the owner or a registered dietitian before the
 * generator is released. Nothing is invented silently: a `null` value means
 * "not configured", and the generator returns a typed failure rather than
 * guessing.
 */

/**
 * Budget tiers (Low / Medium / High), resolved to naira per week. Owner to
 * enter real values. `null` means "not configured" — the generator returns
 * `cannot_meet_budget` with a clear message. NEEDS EXPERT REVIEW.
 */
export const BUDGET_TIER_NAIRA_PER_WEEK: {
  low: number | null;
  medium: number | null;
  high: number | null;
} = {
  low: null,
  medium: null,
  high: null,
};

/**
 * Allowed slack on the calorie window. BRD value: 5 percent.
 * A day must land in `[target.kcal * (1 - 0.05), target.kcal * (1 + 0.05)]`
 * and at or above `kcalFloor`. NEEDS EXPERT REVIEW of the interpretation
 * (the BRD says "each day within 5 percent of the calorie window" — read
 * here as ±5% of target.kcal; if the BRD meant a symmetric window around
 * the midpoint of [kcalLow, kcalHigh], only this function changes).
 */
export const CALORIE_WINDOW_TOLERANCE = 0.05;

/** Portion scale limits per dish, per the BRD. */
export const PORTION_SCALE_MIN = 0.75;
export const PORTION_SCALE_MAX = 1.5;

/** How many times a non-batchCook dish may appear in a week. */
export const MAX_DISH_REPEATS_PER_WEEK = 2;