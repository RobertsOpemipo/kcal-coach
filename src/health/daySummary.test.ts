import { describe, expect, it } from 'vitest';
import { dailyTarget } from './goals';
import { summariseDay } from './daySummary';

const t = dailyTarget({ sex: 'male', ageYears: 30, weightKg: 80, heightCm: 180, activity: 'moderate', goal: 'maintain' });
if (t.status !== 'ok') throw new Error('setup');

describe('summariseDay', () => {
  it('under target', () => {
    const s = summariseDay(t.kcal, t.macros, { kcal: 1000, proteinG: 60, carbsG: 120, fatG: 30 });
    expect(s.remainingKcal).toBe(t.kcal - 1000);
    expect(s.overKcal).toBe(0);
    expect(s.fraction).toBeCloseTo(1000 / t.kcal, 6);
    expect(s.protein.fraction).toBeCloseTo(60 / t.macros.protein.target, 6);
  });
  it('over target: remaining stays 0, over is positive, fractions are capped', () => {
    const s = summariseDay(2000, t.macros, { kcal: 2300, proteinG: 999, carbsG: 0, fatG: 0 });
    expect(s.remainingKcal).toBe(0);
    expect(s.overKcal).toBe(300);
    expect(s.fraction).toBe(1);
    expect(s.protein.fraction).toBe(1);
  });
  it('empty day', () => {
    const s = summariseDay(2000, t.macros, { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
    expect(s.remainingKcal).toBe(2000);
    expect(s.fraction).toBe(0);
  });
});
