// src/meal-plan/generate.ts
import type {
  Appliance, DailyTarget, Dish, MealPlan, MealPlanInput, MealSlot, PlanDay,
  PlanFailure, PlanFailureReason, PlanMeal,
} from '../contracts';
import { aggregateGrocery, totalCostNaira } from './grocery';
import { lookupPrice, type PriceTable } from './prices';
import { mulberry32 } from './prng';
import {
  BUDGET_TIER_NAIRA_PER_WEEK,
  CALORIE_WINDOW_TOLERANCE,
  MAX_DISH_REPEATS_PER_WEEK,
  PORTION_SCALE_MAX,
  PORTION_SCALE_MIN,
} from './config/needs-review';

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = a[i]!;
    a[i] = a[j]!;
    a[j] = tmp;
  }
  return a;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function slotsFor(input: MealPlanInput): MealSlot[] {
  return input.mealsPerDay === 4
    ? ['breakfast', 'lunch', 'dinner', 'snack']
    : ['breakfast', 'lunch', 'dinner'];
}

function fail(reason: PlanFailureReason, detail: string): PlanFailure {
  return { status: 'failure', reason, detail };
}

function hardFilterDishes(input: MealPlanInput, dishes: readonly Dish[]): Dish[] {
  const avoidSet = new Set(input.avoidFoodIds);
  const allergenSet = new Set(input.allergenTagsToAvoid);
  const appliancesSet = new Set<Appliance>(input.appliances);
  return dishes.filter((d) => {
    for (const tag of d.allergenTags) if (allergenSet.has(tag)) return false;
    for (const ing of d.ingredients) if (avoidSet.has(ing.foodId)) return false;
    for (const app of d.requiredAppliances) if (!appliancesSet.has(app)) return false;
    if (input.powerCutsCommon && d.fridgeDependent) return false;
    return true;
  });
}

type BudgetResolution =
  | { kind: 'amount'; naira: number }
  | { kind: 'tier_missing' };

function resolveBudgetNaira(input: MealPlanInput): BudgetResolution {
  if (input.budget.kind === 'amount') return { kind: 'amount', naira: input.budget.naira };
  const v = BUDGET_TIER_NAIRA_PER_WEEK[input.budget.tier];
  if (v === null) return { kind: 'tier_missing' };
  return { kind: 'amount', naira: v };
}

/** Combined lower/upper kcal bounds given target + floor. */
function kcalBounds(target: DailyTarget, kcalFloor: number): { lo: number; hi: number } {
  const lo = Math.max(target.kcal * (1 - CALORIE_WINDOW_TOLERANCE), kcalFloor);
  const hi = target.kcal * (1 + CALORIE_WINDOW_TOLERANCE);
  return { lo, hi };
}

type ScaleSolution =
  | { ok: true; scale: number }
  | { ok: false; reason: PlanFailureReason; detail: string };

/**
 * D22: enforce protein LOWER bound only. No upper bound on protein. Kcal
 * window and kcal floor remain strict.
 */
function solveDayScale(baseKcal: number, baseProt: number, input: MealPlanInput): ScaleSolution {
  if (!(baseKcal > 0) || !(baseProt > 0)) {
    return { ok: false, reason: 'cannot_meet_calorie_window', detail: 'base kcal or protein is zero' };
  }
  const { lo: kcalLo, hi: kcalHi } = kcalBounds(input.target, input.kcalFloor);
  const protLo = input.target.macros.protein.min;

  const sKcalLo = kcalLo / baseKcal;
  const sKcalHi = kcalHi / baseKcal;
  const sProtLo = protLo / baseProt;

  // Effective scale range from the kcal window alone.
  const effLo = Math.max(PORTION_SCALE_MIN, sKcalLo);
  const effHi = Math.min(PORTION_SCALE_MAX, sKcalHi);

  if (effLo > effHi) {
    return {
      ok: false,
      reason: 'cannot_meet_calorie_window',
      detail: `base ${baseKcal.toFixed(0)} kcal cannot reach [${kcalLo.toFixed(0)}, ${kcalHi.toFixed(0)}] at any portion in [${PORTION_SCALE_MIN}, ${PORTION_SCALE_MAX}]`,
    };
  }
  if (sProtLo > effHi) {
    return {
      ok: false,
      reason: 'cannot_meet_protein_range',
      detail: `base ${baseProt.toFixed(1)} g protein cannot reach ${protLo.toFixed(1)} g at max portion (scale ${effHi.toFixed(2)})`,
    };
  }
  const sLo = Math.max(effLo, sProtLo);
  const scale = Math.min(effHi, Math.max(sLo, 1.0));
  return { ok: true, scale };
}

/** Pick a day's dishes greedily by protein density, respecting repeat limits. */
function pickDayProteinBiased(
  slots: MealSlot[],
  bySlot: ReadonlyMap<MealSlot, Dish[]>,
  countById: ReadonlyMap<string, number>,
  input: MealPlanInput,
): Dish[] | null {
  const picked: Dish[] = [];
  const localCounts = new Map(countById);
  for (const slot of slots) {
    const pool = [...bySlot.get(slot)!].sort((a, b) => (b.proteinG / b.kcal) - (a.proteinG / a.kcal));
    let chosen: Dish | null = null;
    for (const cand of pool) {
      const wouldCount = (localCounts.get(cand.id) ?? 0) + 1;
      if (!cand.batchCook && wouldCount > MAX_DISH_REPEATS_PER_WEEK) continue;
      chosen = cand;
      break;
    }
    if (!chosen) return null;
    picked.push(chosen);
    localCounts.set(chosen.id, (localCounts.get(chosen.id) ?? 0) + 1);
  }
  const tK = picked.reduce((a, d) => a + d.kcal, 0);
  const tP = picked.reduce((a, d) => a + d.proteinG, 0);
  if (!solveDayScale(tK, tP, input).ok) return null;
  return picked;
}

export function generatePlan(
  input: MealPlanInput,
  dishes: readonly Dish[],
  prices: PriceTable,
  seed: number,
): MealPlan | PlanFailure {
  const rng = mulberry32(seed);

  // 1. Hard filters.
  const pool = hardFilterDishes(input, dishes);
  if (pool.length === 0) return fail('no_dishes_available', 'every dish was removed by a hard filter');

  const slots = slotsFor(input);
  const bySlot = new Map<MealSlot, Dish[]>();
  for (const slot of slots) {
    const fitting = pool.filter((d) => d.mealSlots.includes(slot));
    if (fitting.length === 0) return fail('no_dishes_available', `no dish fits slot ${slot}`);
    bySlot.set(slot, fitting);
  }

  // 2. Must-include: each must appear in some dish in the pool.
  for (const foodId of input.mustIncludeFoodIds) {
    const found = pool.some((d) => d.ingredients.some((i) => i.foodId === foodId));
    if (!found) return fail('must_include_unavailable', `no dish in the filtered pool contains ${foodId}`);
  }

  // 3. Budget resolution.
  const budget = resolveBudgetNaira(input);
  if (budget.kind === 'tier_missing') {
    return fail('cannot_meet_budget', 'budget tier is not configured; enter a naira amount or set BUDGET_TIER_NAIRA_PER_WEEK');
  }

  // 4. Prices pre-flight.
  const neededFoodIds = new Set<string>();
  for (const d of pool) for (const ing of d.ingredients) neededFoodIds.add(ing.foodId);
  const missing = [...neededFoodIds].filter((id) => lookupPrice(prices, id) === null).sort();
  if (missing.length > 0) return { status: 'needs_prices', missing };

  // 5. Pre-assign must-includes in deterministic order to earliest free slot.
  const skeleton: (Dish | null)[][] = Array.from({ length: 7 }, () => slots.map(() => null));
  const countById = new Map<string, number>();
  const canUse = (d: Dish) => d.batchCook || (countById.get(d.id) ?? 0) < MAX_DISH_REPEATS_PER_WEEK;
  const incCount = (id: string) => countById.set(id, (countById.get(id) ?? 0) + 1);

  for (const foodId of [...input.mustIncludeFoodIds].sort()) {
    const candidates = pool.filter((d) => d.ingredients.some((i) => i.foodId === foodId));
    let assigned = false;
    outer: for (let day = 0; day < 7; day++) {
      for (let s = 0; s < slots.length; s++) {
        const slot = slots[s]!;
        if (skeleton[day]![s] !== null) continue;
        const fitting = candidates.filter((d) => d.mealSlots.includes(slot) && canUse(d));
        if (fitting.length === 0) continue;
        const pick = shuffle(fitting, rng)[0]!;
        skeleton[day]![s] = pick;
        incCount(pick.id);
        assigned = true;
        break outer;
      }
    }
    if (!assigned) return fail('must_include_unavailable', `could not fit a dish containing ${foodId} into the week`);
  }

  // 6. Round-robin fill remaining slots.
  const shuffledBySlot = new Map<MealSlot, Dish[]>();
  const cursorBySlot = new Map<MealSlot, number>();
  for (const slot of slots) {
    shuffledBySlot.set(slot, shuffle(bySlot.get(slot)!, rng));
    cursorBySlot.set(slot, 0);
  }
  for (let day = 0; day < 7; day++) {
    for (let s = 0; s < slots.length; s++) {
      const slot = slots[s]!;
      if (skeleton[day]![s] !== null) continue;
      const poolForSlot = shuffledBySlot.get(slot)!;
      const start = cursorBySlot.get(slot)!;
      let chosen: Dish | null = null;
      let nextCursor = start;
      for (let attempt = 0; attempt < poolForSlot.length * 2; attempt++) {
        const d = poolForSlot[(start + attempt) % poolForSlot.length]!;
        if (canUse(d)) { chosen = d; nextCursor = (start + attempt + 1) % poolForSlot.length; break; }
      }
      if (!chosen) {
        return fail('insufficient_dishes_for_variety',
          `no dish for slot ${slot} under the ${MAX_DISH_REPEATS_PER_WEEK}x-per-week cap; add more dishes or mark one batchCook`);
      }
      skeleton[day]![s] = chosen;
      incCount(chosen.id);
      cursorBySlot.set(slot, nextCursor);
    }
  }

  // 6b. Repair any day that cannot be scaled to satisfy kcal + protein-lower.
  for (let day = 0; day < 7; day++) {
    const ds = skeleton[day]!.map((d) => d!);
    const tKcal = ds.reduce((a, d) => a + d.kcal, 0);
    const tProt = ds.reduce((a, d) => a + d.proteinG, 0);
    if (solveDayScale(tKcal, tProt, input).ok) continue;

    // (i) Single swap — try the weakest-density dish first, replace with
    // the highest-density alternative from the same slot.
    const byDensity = ds
      .map((d, i) => ({ i, density: d.proteinG / d.kcal }))
      .sort((a, b) => a.density - b.density);
    let repaired = false;
    for (const { i: slotIdx } of byDensity) {
      const slot = slots[slotIdx]!;
      const slotPool = bySlot.get(slot)!;
      const sorted = [...slotPool].sort((a, b) => (b.proteinG / b.kcal) - (a.proteinG / a.kcal));
      for (const cand of sorted) {
        if (cand.id === ds[slotIdx]!.id) continue;
        const wouldCount = (countById.get(cand.id) ?? 0) + 1;
        if (!cand.batchCook && wouldCount > MAX_DISH_REPEATS_PER_WEEK) continue;
        const trial = ds.slice();
        trial[slotIdx] = cand;
        const tK = trial.reduce((a, d) => a + d.kcal, 0);
        const tP = trial.reduce((a, d) => a + d.proteinG, 0);
        if (solveDayScale(tK, tP, input).ok) {
          countById.set(ds[slotIdx]!.id, (countById.get(ds[slotIdx]!.id) ?? 0) - 1);
          countById.set(cand.id, wouldCount);
          skeleton[day]![slotIdx] = cand;
          repaired = true;
          break;
        }
      }
      if (repaired) break;
    }
    if (repaired) continue;

    // (ii) Full-day re-pick with protein bias.
    for (const d of ds) countById.set(d.id, (countById.get(d.id) ?? 0) - 1);
    const newPick = pickDayProteinBiased(slots, bySlot, countById, input);
    if (!newPick) {
      for (const d of ds) countById.set(d.id, (countById.get(d.id) ?? 0) + 1);
      return fail('cannot_meet_protein_range', `day ${day + 1}: no feasible dish combination found`);
    }
    for (let s = 0; s < slots.length; s++) {
      const d = newPick[s]!;
      skeleton[day]![s] = d;
      countById.set(d.id, (countById.get(d.id) ?? 0) + 1);
    }
  }

  // 7. Build days with a day-level uniform scale.
  const days: PlanDay[] = [];
  const allMeals: PlanMeal[] = [];
  for (let day = 0; day < 7; day++) {
    const dayDishes = slots.map((_, s) => skeleton[day]![s]!);
    let baseKcal = 0, baseProt = 0;
    for (const d of dayDishes) { baseKcal += d.kcal; baseProt += d.proteinG; }
    const solved = solveDayScale(baseKcal, baseProt, input);
    if (!solved.ok) return fail(solved.reason, `day ${day + 1}: ${solved.detail}`);
    const scale = solved.scale;
    const meals: PlanMeal[] = dayDishes.map((d, s) => ({
      slot: slots[s]!,
      dishId: d.id,
      dishName: d.name,
      portionScale: scale,
      kcal: d.kcal * scale,
      proteinG: d.proteinG * scale,
      carbsG: d.carbsG * scale,
      fatG: d.fatG * scale,
      prepSteps: d.prepSteps.slice(),
    }));
    const kcal = meals.reduce((s, m) => s + m.kcal, 0);
    const proteinG = meals.reduce((s, m) => s + m.proteinG, 0);
    const carbsG = meals.reduce((s, m) => s + m.carbsG, 0);
    const fatG = meals.reduce((s, m) => s + m.fatG, 0);
    days.push({ localDate: addDays(input.startDate, day), meals, kcal, proteinG, carbsG, fatG });
    allMeals.push(...meals);
  }

  // 8. Grocery + cost.
  const dishesById = new Map<string, Dish>(pool.map((d) => [d.id, d]));
  const grocery = aggregateGrocery(allMeals, dishesById, prices);
  const totalNaira = totalCostNaira(grocery);

  if (totalNaira !== null && totalNaira > budget.naira) {
    return fail('cannot_meet_budget',
      `estimated ${totalNaira.toFixed(0)} NGN for the week exceeds budget ${budget.naira.toFixed(0)} NGN`);
  }

  const plan: MealPlan = { input, seed, days, grocery, totalCostNaira: totalNaira };

  // 9. Independent validation.
  const v = validatePlan(plan, dishes, prices);
  if (v) return v;
  return plan;
}

/**
 * Rechecks every rule against a plan. D22: protein LOWER bound only; kcal
 * window and kcal floor still strict. Recomputes everything from the plan's
 * meals + dishes + prices.
 */
export function validatePlan(
  plan: MealPlan,
  dishes: readonly Dish[],
  prices: PriceTable,
): PlanFailure | null {
  const input = plan.input;
  const slots = slotsFor(input);
  const dishesById = new Map<string, Dish>(dishes.map((d) => [d.id, d]));
  const allergenSet = new Set(input.allergenTagsToAvoid);
  const avoidSet = new Set(input.avoidFoodIds);
  const appliancesSet = new Set<Appliance>(input.appliances);
  const { lo: kcalLo, hi: kcalHi } = kcalBounds(input.target, input.kcalFloor);
  const protLo = input.target.macros.protein.min;

  if (plan.days.length !== 7) {
    return fail('cannot_meet_calorie_window', `plan has ${plan.days.length} days, expected 7`);
  }

  const useCount = new Map<string, number>();
  const coveredFoods = new Set<string>();

  for (const day of plan.days) {
    if (day.meals.length !== slots.length) {
      return fail('cannot_meet_calorie_window', `day ${day.localDate} has ${day.meals.length} meals, expected ${slots.length}`);
    }
    for (let i = 0; i < slots.length; i++) {
      if (day.meals[i]!.slot !== slots[i]) {
        return fail('cannot_meet_calorie_window', `day ${day.localDate} meal ${i} slot is ${day.meals[i]!.slot}, expected ${slots[i]}`);
      }
    }

    let dayKcal = 0, dayProt = 0, dayCarbs = 0, dayFat = 0;
    for (const meal of day.meals) {
      const d = dishesById.get(meal.dishId);
      if (!d) return fail('no_dishes_available', `day ${day.localDate} references unknown dish ${meal.dishId}`);
      if (!d.mealSlots.includes(meal.slot)) {
        return fail('cannot_meet_calorie_window', `dish ${d.id} does not fit slot ${meal.slot}`);
      }
      if (meal.portionScale < PORTION_SCALE_MIN || meal.portionScale > PORTION_SCALE_MAX) {
        return fail('cannot_meet_calorie_window', `dish ${d.id} portion ${meal.portionScale.toFixed(2)} outside [${PORTION_SCALE_MIN}, ${PORTION_SCALE_MAX}]`);
      }
      if (Math.abs(meal.kcal - d.kcal * meal.portionScale) > 1e-6) {
        return fail('cannot_meet_calorie_window', `dish ${d.id} meal kcal inconsistent with stored portionScale`);
      }
      for (const tag of d.allergenTags) {
        if (allergenSet.has(tag)) return fail('no_dishes_available', `dish ${d.id} has forbidden allergen ${tag}`);
      }
      for (const ing of d.ingredients) {
        if (avoidSet.has(ing.foodId)) return fail('no_dishes_available', `dish ${d.id} contains avoided ${ing.foodId}`);
        coveredFoods.add(ing.foodId);
      }
      for (const app of d.requiredAppliances) {
        if (!appliancesSet.has(app)) return fail('no_dishes_available', `dish ${d.id} needs ${app}`);
      }
      if (input.powerCutsCommon && d.fridgeDependent) {
        return fail('no_dishes_available', `dish ${d.id} is fridge-dependent and power cuts are common`);
      }
      dayKcal += d.kcal * meal.portionScale;
      dayProt += d.proteinG * meal.portionScale;
      dayCarbs += d.carbsG * meal.portionScale;
      dayFat += d.fatG * meal.portionScale;
      useCount.set(meal.dishId, (useCount.get(meal.dishId) ?? 0) + 1);
    }

    if (dayKcal < kcalLo || dayKcal > kcalHi) {
      return fail('cannot_meet_calorie_window', `day ${day.localDate} kcal ${dayKcal.toFixed(0)} outside [${kcalLo.toFixed(0)}, ${kcalHi.toFixed(0)}]`);
    }
    // D22: only the LOWER protein bound is enforced.
    if (dayProt < protLo) {
      return fail('cannot_meet_protein_range', `day ${day.localDate} protein ${dayProt.toFixed(1)} g below min ${protLo}`);
    }
    if (Math.abs(day.kcal - dayKcal) > 0.01
      || Math.abs(day.proteinG - dayProt) > 0.01
      || Math.abs(day.carbsG - dayCarbs) > 0.01
      || Math.abs(day.fatG - dayFat) > 0.01) {
      return fail('cannot_meet_calorie_window', `day ${day.localDate} stored totals disagree with recomputed totals`);
    }
  }

  for (const foodId of input.mustIncludeFoodIds) {
    if (!coveredFoods.has(foodId)) return fail('must_include_unavailable', `must-include food ${foodId} is not present in the plan`);
  }

  for (const [dishId, count] of useCount) {
    const d = dishesById.get(dishId);
    if (!d) continue;
    if (count > MAX_DISH_REPEATS_PER_WEEK && !d.batchCook) {
      return fail('insufficient_dishes_for_variety', `dish ${dishId} used ${count} times, cap is ${MAX_DISH_REPEATS_PER_WEEK} (not batchCook)`);
    }
  }

  const budget = resolveBudgetNaira(input);
  if (budget.kind === 'tier_missing') return fail('cannot_meet_budget', 'budget tier is not configured');

  const allMeals: PlanMeal[] = [];
  for (const day of plan.days) allMeals.push(...day.meals);
  const grocery = aggregateGrocery(allMeals, dishesById, prices);
  const total = totalCostNaira(grocery);
  if (total === null) {
    const missingIds = [...new Set(grocery.filter((g) => g.costNaira === null).map((g) => g.foodId))].sort();
    return { status: 'needs_prices', missing: missingIds };
  }
  if (total > budget.naira) {
    return fail('cannot_meet_budget', `recomputed total ${total.toFixed(0)} NGN exceeds budget ${budget.naira.toFixed(0)} NGN`);
  }

  return null;
}