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

export function createLogRepo(db: SqlDriver, now: () => Date = () => new Date()) {
  const enqueue = (op: 'upsert' | 'delete', e: LogEntry) =>
    db.run('INSERT INTO outbox (entity, entity_id, op, payload, created_at) VALUES (?,?,?,?,?)',
      ['log_entry', e.id, op, JSON.stringify(e), now().toISOString()]);

  const get = (id: string): LogEntry | null => {
    const r = db.all<Row>('SELECT * FROM log_entry WHERE id = ?', [id])[0];
    return r ? toEntry(r) : null;
  };

  return {
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
      return entry;
    },
    /** Tombstone, never a hard delete, so sync can propagate it. */
    remove(id: string): boolean {
      return db.transaction(() => {
        const cur = get(id);
        if (!cur || cur.deletedAt) return false;
        const ts = now().toISOString();
        db.run('UPDATE log_entry SET deleted_at = ?, updated_at = ? WHERE id = ?', [ts, ts, id]);
        enqueue('delete', { ...cur, deletedAt: ts, updatedAt: ts });
        return true;
      });
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
}
