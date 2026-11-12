/**
 * NEEDS EXPERT REVIEW. Every number here was written from memory of published
 * equations or common guidance. A registered dietitian / clinician must confirm
 * them (BRD: "Health calculators", "Things I could not verify") before release.
 */
export const REVIEW_STATUS = 'needs expert review' as const;

export const ACTIVITY_FACTORS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
} as const;

export const GOAL_CONFIG = {
  /** Lose: TDEE minus 10 to 20 percent. */
  loseDeficitMin: 0.1,
  loseDeficitDefault: 0.15,
  loseDeficitMax: 0.2,
  /** Gain: TDEE plus 5 to 15 percent. */
  gainSurplusMin: 0.05,
  gainSurplusDefault: 0.1,
  gainSurplusMax: 0.15,
  /** Never lose faster than this share of body weight per week. */
  maxWeeklyLossFraction: 0.01,
  /** Energy per kg of body weight change (approximation). */
  kcalPerKg: 7700,
  /** Unsupervised minimums. */
  floorKcal: { female: 1200, male: 1500 },
  proteinGPerKg: { default: 1.6, gain: 1.8 },
  fatShareOfKcal: 0.25,
  /** Macro range shown as target +/- this share. */
  macroRange: 0.1,
  kcalPerG: { protein: 4, carbs: 4, fat: 9 },
  bmiReferBelow: 18.5,
  minAdultAge: 18,
} as const;
