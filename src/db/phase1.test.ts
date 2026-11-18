import { describe, expect, it } from 'vitest';
import { SEED_FOODS } from '../food/seed';
import { addDays, lagosHour } from './localDate';
import { createFoodRepo } from './foodRepo';
import { createLogRepo } from './logRepo';
import { migrate } from './migrations';
import { nodeDriver } from './nodeDriver.test-util';
import { ageFromBirthYear, createProfileRepo } from './profileRepo';
import { createWaterRepo } from './waterRepo';
import { notifyChange, subscribe } from './changes';

const T0 = () => new Date('2026-11-13T10:00:00Z'); // 11:00 in Lagos, 2026-11-13
const setup = () => {
  const db = nodeDriver();
  migrate(db);
  let changes = 0;
  const onChange = () => { changes++; };
  return {
    db,
    changes: () => changes,
    food: createFoodRepo(db, T0, onChange),
    log: createLogRepo(db, T0, onChange),
    water: createWaterRepo(db, T0, onChange),
    profile: createProfileRepo(db, T0, onChange),
  };
};
const meal = { meal: 'lunch', foodId: null, name: 'Jollof rice', grams: 250, kcal: 375, proteinG: 7.5, carbsG: 67.5, fatG: 8.75, source: 'manual' } as const;

describe('food repo', () => {
  it('seeds once and never overwrites', () => {
    const { food, db } = setup();
    food.seed(SEED_FOODS);
    food.seed(SEED_FOODS);
    expect(food.all()).toHaveLength(SEED_FOODS.length);
    db.run("UPDATE food SET kcal_per_100g = 999 WHERE id = 'seed-jollof-rice'");
    food.seed(SEED_FOODS);
    expect(food.get('seed-jollof-rice')?.kcalPer100g).toBe(999);
  });
  it('round-trips aliases and flags', () => {
    const { food } = setup();
    food.seed(SEED_FOODS);
    const f = food.get('seed-plantain-fried');
    expect(f?.aliases).toContain('dodo');
    expect(f?.needsReview).toBe(true);
    expect(f?.portionLabel).toBe('6 slices');
  });
  it('adds a custom food, not flagged for review, with an outbox row', () => {
    const { food, db, changes } = setup();
    const f = food.addCustom({ name: ' Mama Put stew ', kcalPer100g: 120, proteinPer100g: 4, carbsPer100g: 8, fatPer100g: 8 });
    expect(f.name).toBe('Mama Put stew');
    expect(f.origin).toBe('custom');
    expect(f.needsReview).toBe(false);
    expect(db.all('SELECT * FROM outbox WHERE entity = ?', ['food'])).toHaveLength(1);
    expect(changes()).toBe(1);
  });
});

describe('water repo', () => {
  it('adds, totals per day, undoes the latest, and notifies', () => {
    const { water, db, changes } = setup();
    water.add(250);
    water.add(500);
    water.add(250, '2026-11-12');
    expect(water.totalForDay('2026-11-13')).toBe(750);
    expect(water.undoLast('2026-11-13')).toBe(true);
    expect(water.totalForDay('2026-11-13')).toBe(250);
    expect(water.totalForDay('2026-11-12')).toBe(250);
    expect(water.undoLast('2026-01-01')).toBe(false);
    expect(db.all<{ op: string }>("SELECT op FROM outbox WHERE entity='water_entry' ORDER BY seq").map((r) => r.op)).toEqual(['upsert', 'upsert', 'upsert', 'delete']);
    expect(changes()).toBe(4);
  });
  it('rejects non-positive amounts', () => {
    const { water } = setup();
    expect(() => water.add(0)).toThrow();
  });
});

describe('profile repo', () => {
  const p = { sex: 'female', birthYear: 1995, heightCm: 165, activity: 'light', goal: 'maintain', units: 'metric', pregnantOrBreastfeeding: false } as const;
  it('is null before onboarding, then saves and updates in place', () => {
    const { profile } = setup();
    expect(profile.get()).toBeNull();
    expect(profile.latestWeightKg()).toBeNull();
    profile.save(p, 62.5);
    expect(profile.get()).toMatchObject({ sex: 'female', heightCm: 165, goal: 'maintain' });
    expect(profile.latestWeightKg()).toBe(62.5);
    profile.save({ ...p, goal: 'lose', pregnantOrBreastfeeding: true });
    expect(profile.get()).toMatchObject({ goal: 'lose', pregnantOrBreastfeeding: true });
    expect(profile.latestWeightKg()).toBe(62.5);
  });
  it('computes age from birth year in the Lagos year', () => {
    expect(ageFromBirthYear(1995, '2026-11-13')).toBe(31);
  });
});

describe('log repo, phase 1', () => {
  it('logAgain copies as source "copy" to the chosen day and meal', () => {
    const { log } = setup();
    const e = log.add(meal);
    const c = log.logAgain(e.id, { localDate: '2026-11-14', meal: 'dinner' });
    expect(c).toMatchObject({ source: 'copy', localDate: '2026-11-14', meal: 'dinner', kcal: 375 });
    expect(c?.id).not.toBe(e.id);
    expect(log.logAgain('missing')).toBeNull();
  });
  it('copyDay copies live entries only', () => {
    const { log } = setup();
    const a = log.add({ ...meal, localDate: '2026-11-12' });
    log.add({ ...meal, name: 'Akara', localDate: '2026-11-12' });
    log.remove(a.id);
    expect(log.copyDay('2026-11-12', '2026-11-13')).toBe(1);
    expect(log.forDay('2026-11-13').map((e) => e.name)).toEqual(['Akara']);
  });
  it('recent lists distinct foods newest first', () => {
    const { log } = setup();
    log.add(meal);
    log.add({ ...meal, name: 'Akara', grams: 100 });
    log.add(meal);
    expect(log.recent().map((e) => e.name)).toEqual(['Jollof rice', 'Akara']);
    expect(log.recent(1)).toHaveLength(1);
  });
  it('notifies on add and remove only when something changed', () => {
    const { log, changes } = setup();
    const e = log.add(meal);
    expect(changes()).toBe(1);
    log.remove(e.id);
    log.remove(e.id);
    expect(changes()).toBe(2);
  });
  it('logs a meal and reads it back well inside 10 seconds, offline (no network used)', () => {
    const { log } = setup();
    const t0 = performance.now();
    log.add(meal);
    expect(log.totalsForDay('2026-11-13').kcal).toBe(375);
    expect(performance.now() - t0).toBeLessThan(200);
  });
});

describe('date helpers and notifier', () => {
  it('addDays crosses month and year ends', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });
  it('lagosHour is UTC+1', () => {
    expect(lagosHour(new Date('2026-11-13T10:00:00Z'))).toBe(11);
    expect(lagosHour(new Date('2026-11-13T23:30:00Z'))).toBe(0);
  });
  it('subscribe/notify/unsubscribe', () => {
    let n = 0;
    const off = subscribe(() => { n++; });
    notifyChange();
    off();
    notifyChange();
    expect(n).toBe(1);
  });
});
