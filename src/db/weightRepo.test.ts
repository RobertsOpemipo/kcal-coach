// src/db/weightRepo.test.ts
import { describe, it, expect } from 'vitest';
import { createWeightRepo } from './weightRepo';
import { nodeDriver } from './nodeDriver.test-util';
import { migrate } from './migrations';
import type { SqlDriver } from './driver';

function freshDb(): SqlDriver {
  const db = nodeDriver();
  migrate(db);
  return db;
}

describe('weightRepo.add', () => {
  it('inserts a live entry with a UUID and the given values', () => {
    const db = freshDb();
    const repo = createWeightRepo(db, () => new Date('2026-01-01T08:00:00Z'));
    const e = repo.add(80.5);
    expect(e.id).toMatch(/[0-9a-f-]{36}/i);
    expect(e.localDate).toBe('2026-01-01');
    expect(e.weightKg).toBe(80.5);
    expect(e.waistCm).toBeNull();
    expect(e.bodyFatPct).toBeNull();
    expect(e.bodyFatSource).toBeNull();
    expect(e.createdAt).toBe('2026-01-01T08:00:00.000Z');
    expect(e.updatedAt).toBe(e.createdAt);
    expect(e.deletedAt).toBeNull();
  });

  it('honours an explicit localDate and extras', () => {
    const db = freshDb();
    const repo = createWeightRepo(db);
    const e = repo.add(81.2, '2026-02-14', {
      waistCm: 92,
      bodyFatPct: 21.5,
      bodyFatSource: 'scale',
    });
    expect(e.localDate).toBe('2026-02-14');
    expect(e.waistCm).toBe(92);
    expect(e.bodyFatPct).toBe(21.5);
    expect(e.bodyFatSource).toBe('scale');
  });

  it('throws on non-positive weight', () => {
    const db = freshDb();
    const repo = createWeightRepo(db);
    expect(() => repo.add(0)).toThrow();
    expect(() => repo.add(-1)).toThrow();
    expect(() => repo.add(Number.NaN)).toThrow();
  });

  it('writes an upsert row to the outbox and fires onChange', () => {
    const db = freshDb();
    let changes = 0;
    const repo = createWeightRepo(db, () => new Date(), () => { changes += 1; });
    const e = repo.add(80.5);
    expect(changes).toBe(1);
    const rows = db.all<{ entity: string; entity_id: string; op: string; payload: string }>(
      `SELECT entity, entity_id, op, payload FROM outbox ORDER BY seq`,
    );
    expect(rows.length).toBe(1);
    expect(rows[0]!.entity).toBe('weight_entry');
    expect(rows[0]!.entity_id).toBe(e.id);
    expect(rows[0]!.op).toBe('upsert');
    expect(JSON.parse(rows[0]!.payload)).toMatchObject({ id: e.id, weightKg: 80.5 });
  });
});

describe('weightRepo.get', () => {
  it('returns null for a missing id', () => {
    const repo = createWeightRepo(freshDb());
    expect(repo.get('nope')).toBeNull();
  });
  it('round-trips a live entry', () => {
    const repo = createWeightRepo(freshDb());
    const e = repo.add(80.5, '2026-01-01');
    expect(repo.get(e.id)).toEqual(e);
  });
});

describe('weightRepo.remove', () => {
  it('tombstones a live entry and returns true', () => {
    const db = freshDb();
    const repo = createWeightRepo(db, () => new Date('2026-01-02T00:00:00Z'));
    const e = repo.add(80.5);
    expect(repo.remove(e.id)).toBe(true);
    const after = repo.get(e.id);
    expect(after!.deletedAt).toBe('2026-01-02T00:00:00.000Z');
    expect(after!.updatedAt).toBe('2026-01-02T00:00:00.000Z');
  });

  it('returns false and writes nothing for a missing id', () => {
    const db = freshDb();
    const repo = createWeightRepo(db);
    const before = db.all<{ n: number }>('SELECT COUNT(*) AS n FROM outbox')[0]!.n;
    expect(repo.remove('nope')).toBe(false);
    expect(db.all<{ n: number }>('SELECT COUNT(*) AS n FROM outbox')[0]!.n).toBe(before);
  });

  it('returns false and writes nothing for an already-tombstoned entry', () => {
    const db = freshDb();
    const repo = createWeightRepo(db);
    const e = repo.add(80.5);
    repo.remove(e.id);
    const before = db.all<{ n: number }>('SELECT COUNT(*) AS n FROM outbox')[0]!.n;
    expect(repo.remove(e.id)).toBe(false);
    expect(db.all<{ n: number }>('SELECT COUNT(*) AS n FROM outbox')[0]!.n).toBe(before);
  });

  it('writes a delete outbox row and fires onChange only on success', () => {
    const db = freshDb();
    let changes = 0;
    const repo = createWeightRepo(db, () => new Date(), () => { changes += 1; });
    const e = repo.add(80.5);            // +1
    expect(changes).toBe(1);
    repo.remove('nope');                 // no-op
    expect(changes).toBe(1);
    repo.remove(e.id);                   // +1
    expect(changes).toBe(2);
    const ops = db.all<{ op: string }>('SELECT op FROM outbox ORDER BY seq').map((r) => r.op);
    expect(ops).toEqual(['upsert', 'delete']);
  });
});

describe('weightRepo.list', () => {
  it('returns entries in an inclusive date range, ascending by date', () => {
    const db = freshDb();
    const repo = createWeightRepo(db);
    repo.add(80, '2026-01-01');
    repo.add(79.5, '2026-01-08');
    repo.add(79, '2026-01-15');
    repo.add(78.5, '2026-01-22');

    const got = repo.list('2026-01-05', '2026-01-15').map((e) => e.localDate);
    expect(got).toEqual(['2026-01-08', '2026-01-15']);
  });

  it('excludes tombstoned entries', () => {
    const db = freshDb();
    const repo = createWeightRepo(db);
    const a = repo.add(80, '2026-01-01');
    repo.add(79, '2026-01-08');
    repo.remove(a.id);
    expect(repo.list('2026-01-01', '2026-01-31').map((e) => e.localDate)).toEqual(['2026-01-08']);
  });

  it('keeps two entries on the same day, in createdAt order', () => {
    let t = new Date('2026-01-01T08:00:00Z');
    const repo = createWeightRepo(freshDb(), () => t);
    repo.add(80, '2026-01-01');
    t = new Date('2026-01-01T20:00:00Z');
    repo.add(79.5, '2026-01-01');
    const got = repo.list('2026-01-01', '2026-01-01');
    expect(got.map((e) => e.weightKg)).toEqual([80, 79.5]);
  });
});

describe('weightRepo.latest', () => {
  it('returns null when empty', () => {
    expect(createWeightRepo(freshDb()).latest()).toBeNull();
  });

  it('returns the entry with the greatest localDate', () => {
    const repo = createWeightRepo(freshDb());
    repo.add(80, '2026-01-01');
    repo.add(79, '2026-01-15');
    repo.add(79.5, '2026-01-08');
    expect(repo.latest()!.localDate).toBe('2026-01-15');
  });

  it('breaks same-day ties by createdAt (later wins)', () => {
    let t = new Date('2026-01-01T08:00:00Z');
    const repo = createWeightRepo(freshDb(), () => t);
    repo.add(80, '2026-01-01');
    t = new Date('2026-01-01T20:00:00Z');
    repo.add(79.5, '2026-01-01');
    expect(repo.latest()!.weightKg).toBe(79.5);
  });

  it('ignores tombstoned entries', () => {
    const repo = createWeightRepo(freshDb());
    const newest = repo.add(78, '2026-01-22');
    repo.add(80, '2026-01-01');
    repo.remove(newest.id);
    expect(repo.latest()!.localDate).toBe('2026-01-01');
  });
});