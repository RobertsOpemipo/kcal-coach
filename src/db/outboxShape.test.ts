// src/db/outboxShape.test.ts
import { describe, it, expect } from 'vitest';
import { createProfileRepo } from './profileRepo';
import { createWeightRepo } from './weightRepo';
import { nodeDriver } from './nodeDriver.test-util';
import { migrate } from './migrations';
import type { SqlDriver } from './driver';

function freshDb(): SqlDriver {
  const db = nodeDriver();
  migrate(db);
  return db;
}

describe('weight_entry outbox payload shape (D20)', () => {
  it('weightRepo.add and profileRepo.save(profile, weightKg) produce the same WeightEntry payload keys', () => {
    const db = freshDb();
    const weightRepo = createWeightRepo(db);
    const profileRepo = createProfileRepo(db);

    // Path A: weightRepo.add
    weightRepo.add(80, '2026-01-01');

    // Path B: profileRepo.save with weightKg
    profileRepo.save(
      {
        sex: 'male', birthYear: 1990, heightCm: 175, activity: 'moderate',
        goal: 'maintain', units: 'metric', pregnantOrBreastfeeding: false,
      },
      79.5,
    );

    const rows = db.all<{ entity_id: string; payload: string }>(
      `SELECT entity_id, payload FROM outbox WHERE entity = 'weight_entry' ORDER BY seq`,
    );
    expect(rows.length).toBe(2);

    const parsedA = JSON.parse(rows[0]!.payload) as Record<string, unknown>;
    const parsedB = JSON.parse(rows[1]!.payload) as Record<string, unknown>;

    const EXPECTED_KEYS = [
      'bodyFatPct', 'bodyFatSource', 'createdAt', 'deletedAt', 'id',
      'localDate', 'updatedAt', 'waistCm', 'weightKg',
    ];
    expect(Object.keys(parsedA).sort()).toEqual(EXPECTED_KEYS);
    expect(Object.keys(parsedB).sort()).toEqual(EXPECTED_KEYS);
    expect(Object.keys(parsedA).sort()).toEqual(Object.keys(parsedB).sort());

    // Values must be meaningful, not placeholders
    expect(parsedA.weightKg).toBe(80);
    expect(parsedB.weightKg).toBe(79.5);
    expect(parsedB.waistCm).toBeNull();
    expect(parsedB.bodyFatPct).toBeNull();
    expect(parsedB.bodyFatSource).toBeNull();
    expect(parsedB.deletedAt).toBeNull();
  });
});