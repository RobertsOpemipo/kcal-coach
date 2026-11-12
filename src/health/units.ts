export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

export const lbToKg = (lb: number) => lb * KG_PER_LB;
export const kgToLb = (kg: number) => kg / KG_PER_LB;
export const inToCm = (i: number) => i * CM_PER_IN;
export const cmToIn = (cm: number) => cm / CM_PER_IN;
export const feetInchesToCm = (ft: number, inch: number) => inToCm(ft * 12 + inch);
export const cmToFeetInches = (cm: number) => {
  const total = cmToIn(cm);
  const ft = Math.floor(total / 12);
  return { ft, inch: total - ft * 12 };
};
/** Display rounding only. Never round stored values. */
export const round = (n: number, dp = 0) => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};
