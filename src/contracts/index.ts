// Shared types only. No logic. Changes here must be logged in docs/CONTRACTS.md.

export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very_active' | 'extra_active';
export type GoalKind = 'lose' | 'maintain' | 'gain';
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type EntrySource = 'manual' | 'scan' | 'custom' | 'copy';
export type BmrMethod = 'mifflin' | 'harris_benedict' | 'katch_mcardle';

export interface MacroRange {
  /** grams */
  min: number;
  target: number;
  max: number;
}

export interface Macros {
  protein: MacroRange;
  fat: MacroRange;
  carbs: MacroRange;
}

export type DailyTarget =
  | { status: 'ok'; kcal: number; tdee: number; macros: Macros; notes: string[] }
  | {
      status: 'maintenance_only';
      kcal: number;
      tdee: number;
      macros: Macros;
      reason: 'under_18' | 'pregnant_or_breastfeeding' | 'bmi_under_18_5';
      notes: string[];
    };

export interface LogEntry {
  id: string; // device-generated UUID
  localDate: string; // YYYY-MM-DD in Africa/Lagos
  meal: MealSlot;
  foodId: string | null;
  name: string;
  grams: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  source: EntrySource;
  createdAt: string; // ISO UTC
  updatedAt: string;
  deletedAt: string | null; // tombstone
}
