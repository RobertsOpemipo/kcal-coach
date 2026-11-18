import type { WaterEntry } from '../contracts';
import type { SqlDriver } from './driver';
import { newId } from './id';
import { lagosDate } from './localDate';

interface Row { id: string; local_date: string; ml: number; created_at: string }

export function createWaterRepo(db: SqlDriver, now: () => Date = () => new Date(), onChange: () => void = () => {}) {
  const enqueue = (op: 'upsert' | 'delete', e: WaterEntry) =>
    db.run('INSERT INTO outbox (entity, entity_id, op, payload, created_at) VALUES (?,?,?,?,?)',
      ['water_entry', e.id, op, JSON.stringify(e), now().toISOString()]);

  return {
    add(ml: number, localDate?: string): WaterEntry {
      const e: WaterEntry = { id: newId(), localDate: localDate ?? lagosDate(now()), ml, createdAt: now().toISOString() };
      db.transaction(() => {
        db.run('INSERT INTO water_entry (id, local_date, ml, created_at, deleted_at) VALUES (?,?,?,?,NULL)',
          [e.id, e.localDate, e.ml, e.createdAt]);
        enqueue('upsert', e);
      });
      onChange();
      return e;
    },
    totalForDay(localDate: string): number {
      const r = db.all<{ t: number }>('SELECT COALESCE(SUM(ml),0) t FROM water_entry WHERE local_date = ? AND deleted_at IS NULL', [localDate])[0];
      return r?.t ?? 0;
    },
    /** Undo the most recent glass for that day (tombstone). Returns false if there is none. */
    undoLast(localDate: string): boolean {
      const done = db.transaction(() => {
        const r = db.all<Row>('SELECT * FROM water_entry WHERE local_date = ? AND deleted_at IS NULL ORDER BY created_at DESC, rowid DESC LIMIT 1', [localDate])[0];
        if (!r) return false;
        const ts = now().toISOString();
        db.run('UPDATE water_entry SET deleted_at = ? WHERE id = ?', [ts, r.id]);
        enqueue('delete', { id: r.id, localDate: r.local_date, ml: r.ml, createdAt: r.created_at });
        return true;
      });
      if (done) onChange();
      return done;
    },
  };
}
