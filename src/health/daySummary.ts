import type { DaySummary, Macros, MacroProgress } from '../contracts';

const cap = (n: number) => Math.min(1, Math.max(0, n));
const prog = (eatenG: number, targetG: number): MacroProgress => ({
  eatenG, targetG, fraction: targetG > 0 ? cap(eatenG / targetG) : 0,
});

/** What the Today screen shows. Over-target is reported as a neutral number, never as an error. */
export function summariseDay(
  goalKcal: number,
  macros: Macros,
  eaten: { kcal: number; proteinG: number; carbsG: number; fatG: number },
): DaySummary {
  const remaining = goalKcal - eaten.kcal;
  return {
    goalKcal,
    eatenKcal: eaten.kcal,
    remainingKcal: Math.max(0, Math.round(remaining)),
    overKcal: Math.max(0, Math.round(-remaining)),
    fraction: goalKcal > 0 ? cap(eaten.kcal / goalKcal) : 0,
    protein: prog(eaten.proteinG, macros.protein.target),
    carbs: prog(eaten.carbsG, macros.carbs.target),
    fat: prog(eaten.fatG, macros.fat.target),
  };
}
