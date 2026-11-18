// src/meal-plan/prices.ts
/**
 * Price table type and loader. NO PRICES SHIPPED HERE.
 * The owner enters real market prices. Until then `emptyPriceTable()` returns
 * zero rows and `generatePlan` returns `{ status: 'needs_prices', missing }`.
 */

export interface PriceRow {
  foodId: string;
  /**
   * Naira per kilogram. Oil is entered as price per kg even though it's
   * bought by the bottle — weight-per-bottle is a dish-data constant.
   * Eggs are also priced per kg; weight-per-egg is a dish-data constant.
   */
  nairaPerKg: number;
  /** YYYY-MM-DD — the day the owner last checked this price */
  updatedAt: string;
}

export interface PriceTable {
  version: number;
  /** YYYY-MM-DD of the newest row, or 1970-01-01 for the empty table */
  updatedAt: string;
  rows: readonly PriceRow[];
}

export function emptyPriceTable(): PriceTable {
  return { version: 0, updatedAt: '1970-01-01', rows: [] };
}

/** Naira per kg, or `null` if this food has no price. Never invents a price. */
export function lookupPrice(table: PriceTable, foodId: string): number | null {
  const row = table.rows.find((r) => r.foodId === foodId);
  return row ? row.nairaPerKg : null;
}

/** Cost in naira for `grams` at `pricePerKg`. Caller rounds for display. */
export function costForGrams(pricePerKg: number, grams: number): number {
  return (grams / 1000) * pricePerKg;
}