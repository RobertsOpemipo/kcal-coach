import type { Sex } from '../contracts';
import { cmToIn } from './units';

const F = {
  hamwi: { male: [48.0, 2.7], female: [45.5, 2.2] },
  devine: { male: [50.0, 2.3], female: [45.5, 2.3] },
  robinson: { male: [52.0, 1.9], female: [49.0, 1.7] },
  miller: { male: [56.2, 1.41], female: [53.1, 1.36] },
} as const;

export type IdealFormula = keyof typeof F;

export interface IdealWeight {
  results: Record<IdealFormula, number>;
  minKg: number;
  maxKg: number;
}

/** n = inches over 5 feet. Below 5 ft the formulas are not defined; n is clamped to 0 and `belowFiveFeet` is the caller's cue to hedge. */
export function idealWeight(sex: Sex, heightCm: number): IdealWeight & { belowFiveFeet: boolean } {
  const over = cmToIn(heightCm) - 60;
  const n = Math.max(0, over);
  const results = {} as Record<IdealFormula, number>;
  for (const k of Object.keys(F) as IdealFormula[]) {
    const [base, per] = F[k][sex];
    results[k] = base + per * n;
  }
  const vals = Object.values(results);
  return { results, minKg: Math.min(...vals), maxKg: Math.max(...vals), belowFiveFeet: over < 0 };
}
