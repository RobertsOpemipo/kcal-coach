// src/meal-plan/prices.test.ts
import { describe, it, expect } from 'vitest';
import { emptyPriceTable, lookupPrice, costForGrams, type PriceTable } from './prices';

describe('price table', () => {
  it('emptyPriceTable has version 0, epoch date and no rows', () => {
    const t = emptyPriceTable();
    expect(t.version).toBe(0);
    expect(t.updatedAt).toBe('1970-01-01');
    expect(t.rows.length).toBe(0);
  });

  it('lookupPrice returns null for an empty table (never invents a price)', () => {
    expect(lookupPrice(emptyPriceTable(), 'rice')).toBeNull();
  });

  it('lookupPrice finds by foodId', () => {
    const table: PriceTable = {
      version: 1,
      updatedAt: '2026-11-01',
      rows: [
        { foodId: 'rice', nairaPerKg: 1200, updatedAt: '2026-11-01' },
        { foodId: 'beans', nairaPerKg: 2500, updatedAt: '2026-11-01' },
      ],
    };
    expect(lookupPrice(table, 'rice')).toBe(1200);
    expect(lookupPrice(table, 'beans')).toBe(2500);
    expect(lookupPrice(table, 'yam')).toBeNull();
  });
});

describe('costForGrams', () => {
  it('500 g at 1000 NGN/kg = 500 NGN', () => {
    expect(costForGrams(1000, 500)).toBeCloseTo(500, 6);
  });
  it('250 g at 2400 NGN/kg = 600 NGN', () => {
    expect(costForGrams(2400, 250)).toBeCloseTo(600, 6);
  });
  it('0 g = 0 NGN', () => {
    expect(costForGrams(2400, 0)).toBe(0);
  });
});