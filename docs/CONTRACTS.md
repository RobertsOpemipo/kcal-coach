# Contracts

Source: `src/contracts/index.ts`. Types only. Add a line here for every change.

| Date | Change | By |
|---|---|---|
| 2026-11-12 | Initial: Sex, ActivityLevel, GoalKind, MealSlot, EntrySource, BmrMethod, MacroRange, Macros, DailyTarget, LogEntry | Claude |
| 2026-11-17 | `logRepo.update(id, { grams?, meal? })` added | DeepSeek |
| 2026-11-17 | `WeightEntry`, `WeightPoint`, `WeightTrendSummary` added | DeepSeek |
| 2026-11-17 | T3 meal plan types: GrocerySection, Appliance, DishIngredient, Dish, Budget, MealPlanInput, PlanMeal, PlanDay, GroceryLine, MealPlan, PlanFailureReason, PlanFailure | DeepSeek |
| 2026-11-17 | T3 revision: `MealPlanInput` now takes `target: DailyTarget` and `kcalFloor`; `isPlanFailure` moved out of contracts into `src/meal-plan/types.ts` | DeepSeek |

## Public surfaces other code may rely on
- `src/health`: `bmi`, `bmiCategory`, `bmr`, `tdee`, `navyBodyFat`, `jacksonPollock3`, `deurenberg`, `idealWeight`, `dailyTarget`, unit converters.
- `src/db`: `getDb()` (device), `migrate`, `createLogRepo(db)`. Add new tables only by appending a migration.
- `src/theme`: `useTheme()` returns `{ mode, c }`; tokens, `radius`, `space`, `fontFamily`.

## Phase 1 changes (2026-11-13)
- Added to `src/contracts/index.ts`: Units, Profile, Food, WaterEntry, MacroProgress, DaySummary.
- New public surfaces: `repos()` (`src/db/app.ts`) returning `{ db, food, log, water, profile }`; `useQuery(read, key)`; `searchFoods`, `nutrientsFor`, `parsePositive`, `defaultMeal`, `asMeal` (`src/food`); `targetForProfile`, `summariseDay`, `parseBody` (`src/health`); `addDays`, `dayLabel`, `lagosHour` (`src/db/localDate.ts`).
- Log repo gained `logAgain`, `copyDay`, `recent`. Repo factories take an optional `onChange` callback.
- DB schema version is now 2.

## Phase 2 additions (2026-11-13)
- Scan model contract (single source: `src/scan/contract.ts`): input float32 [1,224,224,3] raw 0..255 RGB, output float32 [1,N] probabilities in `manifest.classIds` order. Preprocessing lives inside the model.
- `assets/model/manifest.json`: `{ modelVersion, isPlaceholder, inputSize, classIds, metrics? }`. Class ids are food ids from `src/food/seed.ts`.
- `src/scan`: `scanPhoto(uri) -> ScanOutcome`, `isEngineAvailable()`, `topK`, `describeConfidence`, `isNotSure`.
- New route `/scan` (params: `meal`, `date`).

## Phase 3 — log entry edit (2026-11-17)

`logRepo.update(id, patch)` accepts `{ grams?, meal? }` and returns the updated `LogEntry` or `null`.

- **Grams rescale:** `factor = newGrams / currentGrams`, applied to the entry's *current* `kcal`, `proteinG`, `carbsG`, `fatG`. Repeated calls compound (each call reads the entry's then-current grams).
- **Meal change:** replaces `meal` only; grams and macros are untouched.
- **Empty patch (`{}`):** returns the current entry unchanged (or `null` if missing or tombstoned); writes nothing, does not bump `updated_at`, does not fire `onChange`.
- **Refusals (return `null`, write nothing, no `onChange`):** unknown id, tombstoned id, `grams <= 0`, `grams` is `NaN`, current `grams` is 0 (cannot divide).
- **On success:** bumps `updated_at`, writes an `upsert` row to `outbox` in the same transaction, fires `onChange` once.

## Phase 3 — weight history and trend (2026-11-17)

- Added to `src/contracts/index.ts`: `WeightEntry`, `WeightPoint`, `WeightTrendSummary`.
- `src/health/weightTrend`: `movingAverage`, `weeklyChangeKg`, `trendSummary`, plus `MOVING_AVERAGE_WINDOW_DAYS`, `WEEKLY_CHANGE_WINDOW_DAYS`, `MIN_POINTS_FOR_WEEKLY_CHANGE`. Exposed via `src/health/index.ts` barrel.
- `src/db/weightRepo`: `createWeightRepo(db, now?, onChange?)` returning `{ get, add, remove, list, latest }`.
- `weightRepo.add` and `profileRepo.save(profile, weightKg)` write identical outbox payload shapes for `weight_entry` (full `WeightEntry`, per D20).

## Phase 3 — meal plan (2026-11-17)

- Added to `src/contracts/index.ts`: `GrocerySection`, `Appliance`, `DishIngredient`, `Dish`, `Budget`, `MealPlanInput` (with `target: DailyTarget` and `kcalFloor: number`), `PlanMeal`, `PlanDay`, `GroceryLine`, `MealPlan`, `PlanFailureReason`, `PlanFailure`.
- `src/meal-plan/types`: `isPlanFailure` (type guard — moved here from contracts so contracts stays types-only).
- `src/meal-plan/config/needs-review`: `BUDGET_TIER_NAIRA_PER_WEEK` (all null; owner to fill), `CALORIE_WINDOW_TOLERANCE` (0.05, BRD), `PORTION_SCALE_MIN` (0.75), `PORTION_SCALE_MAX` (1.5), `MAX_DISH_REPEATS_PER_WEEK` (2).
- `src/meal-plan/prng`: `mulberry32(seed)`.
- `src/meal-plan/prices`: `PriceRow`, `PriceTable`, `emptyPriceTable`, `lookupPrice`, `costForGrams`.
- `src/meal-plan/grocery`: `GROCERY_SECTION_ORDER`, `aggregateGrocery(meals, dishesById, prices)`, `totalCostNaira(lines)`.
- `src/meal-plan/generate`: `generatePlan(input, dishes, prices, seed) -> MealPlan | PlanFailure`, `validatePlan(plan, dishes, prices) -> PlanFailure | null`.
| 2026-11-17 | D22: protein is a lower-bound-only constraint; no contract change, behavioural change in `generatePlan`/`validatePlan` | DeepSeek |