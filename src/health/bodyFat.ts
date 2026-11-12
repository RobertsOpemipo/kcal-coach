import type { Sex } from '../contracts';

const log10 = Math.log10;

export function navyBodyFat(i: {
  sex: Sex; heightCm: number; neckCm: number; waistCm: number; hipCm?: number;
}): number {
  if (i.sex === 'male') {
    const d = i.waistCm - i.neckCm;
    if (d <= 0) throw new RangeError('waist must be larger than neck');
    return 495 / (1.0324 - 0.19077 * log10(d) + 0.15456 * log10(i.heightCm)) - 450;
  }
  if (i.hipCm === undefined) throw new Error('hipCm required for women');
  const d = i.waistCm + i.hipCm - i.neckCm;
  if (d <= 0) throw new RangeError('waist + hip must be larger than neck');
  return 495 / (1.29579 - 0.35004 * log10(d) + 0.221 * log10(i.heightCm)) - 450;
}

const siri = (density: number) => 495 / density - 450;

/** Jackson-Pollock 3 site. Men: chest, abdomen, thigh. Women: triceps, suprailiac, thigh. Folds in mm. */
export function jacksonPollock3(i: { sex: Sex; ageYears: number; folds: [number, number, number] }): number {
  const sum = i.folds[0] + i.folds[1] + i.folds[2];
  const density =
    i.sex === 'male'
      ? 1.10938 - 0.0008267 * sum + 0.0000016 * sum * sum - 0.0002574 * i.ageYears
      : 1.0994921 - 0.0009929 * sum + 0.0000023 * sum * sum - 0.0001392 * i.ageYears;
  return siri(density);
}

/** Deurenberg quick estimate. Label "rough estimate" in the UI. */
export const deurenberg = (i: { bmi: number; ageYears: number; sex: Sex }) =>
  1.2 * i.bmi + 0.23 * i.ageYears - 10.8 * (i.sex === 'male' ? 1 : 0) - 5.4;

export const leanMassKg = (weightKg: number, bodyFatPct: number) => weightKg * (1 - bodyFatPct / 100);
