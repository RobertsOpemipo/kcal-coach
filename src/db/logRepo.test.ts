// src/db/logRepo.test.ts
import { describe, it, expect } from 'vitest';
import { createLogRepo } from './logRepo';
import { nodeDriver } from './nodeDriver.test-util';
import { migrate } from './migrations';
import type { SqlDriver, SqlValue } from './driver';

/**
 * Fresh in-memory db with all migrations applied via the real runner, plus a
 * minimal `food` row so `log_entry.food_id`'s FK can reference it
 * (`nodeDriver()` sets `PRAGMA foreign_keys = ON`).
 */
function freshDb(): SqlDriver {
  const db = nodeDriver();
  migrate(db);
  db.run(
    `INSERT INTO food
       (id, name, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, origin, updated_at)
     VALUES ('rice', 'Rice', 200, 4, 40, 1, 'verified', '2026-01-01T00:00:00.000Z')`,
  );
  return db;
}

const seededEntry = {
  meal: 'lunch' as const,
  foodId: 'rice',
  name: 'Rice',
  grams: 100,
  kcal: 200,
  proteinG: 4,
  carbsG: 40,
  fatG: 1,
  source: 'manual' as const,
};

describe('logRepo.update — rescale maths', () => {
  it('rescales kcal, protein, carbs, fat proportionally from current values', () => {
    const db = freshDb();
    const repo = createLogRepo(db);
    const e = repo.add({ ...seededEntry });

    // factor = 250 / 100 = 2.5
    const u = repo.update(e.id, { grams: 250 });
    expect(u).not.toBeNull();
    expect(u!.grams).toBe(250);
    expect(u!.kcal).toBeCloseTo(500, 6);
    expect(u!.proteinG).toBeCloseTo(10, 6);
    expect(u!.carbsG).toBeCloseTo(100, 6);
    expect(u!.fatG).toBeCloseTo(2.5, 6);
  });

  it('compounds on a second call: the second rescale uses the *current* grams', () => {
    const db = freshDb();
    const repo = createLogRepo(db);
    const e = repo.add({ ...seededEntry });     // 100g, 200 kcal
    repo.update(e.id, { grams: 200 });          // → 200g, 400 kcal
    const u = repo.update(e.id, { grams: 300 }); // factor 300/200 = 1.5 → 600 kcal
    expect(u).not.toBeNull();
    expect(u!.grams).toBe(300);
    expect(u!.kcal).toBeCloseTo(600, 6);
    expect(u!.proteinG).toBeCloseTo(12, 6);
  });

  it('preserves the entry id, createdAt, foodId, name and source', () => {
    const db = freshDb();
    const repo = createLogRepo(db);
    const e = repo.add({ ...seededEntry });
    const u = repo.update(e.id, { grams: 150 });
    expect(u!.id).toBe(e.id);
    expect(u!.createdAt).toBe(e.createdAt);
    expect(u!.foodId).toBe(e.foodId);
    expect(u!.name).toBe(e.name);
    expect(u!.source).toBe(e.source);
  });
});

describe('logRepo.update — meal move', () => {
  it('changes meal and leaves macros/grams untouched', () => {
    const db = freshDb();
    const repo = createLogRepo(db);
    const e = repo.add({ ...seededEntry });
    const u = repo.update(e.id, { meal: 'dinner' });
    expect(u).not.toBeNull();
    expect(u!.meal).toBe('dinner');
    expect(u!.grams).toBe(100);
    expect(u!.kcal).toBe(200);
    expect(u!.proteinG).toBe(4);
    expect(u!.carbsG).toBe(40);
    expect(u!.fatG).toBe(1);
  });

  it('updates meal and grams in one call', () => {
    const db = freshDb();
    const repo = createLogRepo(db);
    const e = repo.add({ ...seededEntry });
    const u = repo.update(e.id, { meal: 'breakfast', grams: 50 });
    expect(u!.meal).toBe('breakfast');
    expect(u!.grams).toBe(50);
    expect(u!.kcal).toBeCloseTo(100, 6);
    expect(u!.proteinG).toBeCloseTo(2, 6);
    expect(u!.carbsG).toBeCloseTo(20, 6);
    expect(u!.fatG).toBeCloseTo(0.5, 6);
  });
});

describe('logRepo.update — updated_at', () => {
  it('bumps updated_at to now() on success', () => {
    let clock = new Date('2026-01-01T00:00:00.000Z');
    const db = freshDb();
    const repo = createLogRepo(db, () => clock);
    const e = repo.add({ ...seededEntry });
    expect(e.updatedAt).toBe('2026-01-01T00:00:00.000Z');

    clock = new Date('2026-01-01T01:00:00.000Z');
    const u = repo.update(e.id, { grams: 200 });
    expect(u!.updatedAt).toBe('2026-01-01T01:00:00.000Z');
    expect(u!.createdAt).toBe('2026-01-01T00:00:00.000Z');
  });
});

describe('logRepo.update — refusals', () => {
  it('returns null for an unknown id and writes nothing', () => {
    const db = freshDb();
    const repo = createLogRepo(db);
    const before = db.all<{ n: number }>('SELECT COUNT(*) AS n FROM outbox')[0]!.n;
    expect(repo.update('no-such-id', { grams: 200 })).toBeNull();
    const after = db.all<{ n: number }>('SELECT COUNT(*) AS n FROM outbox')[0]!.n;
    expect(after).toBe(before);
  });

  it('returns null for a tombstoned id and adds no outbox row', () => {
    const db = freshDb();
    const repo = createLogRepo(db);
    const e = repo.add({ ...seededEntry });
    repo.remove(e.id);
    const before = db.all<{ n: number }>('SELECT COUNT(*) AS n FROM outbox')[0]!.n;

    expect(repo.update(e.id, { grams: 200 })).toBeNull();
    expect(repo.update(e.id, { meal: 'dinner' })).toBeNull();

    const after = db.all<{ n: number }>('SELECT COUNT(*) AS n FROM outbox')[0]!.n;
    expect(after).toBe(before);
  });

  it('returns null when requested grams is 0 or negative, and changes nothing', () => {
    const db = freshDb();
    const repo = createLogRepo(db);
    const e = repo.add({ ...seededEntry });

    expect(repo.update(e.id, { grams: 0 })).toBeNull();
    expect(repo.update(e.id, { grams: -5 })).toBeNull();
    expect(repo.update(e.id, { grams: Number.NaN })).toBeNull();

    const still = repo.get(e.id);
    expect(still!.grams).toBe(100);
    expect(still!.kcal).toBe(200);
  });

  it('returns null when current grams is 0 (cannot compute a factor), and leaves the entry alone', () => {
    const db = freshDb();
    const repo = createLogRepo(db);
    const zero = repo.add({ ...seededEntry, grams: 0, kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });

    expect(repo.update(zero.id, { grams: 100 })).toBeNull();
    const still = repo.get(zero.id);
    expect(still!.grams).toBe(0);
    expect(still!.kcal).toBe(0);
  });

  // NEW (FIX 1): empty patch is read-only.
  it('empty patch writes nothing and returns the current entry (or null if missing/tombstoned)', () => {
    const db = freshDb();
    let changes = 0;
    const repo = createLogRepo(db, () => new Date(), () => { changes += 1; });
    const e = repo.add({ ...seededEntry }); // +1
    expect(changes).toBe(1);
    const outboxBefore = db.all<{ n: number }>('SELECT COUNT(*) AS n FROM outbox')[0]!.n;

    // Live entry: returns the current entry, no write, no onChange.
    const u = repo.update(e.id, {});
    expect(u).not.toBeNull();
    expect(u!.id).toBe(e.id);
    expect(u!.grams).toBe(e.grams);
    expect(u!.kcal).toBe(e.kcal);
    expect(u!.proteinG).toBe(e.proteinG);
    expect(u!.carbsG).toBe(e.carbsG);
    expect(u!.fatG).toBe(e.fatG);
    expect(u!.meal).toBe(e.meal);
    expect(u!.updatedAt).toBe(e.updatedAt); // no bump
    expect(changes).toBe(1);                 // no onChange
    expect(db.all<{ n: number }>('SELECT COUNT(*) AS n FROM outbox')[0]!.n).toBe(outboxBefore);

    // Missing: null, no write, no onChange.
    expect(repo.update('no-such-id', {})).toBeNull();
    expect(changes).toBe(1);
    expect(db.all<{ n: number }>('SELECT COUNT(*) AS n FROM outbox')[0]!.n).toBe(outboxBefore);

    // Tombstoned: null, no write, no onChange.
    repo.remove(e.id); // +1
    expect(changes).toBe(2);
    const outboxAfterRemove = db.all<{ n: number }>('SELECT COUNT(*) AS n FROM outbox')[0]!.n;
    expect(repo.update(e.id, {})).toBeNull();
    expect(changes).toBe(2);
    expect(db.all<{ n: number }>('SELECT COUNT(*) AS n FROM outbox')[0]!.n).toBe(outboxAfterRemove);
  });
});

describe('logRepo.update — outbox', () => {
  it('queues exactly one additional upsert row whose payload matches the updated entry', () => {
    const db = freshDb();
    const repo = createLogRepo(db);
    const e = repo.add({ ...seededEntry });

    const before = db.all<{ n: number }>('SELECT COUNT(*) AS n FROM outbox')[0]!.n;
    const u = repo.update(e.id, { grams: 200, meal: 'dinner' });
    const after = db.all<{ n: number }>('SELECT COUNT(*) AS n FROM outbox')[0]!.n;
    expect(after).toBe(before + 1);

    const outbox = db.all<{ op: string; payload: string; entity: string; entity_id: string }>(
      `SELECT entity, entity_id, op, payload FROM outbox
       WHERE entity = 'log_entry' AND entity_id = ?
       ORDER BY seq`, [e.id]);
    expect(outbox.length).toBe(2);
    const last = outbox[1]!;
    expect(last.op).toBe('upsert');
    expect(last.entity).toBe('log_entry');
    expect(last.entity_id).toBe(e.id);

    const payload = JSON.parse(last.payload) as {
      grams: number; kcal: number; proteinG: number; carbsG: number; fatG: number;
      meal: string; updatedAt: string;
    };
    expect(payload.grams).toBe(200);
    expect(payload.kcal).toBeCloseTo(400, 6);
    expect(payload.proteinG).toBeCloseTo(8, 6);
    expect(payload.carbsG).toBeCloseTo(80, 6);
    expect(payload.fatG).toBeCloseTo(2, 6);
    expect(payload.meal).toBe('dinner');
    expect(payload.updatedAt).toBe(u!.updatedAt);
  });

  it('calls onChange on success and not on a refused call', () => {
    const db = freshDb();
    let changes = 0;
    const repo = createLogRepo(db, () => new Date(), () => { changes += 1; });
    const e = repo.add({ ...seededEntry }); // +1
    expect(changes).toBe(1);

    repo.update(e.id, { grams: 200 });      // +1
    expect(changes).toBe(2);

    repo.update('no-such-id', { grams: 100 }); // no change
    expect(changes).toBe(2);

    repo.remove(e.id);                      // +1
    expect(changes).toBe(3);

    repo.update(e.id, { grams: 100 });      // tombstoned → no change
    expect(changes).toBe(3);
  });
});

describe('logRepo.update — atomicity', () => {
  it('rolls back the log_entry update if the outbox insert throws', () => {
    const base = freshDb();
    let outboxInserts = 0;

    const throwing: SqlDriver = {
      exec: (sql) => base.exec(sql),
      all: <T,>(sql: string, params?: SqlValue[]) => base.all<T>(sql, params),
      transaction: <T,>(fn: () => T): T => base.transaction(fn),
      run: (sql, params) => {
        if (sql.includes('INSERT INTO outbox')) {
          outboxInserts += 1;
          if (outboxInserts >= 2) throw new Error('simulated outbox failure');
        }
        base.run(sql, params);
      },
    };

    const repo = createLogRepo(throwing);
    const e = repo.add({ ...seededEntry });
    expect(outboxInserts).toBe(1);

    expect(() => repo.update(e.id, { grams: 250 })).toThrow('simulated outbox failure');

    const row = base.all<{ grams: number; kcal: number; updated_at: string }>(
      'SELECT grams, kcal, updated_at FROM log_entry WHERE id = ?', [e.id])[0]!;
    expect(row.grams).toBe(100);
    expect(row.kcal).toBe(200);
    expect(row.updated_at).toBe(e.updatedAt);

    const outbox = base.all<{ op: string }>(
      'SELECT op FROM outbox WHERE entity = ? AND entity_id = ?', ['log_entry', e.id]);
    expect(outbox.length).toBe(1);
    expect(outbox[0]!.op).toBe('upsert');
  });
});