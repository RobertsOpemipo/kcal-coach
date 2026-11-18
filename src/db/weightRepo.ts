// src/db/weightRepo.ts
import type { WeightEntry } from '../contracts';
import type { SqlDriver } from './driver';
import { newId } from './id';
import { lagosDate } from './localDate';

interface Row {
  id: string;
  local_date: string;
  weight_kg: number;
  waist_cm: number | null;
  body_fat_pct: number | null;
  body_fat_source: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

const toEntry = (r: Row): WeightEntry => ({
  id: r.id,
  localDate: r.local_date,
  weightKg: r.weight_kg,
  waistCm: r.waist_cm,
  bodyFatPct: r.body_fat_pct,
  bodyFatSource: r.body_fat_source,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  deletedAt: r.deleted_at,
});

export interface AddWeightExtras {
  waistCm?: number;
  bodyFatPct?: number;
  bodyFatSource?: string;
}

/**
 * Repo over `weight_entry`. Does NOT replace `profileRepo.latestWeightKg`:
 * `latest()` returns the full entry, `latestWeightKg` returns just the number.
 */
export function createWeightRepo(
  db: SqlDriver,
  now: () => Date = () => new Date(),
  onChange: () => void = () => {},
) {
  const enqueue = (op: 'upsert' | 'delete', e: WeightEntry) =>
    db.run(
      'INSERT INTO outbox (entity, entity_id, op, payload, created_at) VALUES (?,?,?,?,?)',
      ['weight_entry', e.id, op, JSON.stringify(e), now().toISOString()],
    );

  const get = (id: string): WeightEntry | null => {
    const r = db.all<Row>('SELECT * FROM weight_entry WHERE id = ?', [id])[0];
    return r ? toEntry(r) : null;
  };

  const api = {
    get,
    /** Insert a new weight entry. Throws if `weightKg <= 0` (mirrors the DB CHECK). */
    add(weightKg: number, localDate?: string, extras: AddWeightExtras = {}): WeightEntry {
      if (!(weightKg > 0)) throw new Error('weightKg must be > 0');
      const ts = now().toISOString();
      const entry: WeightEntry = {
        id: newId(),
        localDate: localDate ?? lagosDate(now()),
        weightKg,
        waistCm: extras.waistCm ?? null,
        bodyFatPct: extras.bodyFatPct ?? null,
        bodyFatSource: extras.bodyFatSource ?? null,
        createdAt: ts,
        updatedAt: ts,
        deletedAt: null,
      };
      db.transaction(() => {
        db.run(
          `INSERT INTO weight_entry
             (id, local_date, weight_kg, waist_cm, body_fat_pct, body_fat_source, created_at, updated_at, deleted_at)
           VALUES (?,?,?,?,?,?,?,?,NULL)`,
          [
            entry.id,
            entry.localDate,
            entry.weightKg,
            entry.waistCm,
            entry.bodyFatPct,
            entry.bodyFatSource,
            ts,
            ts,
          ],
        );
        enqueue('upsert', entry);
      });
      onChange();
      return entry;
    },
    /** Tombstone, never hard delete. Returns false if missing or already tombstoned. */
    remove(id: string): boolean {
      const done = db.transaction(() => {
        const cur = get(id);
        if (!cur || cur.deletedAt) return false;
        const ts = now().toISOString();
        db.run('UPDATE weight_entry SET deleted_at = ?, updated_at = ? WHERE id = ?', [ts, ts, id]);
        enqueue('delete', { ...cur, deletedAt: ts, updatedAt: ts });
        return true;
      });
      if (done) onChange();
      return done;
    },
    /** Inclusive date range, excludes tombstoned, ascending by (local_date, created_at, rowid). */
    list(fromDate: string, toDate: string): WeightEntry[] {
      return db
        .all<Row>(
          `SELECT * FROM weight_entry
           WHERE local_date >= ? AND local_date <= ? AND deleted_at IS NULL
           ORDER BY local_date ASC, created_at ASC, rowid ASC`,
          [fromDate, toDate],
        )
        .map(toEntry);
    },
    /** Latest live entry by (local_date DESC, created_at DESC, rowid DESC). Null when empty. */
    latest(): WeightEntry | null {
      const r = db.all<Row>(
        `SELECT * FROM weight_entry
         WHERE deleted_at IS NULL
         ORDER BY local_date DESC, created_at DESC, rowid DESC
         LIMIT 1`,
      )[0];
      return r ? toEntry(r) : null;
    },
  };
  return api;
}