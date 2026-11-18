// src/meal-plan/grocery.ts
import type { Dish, GroceryLine, GrocerySection, PlanMeal } from '../contracts';
import { costForGrams, lookupPrice, type PriceTable } from './prices';

/**
 * Fixed section order — matches the order a Nigerian market walk usually takes
 * and makes the rendered list deterministic.
 */
export const GROCERY_SECTION_ORDER: readonly GrocerySection[] = [
  'grains_and_tubers',
  'vegetables_and_peppers',
  'proteins',
  'oils_and_seasonings',
  'dairy_and_eggs',
  'fruit',
  'other',
];

function roundGrams(g: number): number { return Math.round(g * 10) / 10; }
function roundKobo(n: number): number { return Math.round(n * 100) / 100; }

/**
 * Aggregate every meal in the week into grocery lines. Gram totals are
 * `DishIngredient.grams * PlanMeal.portionScale`, summed across days.
 * `costNaira` is filled per line only when `prices` has that food; otherwise
 * `null`. Every line is labelled an estimate.
 *
 * Ordering: by `GROCERY_SECTION_ORDER`, then `foodId` ascending, so output is
 * deterministic for the same plan.
 *
 * A food appearing in two dishes in different sections takes the section of
 * the first dish it is seen in (in plan order). That should not happen with
 * well-formed dishes.
 */
export function aggregateGrocery(
  meals: readonly PlanMeal[],
  dishesById: ReadonlyMap<string, Dish>,
  prices: PriceTable,
): GroceryLine[] {
  const gramsByFood = new Map<string, { grams: number; section: GrocerySection }>();
  for (const meal of meals) {
    const dish = dishesById.get(meal.dishId);
    if (!dish) continue;
    for (const ing of dish.ingredients) {
      const g = ing.grams * meal.portionScale;
      const cur = gramsByFood.get(ing.foodId);
      if (cur) cur.grams += g;
      else gramsByFood.set(ing.foodId, { grams: g, section: ing.section });
    }
  }
  const lines: GroceryLine[] = [];
  for (const [foodId, { grams, section }] of gramsByFood) {
    const pricePerKg = lookupPrice(prices, foodId);
    const costNaira = pricePerKg === null ? null : roundKobo(costForGrams(pricePerKg, grams));
    lines.push({ foodId, section, grams: roundGrams(grams), costNaira, estimateLabel: 'estimate' });
  }
  lines.sort((a, b) => {
    const s = GROCERY_SECTION_ORDER.indexOf(a.section) - GROCERY_SECTION_ORDER.indexOf(b.section);
    if (s !== 0) return s;
    return a.foodId < b.foodId ? -1 : a.foodId > b.foodId ? 1 : 0;
  });
  return lines;
}

/**
 * Sum of line costs. Returns `null` if any line has no price — a partial total
 * would mislead the budget check.
 */
export function totalCostNaira(lines: readonly GroceryLine[]): number | null {
  let total = 0;
  for (const line of lines) {
    if (line.costNaira === null) return null;
    total += line.costNaira;
  }
  return roundKobo(total);
}