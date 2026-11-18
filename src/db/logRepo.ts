// src/db/logRepo.ts
import type { LogEntry } from '../contracts';
import type { SqlDriver } from './driver';
import { newId } from './id';
import { lagosDate } from './localDate';

type NewEntry = Omit<LogEntry, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'localDate'> & { localDate?: string };

interface Row {
  id: string; local_date: string; meal: LogEntry['meal']; food_id: string | null; name: string;
  grams: number; kcal: number; protein_g: number; carbs_g: number; fat_g: number;
  source: LogEntry['source']; created_at: string; updated_at: string; deleted_at: string | null;
}

const toEntry = (r: Row): LogEntry => ({
  id: r.id, localDate: r.local_date, meal: r.meal, foodId: r.food_id, name: r.name, grams: r.grams,
  kcal: r.kcal, proteinG: r.protein_g, carbsG: r.carbs_g, fatG: r.fat_g, source: r.source,
  createdAt: r.created_at, updatedAt: r.updated_at, deletedAt: r.deleted_at,
});

export function createLogRepo(db: SqlDriver, now: () => Date = () => new Date(), onChange: () => void = () => {}) {
  const enqueue = (op: 'upsert' | 'delete', e: LogEntry) =>
    db.run('INSERT INTO outbox (entity, entity_id, op, payload, created_at) VALUES (?,?,?,?,?)',
      ['log_entry', e.id, op, JSON.stringify(e), now().toISOString()]);

  const get = (id: string): LogEntry | null => {
    const r = db.all<Row>('SELECT * FROM log_entry WHERE id = ?', [id])[0];
    return r ? toEntry(r) : null;
  };

  const api = {
    get,
    add(input: NewEntry): LogEntry {
      const ts = now().toISOString();
      const entry: LogEntry = {
        ...input, id: newId(), localDate: input.localDate ?? lagosDate(now()),
        createdAt: ts, updatedAt: ts, deletedAt: null,
      };
      db.transaction(() => {
        db.run(
          `INSERT INTO log_entry (id, local_date, meal, food_id, name, grams, kcal, protein_g, carbs_g, fat_g, source, created_at, updated_at, deleted_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,NULL)`,
          [entry.id, entry.localDate, entry.meal, entry.foodId, entry.name, entry.grams, entry.kcal,
            entry.proteinG, entry.carbsG, entry.fatG, entry.source, ts, ts]);
        enqueue('upsert', entry);
      });
      onChange();
      return entry;
    },
    /**
     * Update an existing live entry's grams and/or meal.
     *
     * - Empty patch (`{}`): returns the current entry (or `null` if missing or
     *   tombstoned) and writes nothing — no `updated_at` bump, no outbox row,
     *   no `onChange`. This makes `update` idempotent for no-op calls.
     * - `grams` rescales kcal, protein, carbs and fat proportionally from the
     *   entry's *current* values (factor = newGrams / currentGrams). Repeated
     *   calls compound, which matches the user moving a portion up/down.
     * - Refuses (returns `null`, writes nothing, no `onChange`) if the id is
     *   missing or tombstoned, if `patch.grams` is not > 0, or if the entry's
     *   current grams is not > 0 (division by zero).
     * - On success: bumps `updated_at`, writes an `upsert` outbox row in the
     *   same transaction, fires `onChange` once.
     */
    update(id: string, patch: { grams?: number; meal?: LogEntry['meal'] }): LogEntry | null {
      // FIX 1: empty patch → read-only.
      if (patch.grams === undefined && patch.meal === undefined) {
        const cur = get(id);
        if (!cur || cur.deletedAt) return null;
        return cur;
      }

      const result = db.transaction(() => {
        const cur = get(id);
        if (!cur || cur.deletedAt) return null;

        const next: LogEntry = { ...cur };

        if (patch.grams !== undefined) {
          if (!(patch.grams > 0)) return null;   // catches 0, negatives, NaN
          if (!(cur.grams > 0)) return null;     // catches 0, negatives, NaN
          const factor = patch.grams / cur.grams;
          next.grams = patch.grams;
          next.kcal = cur.kcal * factor;
          next.proteinG = cur.proteinG * factor;
          next.carbsG = cur.carbsG * factor;
          next.fatG = cur.fatG * factor;
        }

        if (patch.meal !== undefined) next.meal = patch.meal;

        const ts = now().toISOString();
        next.updatedAt = ts;

        db.run(
          `UPDATE log_entry SET meal = ?, grams = ?, kcal = ?, protein_g = ?, carbs_g = ?, fat_g = ?, updated_at = ? WHERE id = ?`,
          [next.meal, next.grams, next.kcal, next.proteinG, next.carbsG, next.fatG, ts, id],
        );
        enqueue('upsert', next);
        return next;
      });
      if (result) onChange();
      return result;
    },
    /** Copy an existing entry to another day/meal as a new row (source 'copy'). */
    logAgain(id: string, opts: { localDate?: string; meal?: LogEntry['meal'] } = {}): LogEntry | null {
      const cur = get(id);
      if (!cur) return null;
      return api.add({
        meal: opts.meal ?? cur.meal, foodId: cur.foodId, name: cur.name, grams: cur.grams, kcal: cur.kcal,
        proteinG: cur.proteinG, carbsG: cur.carbsG, fatG: cur.fatG, source: 'copy',
        ...(opts.localDate ? { localDate: opts.localDate } : {}),
      });
    },
    /** Copy every live entry from one day to another. Returns how many were copied. */
    copyDay(fromDate: string, toDate: string): number {
      const src = api.forDay(fromDate);
      for (const e of src) api.logAgain(e.id, { localDate: toDate });
      return src.length;
    },
    /** Most recently logged distinct foods (by name + grams), newest first. */
    recent(limit = 8): LogEntry[] {
      const rows = db.all<Row>(
        `SELECT * FROM log_entry WHERE deleted_at IS NULL ORDER BY created_at DESC, rowid DESC LIMIT 200`).map(toEntry);
      const seen = new Set<string>();
      const out: LogEntry[] = [];
      for (const e of rows) {
        const key = `${e.name}|${e.grams}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(e);
        if (out.length >= limit) break;
      }
      return out;
    },
    /** Tombstone, never a hard delete, so sync can propagate it. */
    remove(id: string): boolean {
      const done = db.transaction(() => {
        const cur = get(id);
        if (!cur || cur.deletedAt) return false;
        const ts = now().toISOString();
        db.run('UPDATE log_entry SET deleted_at = ?, updated_at = ? WHERE id = ?', [ts, ts, id]);
        enqueue('delete', { ...cur, deletedAt: ts, updatedAt: ts });
        return true;
      });
      if (done) onChange();
      return done;
    },
    forDay(localDate: string): LogEntry[] {
      return db.all<Row>('SELECT * FROM log_entry WHERE local_date = ? AND deleted_at IS NULL ORDER BY created_at', [localDate]).map(toEntry);
    },
    totalsForDay(localDate: string) {
      const r = db.all<{ kcal: number; p: number; c: number; f: number }>(
        `SELECT COALESCE(SUM(kcal),0) kcal, COALESCE(SUM(protein_g),0) p, COALESCE(SUM(carbs_g),0) c, COALESCE(SUM(fat_g),0) f
         FROM log_entry WHERE local_date = ? AND deleted_at IS NULL`, [localDate])[0];
      return { kcal: r?.kcal ?? 0, proteinG: r?.p ?? 0, carbsG: r?.c ?? 0, fatG: r?.f ?? 0 };
    },
  };
  return api;
}