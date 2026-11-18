import type { DailyTarget, Profile } from '../contracts';
import { dailyTarget } from './goals';

/** Daily target for a saved profile. Age and weight come from the caller so this stays pure. */
export const targetForProfile = (p: Profile, weightKg: number, ageYears: number): DailyTarget =>
  dailyTarget({
    sex: p.sex, ageYears, weightKg, heightCm: p.heightCm, activity: p.activity, goal: p.goal,
    pregnantOrBreastfeeding: p.pregnantOrBreastfeeding,
  });
