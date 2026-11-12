export type BmiCategory =
  | 'underweight' | 'normal' | 'overweight' | 'obese_1' | 'obese_2' | 'obese_3';

export function bmi(weightKg: number, heightCm: number): number {
  if (!(weightKg > 0) || !(heightCm > 0)) throw new RangeError('weight and height must be positive');
  const m = heightCm / 100;
  return weightKg / (m * m);
}

/** WHO adult bands. */
export function bmiCategory(value: number): BmiCategory {
  if (value < 18.5) return 'underweight';
  if (value < 25) return 'normal';
  if (value < 30) return 'overweight';
  if (value < 35) return 'obese_1';
  if (value < 40) return 'obese_2';
  return 'obese_3';
}
