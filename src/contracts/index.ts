// src/contracts/index.ts
// Shared types only. No logic. Changes here must be logged in docs/CONTRACTS.md.

export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very_active' | 'extra_active';
export type GoalKind = 'lose' | 'maintain' | 'gain';
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type EntrySource = 'manual' | 'scan' | 'custom' | 'copy';
export type BmrMethod = 'mifflin' | 'harris_benedict' | 'katch_mcardle';

export interface MacroRange {
  /** grams */
  min: number;
  target: number;
  max: number;
}

export interface Macros {
  protein: MacroRange;
  fat: MacroRange;
  carbs: MacroRange;
}

export type DailyTarget =
  | { status: 'ok'; kcal: number; tdee: number; macros: Macros; notes: string[] }
  | {
      status: 'maintenance_only';
      kcal: number;
      tdee: number;
      macros: Macros;
      reason: 'under_18' | 'pregnant_or_breastfeeding' | 'bmi_under_18_5';
      notes: string[];
    };

export interface LogEntry {
  id: string; // device-generated UUID
  localDate: string; // YYYY-MM-DD in Africa/Lagos
  meal: MealSlot;
  foodId: string | null;
  name: string;
  grams: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  source: EntrySource;
  createdAt: string; // ISO UTC
  updatedAt: string;
  deletedAt: string | null; // tombstone
}

// ---- Phase 1 additions ----
export type Units = 'metric' | 'imperial';

export interface Profile {
  sex: Sex;
  birthYear: number;
  heightCm: number;
  activity: ActivityLevel;
  goal: GoalKind;
  units: Units;
  pregnantOrBreastfeeding: boolean;
  updatedAt: string;
}

export interface Food {
  id: string;
  name: string;
  aliases: string[];
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  /** Typical single serving in grams (used as the default portion). */
  portionG: number;
  portionLabel: string;
  /** 'verified' = built-in list; 'custom' = made by the user. */
  origin: 'verified' | 'custom';
  /** True until a dietitian has confirmed the numbers. */
  needsReview: boolean;
}

export interface WaterEntry {
  id: string;
  localDate: string;
  ml: number;
  createdAt: string;
}

export interface MacroProgress {
  eatenG: number;
  targetG: number;
  /** 0..1, capped at 1 */
  fraction: number;
}

export interface DaySummary {
  goalKcal: number;
  eatenKcal: number;
  /** Never negative. */
  remainingKcal: number;
  /** Kcal above the goal, 0 when under. Shown neutrally, never in red. */
  overKcal: number;
  /** 0..1, capped at 1 */
  fraction: number;
  protein: MacroProgress;
  carbs: MacroProgress;
  fat: MacroProgress;
}

// ---- T2: weight history ----

export interface WeightEntry {
  id: string;
  localDate: string; // YYYY-MM-DD in Africa/Lagos
  weightKg: number;
  waistCm: number | null;
  bodyFatPct: number | null;
  bodyFatSource: string | null;
  createdAt: string; // ISO UTC
  updatedAt: string;
  deletedAt: string | null;
}

/** One observation used by the weight-trend maths (does not need the full row). */
export interface WeightPoint {
  localDate: string; // YYYY-MM-DD
  weightKg: number;
  /**
   * Optional tie-breaker when two entries share a `localDate`: the later ISO
   * string wins. If omitted, array order is the tie-breaker (later index wins),
   * so callers should pass entries in `createdAt` order — `weightRepo.list()`
   * already does this.
   */
  createdAt?: string;
}

/** Copy-bearing enum. The UI writes the wording. */
export type WeightTrendSummary = 'on_track' | 'slower' | 'faster' | 'not_enough_data';

// ---- T3: meal plan ----

export type GrocerySection =
  | 'grains_and_tubers'
  | 'vegetables_and_peppers'
  | 'proteins'
  | 'oils_and_seasonings'
  | 'dairy_and_eggs'
  | 'fruit'
  | 'other';

export type Appliance =
  | 'gas_stove'
  | 'electric_stove'
  | 'charcoal_stove'
  | 'oven'
  | 'microwave'
  | 'blender'
  | 'pressure_cooker'
  | 'fridge';

export interface DishIngredient {
  foodId: string;
  /** grams per 1.0x portion of this dish */
  grams: number;
  section: GrocerySection;
}

export interface Dish {
  id: string;
  name: string;
  mealSlots: MealSlot[];
  ingredients: DishIngredient[];
  /** per 1.0x portion */
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  allergenTags: string[];
  requiredAppliances: Appliance[];
  /** Excluded when the "power cuts are common" switch is on */
  fridgeDependent: boolean;
  /** May appear more than twice a week */
  batchCook: boolean;
  /** 2 to 4 short prep steps, human-written */
  prepSteps: string[];
  /** True until a dietitian confirms the numbers */
  needsReview: boolean;
}

export type Budget =
  | { kind: 'amount'; naira: number }
  | { kind: 'tier'; tier: 'low' | 'medium' | 'high' };

export interface MealPlanInput {
  /** Metadata only. The plan is driven entirely by `target`. */
  goal: GoalKind;
  /** Daily target from `targetForProfile`. The generator never computes kcal itself. */
  target: DailyTarget;
  /**
   * Absolute safety floor for any day's kcal (i.e. `GOAL_CONFIG.floorKcal[sex]`).
   * The generator never reads `profile.sex`; the caller supplies the floor.
   */
  kcalFloor: number;
  /** 3 = breakfast/lunch/dinner, 4 = 3 meals + 1 snack */
  mealsPerDay: 3 | 4;
  budget: Budget;
  appliances: Appliance[];
  /** When true, fridge-dependent dishes are excluded */
  powerCutsCommon: boolean;
  mustIncludeFoodIds: string[];
  avoidFoodIds: string[];
  allergenTagsToAvoid: string[];
  /** First day of the plan, YYYY-MM-DD in Africa/Lagos */
  startDate: string;
}

export interface PlanMeal {
  slot: MealSlot;
  dishId: string;
  dishName: string;
  /** 0.75..1.5 */
  portionScale: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  prepSteps: string[];
}

export interface PlanDay {
  localDate: string;
  meals: PlanMeal[];
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface GroceryLine {
  foodId: string;
  section: GrocerySection;
  grams: number;
  /** null when the price table has no entry for this food */
  costNaira: number | null;
  /** Always 'estimate' — the UI must label every cost */
  estimateLabel: 'estimate';
}

export interface MealPlan {
  input: MealPlanInput;
  seed: number;
  days: PlanDay[];
  grocery: GroceryLine[];
  /** Sum of GroceryLine.costNaira when every line has a price; null otherwise */
  totalCostNaira: number | null;
}

export type PlanFailureReason =
  | 'no_dishes_available'
  | 'insufficient_dishes_for_variety'
  | 'cannot_meet_calorie_window'
  | 'cannot_meet_protein_range'
  | 'cannot_meet_budget'
  | 'must_include_unavailable';

export type PlanFailure =
  | { status: 'failure'; reason: PlanFailureReason; detail: string }
  | { status: 'needs_prices'; missing: string[] };