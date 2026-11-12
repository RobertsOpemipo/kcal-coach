import type { ActivityLevel, BmrMethod, Sex } from '../contracts';
import { ACTIVITY_FACTORS } from './config/needs-review';

export interface BmrInput {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  ageYears: number;
  /** Lean body mass in kg, required for Katch-McArdle. */
  leanMassKg?: number;
}

export const mifflinStJeor = ({ sex, weightKg: w, heightCm: h, ageYears: a }: BmrInput) =>
  10 * w + 6.25 * h - 5 * a + (sex === 'male' ? 5 : -161);

export const harrisBenedictRevised = ({ sex, weightKg: w, heightCm: h, ageYears: a }: BmrInput) =>
  sex === 'male'
    ? 88.362 + 13.397 * w + 4.799 * h - 5.677 * a
    : 447.593 + 9.247 * w + 3.098 * h - 4.33 * a;

export const katchMcArdle = (leanMassKg: number) => 370 + 21.6 * leanMassKg;

export function bmr(input: BmrInput, method: BmrMethod = 'mifflin'): number {
  if (method === 'harris_benedict') return harrisBenedictRevised(input);
  if (method === 'katch_mcardle') {
    if (input.leanMassKg === undefined) throw new Error('Katch-McArdle needs leanMassKg');
    return katchMcArdle(input.leanMassKg);
  }
  return mifflinStJeor(input);
}

export const tdee = (bmrValue: number, activity: ActivityLevel) => bmrValue * ACTIVITY_FACTORS[activity];
