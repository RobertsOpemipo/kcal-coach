import type { ActivityLevel, DailyTarget, GoalKind, Macros, Sex } from '../contracts';
import { GOAL_CONFIG as G } from './config/needs-review';
import { bmi as calcBmi } from './bmi';
import { bmr as calcBmr, tdee as calcTdee } from './bmr';
import { leanMassKg } from './bodyFat';

export interface GoalInput {
  sex: Sex;
  ageYears: number;
  weightKg: number;
  heightCm: number;
  activity: ActivityLevel;
  goal: GoalKind;
  pregnantOrBreastfeeding?: boolean;
  bodyFatPct?: number;
  /** Fraction of TDEE to cut (lose) or add (gain). Clamped to the allowed range. */
  adjustment?: number;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function macrosFor(kcal: number, weightKg: number, goal: GoalKind): Macros {
  const proteinG = (goal === 'gain' ? G.proteinGPerKg.gain : G.proteinGPerKg.default) * weightKg;
  const fatG = (kcal * G.fatShareOfKcal) / G.kcalPerG.fat;
  const carbsG = Math.max(0, (kcal - proteinG * G.kcalPerG.protein - fatG * G.kcalPerG.fat) / G.kcalPerG.carbs);
  const r = (t: number) => ({ min: t * (1 - G.macroRange), target: t, max: t * (1 + G.macroRange) });
  return { protein: r(proteinG), fat: r(fatG), carbs: r(carbsG) };
}

export function dailyTarget(i: GoalInput): DailyTarget {
  const bmiValue = calcBmi(i.weightKg, i.heightCm);
  const base = {
    sex: i.sex, weightKg: i.weightKg, heightCm: i.heightCm, ageYears: i.ageYears,
    ...(i.bodyFatPct !== undefined ? { leanMassKg: leanMassKg(i.weightKg, i.bodyFatPct) } : {}),
  };
  const method = i.bodyFatPct !== undefined ? 'katch_mcardle' : 'mifflin';
  const tdee = calcTdee(calcBmr(base, method), i.activity);
  const notes = ['Estimates, not medical advice.'];

  const maintenance = (reason: 'under_18' | 'pregnant_or_breastfeeding' | 'bmi_under_18_5'): DailyTarget => ({
    status: 'maintenance_only',
    reason,
    kcal: Math.round(tdee),
    tdee,
    macros: macrosFor(tdee, i.weightKg, 'maintain'),
    notes: [...notes, 'Please speak to a clinician about a weight goal.'],
  });

  if (i.ageYears < G.minAdultAge) return maintenance('under_18');
  if (i.pregnantOrBreastfeeding) return maintenance('pregnant_or_breastfeeding');
  if (i.goal === 'lose' && bmiValue < G.bmiReferBelow) return maintenance('bmi_under_18_5');

  let kcal = tdee;
  if (i.goal === 'lose') {
    const cut = clamp(i.adjustment ?? G.loseDeficitDefault, G.loseDeficitMin, G.loseDeficitMax);
    const maxDailyDeficit = (i.weightKg * G.maxWeeklyLossFraction * G.kcalPerKg) / 7;
    kcal = tdee - Math.min(tdee * cut, maxDailyDeficit);
    const floor = G.floorKcal[i.sex];
    if (kcal < floor) {
      kcal = floor;
      notes.push(`Raised to the ${floor} kcal minimum for unsupervised dieting.`);
    }
  } else if (i.goal === 'gain') {
    kcal = tdee * (1 + clamp(i.adjustment ?? G.gainSurplusDefault, G.gainSurplusMin, G.gainSurplusMax));
  }

  return { status: 'ok', kcal: Math.round(kcal), tdee, macros: macrosFor(kcal, i.weightKg, i.goal), notes };
}
