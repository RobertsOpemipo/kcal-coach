import type { Units } from '../contracts';
import { feetInchesToCm, lbToKg } from './units';

export const LIMITS = { heightCm: [100, 230], weightKg: [25, 300], age: [13, 100] } as const;

const num = (t: string): number | null => {
  const n = Number(t.trim().replace(',', '.'));
  return t.trim() !== '' && Number.isFinite(n) ? n : null;
};

export interface BodyInput {
  units: Units;
  /** metric height in cm */
  heightCm: string;
  feet: string;
  inches: string;
  /** kg when metric, lb when imperial */
  weight: string;
  birthYear: string;
}

export interface BodyErrors { birthYear?: string; height?: string; weight?: string }

export type BodyResult =
  | { ok: true; birthYear: number; heightCm: number; weightKg: number }
  | { ok: false; errors: BodyErrors };

export function parseBody(i: BodyInput, thisYear: number): BodyResult {
  const errors: BodyErrors = {};

  const by = num(i.birthYear);
  const age = by === null ? null : thisYear - by;
  if (by === null || !Number.isInteger(by) || age === null || age < LIMITS.age[0] || age > LIMITS.age[1]) {
    errors.birthYear = `Enter a year between ${thisYear - LIMITS.age[1]} and ${thisYear - LIMITS.age[0]}`;
  }

  let heightCm: number | null;
  if (i.units === 'metric') heightCm = num(i.heightCm);
  else {
    const ft = num(i.feet), inch = i.inches.trim() === '' ? 0 : num(i.inches);
    heightCm = ft === null || inch === null ? null : feetInchesToCm(ft, inch);
  }
  if (heightCm === null || heightCm < LIMITS.heightCm[0] || heightCm > LIMITS.heightCm[1]) {
    errors.height = i.units === 'metric' ? 'Enter your height in cm (100 to 230)' : 'Enter feet and inches (about 3 ft 4 in to 7 ft 6 in)';
  }

  const w = num(i.weight);
  const weightKg = w === null ? null : i.units === 'metric' ? w : lbToKg(w);
  if (weightKg === null || weightKg < LIMITS.weightKg[0] || weightKg > LIMITS.weightKg[1]) {
    errors.weight = i.units === 'metric' ? 'Enter your weight in kg (25 to 300)' : 'Enter your weight in lb (55 to 660)';
  }

  if (errors.birthYear || errors.height || errors.weight) return { ok: false, errors };
  return { ok: true, birthYear: by as number, heightCm: heightCm as number, weightKg: weightKg as number };
}
