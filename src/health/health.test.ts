import { describe, expect, it } from 'vitest';
import {
  bmi, bmiCategory, bmr, cmToIn, cmToFeetInches, dailyTarget, deurenberg, feetInchesToCm, idealWeight,
  jacksonPollock3, katchMcArdle, kgToLb, lbToKg, navyBodyFat, tdee,
} from './index';

describe('units', () => {
  it('round-trips metric to imperial and back without drift', () => {
    for (const kg of [45.5, 70, 83.25, 120]) expect(lbToKg(kgToLb(kg))).toBeCloseTo(kg, 10);
    for (const cm of [150, 175.3, 190]) expect(feetInchesToCm(cmToFeetInches(cm).ft, cmToFeetInches(cm).inch)).toBeCloseTo(cm, 9);
    expect(cmToIn(2.54)).toBe(1);
  });
});

describe('BMI', () => {
  it('computes 70 kg at 175 cm', () => expect(bmi(70, 175)).toBeCloseTo(22.857, 3));
  it('rejects non-positive input', () => expect(() => bmi(0, 175)).toThrow());
  it.each([[18.49, 'underweight'], [18.5, 'normal'], [24.9, 'normal'], [25, 'overweight'], [29.9, 'overweight'],
    [30, 'obese_1'], [35, 'obese_2'], [40, 'obese_3']] as const)('%s is %s', (v, c) => expect(bmiCategory(v)).toBe(c));
});

describe('BMR and TDEE', () => {
  const m = { sex: 'male', weightKg: 80, heightCm: 180, ageYears: 30 } as const;
  const f = { sex: 'female', weightKg: 60, heightCm: 165, ageYears: 25 } as const;
  it('Mifflin-St Jeor', () => {
    expect(bmr(m)).toBeCloseTo(1780, 6);
    expect(bmr(f)).toBeCloseTo(1345.25, 6);
  });
  it('revised Harris-Benedict', () => expect(bmr(m, 'harris_benedict')).toBeCloseTo(1853.632, 3));
  it('Katch-McArdle', () => {
    expect(katchMcArdle(60)).toBe(1666);
    expect(bmr({ ...m, leanMassKg: 60 }, 'katch_mcardle')).toBe(1666);
    expect(() => bmr(m, 'katch_mcardle')).toThrow();
  });
  it('TDEE applies the activity factor', () => {
    expect(tdee(1780, 'sedentary')).toBeCloseTo(2136, 6);
    expect(tdee(1780, 'extra_active')).toBeCloseTo(3382, 6);
  });
});

describe('body fat', () => {
  it('US Navy, man', () => expect(navyBodyFat({ sex: 'male', heightCm: 180, neckCm: 38, waistCm: 90 })).toBeCloseTo(19.81, 1));
  it('US Navy, woman', () => expect(navyBodyFat({ sex: 'female', heightCm: 165, neckCm: 33, waistCm: 75, hipCm: 98 })).toBeCloseTo(28.44, 1));
  it('US Navy rejects waist <= neck and missing hip', () => {
    expect(() => navyBodyFat({ sex: 'male', heightCm: 180, neckCm: 40, waistCm: 40 })).toThrow();
    expect(() => navyBodyFat({ sex: 'female', heightCm: 165, neckCm: 33, waistCm: 75 })).toThrow();
  });
  it('Jackson-Pollock 3 site', () => {
    expect(jacksonPollock3({ sex: 'male', ageYears: 30, folds: [10, 20, 15] })).toBeCloseTo(13.61, 1);
    expect(jacksonPollock3({ sex: 'female', ageYears: 28, folds: [15, 20, 25] })).toBeCloseTo(24.0, 1);
  });
  it('Deurenberg', () => expect(deurenberg({ bmi: 22.857142857, ageYears: 30, sex: 'male' })).toBeCloseTo(18.13, 2));
});

describe('ideal weight', () => {
  it('man at 70 in (n = 10)', () => {
    const r = idealWeight('male', 70 * 2.54);
    expect(r.results.hamwi).toBeCloseTo(75, 6);
    expect(r.results.devine).toBeCloseTo(73, 6);
    expect(r.results.robinson).toBeCloseTo(71, 6);
    expect(r.results.miller).toBeCloseTo(70.3, 6);
    expect(r.minKg).toBeCloseTo(70.3, 6);
    expect(r.maxKg).toBeCloseTo(75, 6);
  });
  it('woman at 65 in (n = 5)', () => {
    const r = idealWeight('female', 65 * 2.54);
    expect(r.results.hamwi).toBeCloseTo(56.5, 6);
    expect(r.results.miller).toBeCloseTo(59.9, 6);
  });
  it('flags below five feet', () => expect(idealWeight('female', 150).belowFiveFeet).toBe(true));
});

describe('daily target and safety', () => {
  const adult = { sex: 'male', ageYears: 30, weightKg: 80, heightCm: 180, activity: 'moderate' } as const;
  it('maintain equals TDEE', () => {
    const t = dailyTarget({ ...adult, goal: 'maintain' });
    expect(t.status).toBe('ok');
    expect(t.kcal).toBe(Math.round(1780 * 1.55));
  });
  it('lose applies the default 15 percent cut', () => {
    const t = dailyTarget({ ...adult, goal: 'lose' });
    expect(t.status).toBe('ok');
    expect(t.kcal).toBe(Math.round(1780 * 1.55 * 0.85));
  });
  it('lose is clamped to 20 percent even if asked for more', () => {
    const t = dailyTarget({ ...adult, goal: 'lose', adjustment: 0.5 });
    expect(t.kcal).toBe(Math.round(1780 * 1.55 * 0.8));
  });
  it('never goes below the floor', () => {
    const t = dailyTarget({ sex: 'female', ageYears: 60, weightKg: 52, heightCm: 158, activity: 'sedentary', goal: 'lose' });
    expect(t.kcal).toBeGreaterThanOrEqual(1200);
  });
  it('caps weekly loss at 1 percent of body weight', () => {
    const t = dailyTarget({ ...adult, activity: 'extra_active', goal: 'lose', adjustment: 0.2 });
    const dailyDeficit = t.tdee - t.kcal;
    expect(dailyDeficit).toBeLessThanOrEqual((80 * 0.01 * 7700) / 7 + 1);
  });
  it('gain adds 10 percent and uses 1.8 g/kg protein', () => {
    const t = dailyTarget({ ...adult, goal: 'gain' });
    expect(t.kcal).toBe(Math.round(1780 * 1.55 * 1.1));
    expect(t.macros.protein.target).toBeCloseTo(144, 6);
  });
  it('macros add up to the calorie target', () => {
    const t = dailyTarget({ ...adult, goal: 'maintain' });
    const kcal = t.macros.protein.target * 4 + t.macros.carbs.target * 4 + t.macros.fat.target * 9;
    expect(kcal).toBeCloseTo(t.tdee, 6);
    expect(t.macros.protein.min).toBeLessThan(t.macros.protein.target);
  });
  it.each([
    ['under 18', { ageYears: 16 }, 'under_18'],
    ['pregnant or breastfeeding', { pregnantOrBreastfeeding: true }, 'pregnant_or_breastfeeding'],
    ['BMI under 18.5 choosing lose', { weightKg: 50 }, 'bmi_under_18_5'],
  ] as const)('refers on %s: maintenance only, no deficit', (_n, patch, reason) => {
    const t = dailyTarget({ ...adult, goal: 'lose', ...patch });
    expect(t.status).toBe('maintenance_only');
    if (t.status === 'maintenance_only') {
      expect(t.reason).toBe(reason);
      expect(t.kcal).toBe(Math.round(t.tdee));
    }
  });
  it('BMI under 18.5 may still choose gain', () => {
    expect(dailyTarget({ ...adult, weightKg: 50, goal: 'gain' }).status).toBe('ok');
  });
  it('uses Katch-McArdle when body fat is known', () => {
    const t = dailyTarget({ ...adult, goal: 'maintain', bodyFatPct: 25 });
    expect(t.tdee).toBeCloseTo((370 + 21.6 * 60) * 1.55, 6);
  });
});
