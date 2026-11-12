import { describe, expect, it } from 'vitest';
import { currentVersion, MIGRATIONS, migrate } from './migrations';
import { createLogRepo } from './logRepo';
import { lagosDate } from './localDate';
import { nodeDriver } from './nodeDriver.test-util';

const entry = { meal: 'lunch', foodId: null, name: 'Jollof rice', grams: 250, kcal: 400, proteinG: 8, carbsG: 70, fatG: 10, source: 'manual' } as const;

describe('migrations', () => {
  it('apply once and are idempotent', () => {
    const db = nodeDriver();
    expect(currentVersion(db)).toBe(0);
    migrate(db);
    expect(currentVersion(db)).toBe(MIGRATIONS.length);
    migrate(db);
    expect(currentVersion(db)).toBe(MIGRATIONS.length);
    const tables = db.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table'").map((t) => t.name);
    for (const t of ['profile', 'weight_entry', 'food', 'log_entry', 'water_entry', 'outbox']) expect(tables).toContain(t);
  });
  it('a failing migration rolls back and leaves the version alone', () => {
    const db = nodeDriver();
    migrate(db);
    expect(() => migrate(db, [...MIGRATIONS, 'CREATE TABLE ok_t (a); CREATE TABLE ok_t (a);'])).toThrow();
    expect(currentVersion(db)).toBe(MIGRATIONS.length);
    expect(db.all("SELECT name FROM sqlite_master WHERE name='ok_t'")).toHaveLength(0);
  });
  it('refuses a database newer than the app', () => {
    const db = nodeDriver();
    migrate(db);
    db.exec('PRAGMA user_version = 99');
    expect(() => migrate(db)).toThrow(/newer/);
  });
});

describe('log repo', () => {
  const setup = () => {
    const db = nodeDriver();
    migrate(db);
    return { db, repo: createLogRepo(db, () => new Date('2026-11-12T23:30:00Z')) };
  };
  it('adds an entry with a UUID and queues one outbox row', () => {
    const { db, repo } = setup();
    const e = repo.add(entry);
    expect(e.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(repo.get(e.id)?.name).toBe('Jollof rice');
    const box = db.all<{ op: string; entity_id: string }>('SELECT * FROM outbox');
    expect(box).toEqual([expect.objectContaining({ op: 'upsert', entity_id: e.id })]);
  });
  it('uses the Lagos calendar day: 23:30 UTC is already the next day', () => {
    const { repo } = setup();
    expect(repo.add(entry).localDate).toBe('2026-11-13');
    expect(lagosDate(new Date('2026-11-12T22:59:00Z'))).toBe('2026-11-12');
  });
  it('remove writes a tombstone, hides the row from the day, and queues a delete', () => {
    const { db, repo } = setup();
    const e = repo.add(entry);
    expect(repo.remove(e.id)).toBe(true);
    expect(repo.remove(e.id)).toBe(false);
    expect(repo.forDay(e.localDate)).toHaveLength(0);
    expect(repo.get(e.id)?.deletedAt).not.toBeNull();
    expect(db.all<{ op: string }>('SELECT op FROM outbox ORDER BY seq').map((r) => r.op)).toEqual(['upsert', 'delete']);
  });
  it('totals skip tombstoned rows', () => {
    const { repo } = setup();
    const a = repo.add(entry);
    repo.add({ ...entry, kcal: 100, proteinG: 2, carbsG: 20, fatG: 1 });
    repo.remove(a.id);
    expect(repo.totalsForDay(a.localDate)).toEqual({ kcal: 100, proteinG: 2, carbsG: 20, fatG: 1 });
  });
  it('a failed insert leaves no outbox row (atomic)', () => {
    const { db, repo } = setup();
    expect(() => repo.add({ ...entry, grams: -1 })).toThrow();
    expect(db.all('SELECT * FROM outbox')).toHaveLength(0);
  });
});
