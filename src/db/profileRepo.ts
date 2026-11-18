// src/db/profileRepo.ts
import type { Profile, WeightEntry } from '../contracts';
import type { SqlDriver } from './driver';
import { newId } from './id';
import { lagosDate } from './localDate';

interface Row {
  sex: Profile['sex']; birth_year: number; height_cm: number; activity: Profile['activity'];
  goal: Profile['goal']; units: Profile['units']; pregnant_or_breastfeeding: number; updated_at: string;
}

const PROFILE_ID = 'me';

export function createProfileRepo(db: SqlDriver, now: () => Date = () => new Date(), onChange: () => void = () => {}) {
  return {
    get(): Profile | null {
      const r = db.all<Row>('SELECT * FROM profile WHERE id = ?', [PROFILE_ID])[0];
      return r ? {
        sex: r.sex, birthYear: r.birth_year, heightCm: r.height_cm, activity: r.activity, goal: r.goal,
        units: r.units, pregnantOrBreastfeeding: r.pregnant_or_breastfeeding === 1, updatedAt: r.updated_at,
      } : null;
    },
    /** Saves the profile and, when given, today's weight, in one transaction. */
    save(p: Omit<Profile, 'updatedAt'>, weightKg?: number): void {
      const ts = now().toISOString();
      db.transaction(() => {
        db.run(
          `INSERT INTO profile (id, sex, birth_year, height_cm, activity, goal, units, pregnant_or_breastfeeding, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?)
           ON CONFLICT(id) DO UPDATE SET sex=excluded.sex, birth_year=excluded.birth_year, height_cm=excluded.height_cm,
             activity=excluded.activity, goal=excluded.goal, units=excluded.units,
             pregnant_or_breastfeeding=excluded.pregnant_or_breastfeeding, updated_at=excluded.updated_at`,
          [PROFILE_ID, p.sex, p.birthYear, p.heightCm, p.activity, p.goal, p.units, p.pregnantOrBreastfeeding ? 1 : 0, ts]);
        db.run('INSERT INTO outbox (entity, entity_id, op, payload, created_at) VALUES (?,?,?,?,?)',
          ['profile', PROFILE_ID, 'upsert', JSON.stringify(p), ts]);
        if (weightKg !== undefined) {
          // D20: same outbox payload shape as weightRepo.add — full WeightEntry.
          const id = newId();
          const localDate = lagosDate(now());
          const entry: WeightEntry = {
            id, localDate, weightKg,
            waistCm: null, bodyFatPct: null, bodyFatSource: null,
            createdAt: ts, updatedAt: ts, deletedAt: null,
          };
          db.run(
            'INSERT INTO weight_entry (id, local_date, weight_kg, waist_cm, body_fat_pct, body_fat_source, created_at, updated_at, deleted_at) VALUES (?,?,?,?,?,?,?,?,NULL)',
            [id, localDate, weightKg, null, null, null, ts, ts]);
          db.run('INSERT INTO outbox (entity, entity_id, op, payload, created_at) VALUES (?,?,?,?,?)',
            ['weight_entry', id, 'upsert', JSON.stringify(entry), ts]);
        }
      });
      onChange();
    },
    latestWeightKg(): number | null {
      const r = db.all<{ weight_kg: number }>('SELECT weight_kg FROM weight_entry WHERE deleted_at IS NULL ORDER BY local_date DESC, created_at DESC, rowid DESC LIMIT 1')[0];
      return r ? r.weight_kg : null;
    },
  };
}

/** Age in whole years, using the calendar year only (birth month is not collected). */
export const ageFromBirthYear = (birthYear: number, today: string = lagosDate()): number =>
  Number(today.slice(0, 4)) - birthYear;