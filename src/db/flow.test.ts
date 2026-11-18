import { describe, expect, it } from 'vitest';
import { SEED_FOODS } from '../food/seed';
import { nutrientsFor } from '../food/portion';
import { searchFoods } from '../food/search';
import { summariseDay, targetForProfile } from '../health';
import { createFoodRepo } from './foodRepo';
import { createLogRepo } from './logRepo';
import { migrate } from './migrations';
import { nodeDriver } from './nodeDriver.test-util';
import { createProfileRepo, ageFromBirthYear } from './profileRepo';
import { createWaterRepo } from './waterRepo';

/** The whole phase 1 journey on a fresh database, the way the screens drive it. */
describe('phase 1 flow', () => {
  const clock = () => new Date('2026-11-13T09:00:00Z');
  const setup = () => {
    const db = nodeDriver();
    migrate(db);
    const food = createFoodRepo(db, clock);
    food.seed(SEED_FOODS);
    return { db, food, log: createLogRepo(db, clock), water: createWaterRepo(db, clock), profile: createProfileRepo(db, clock) };
  };

  it('onboard, log a meal, see the day, copy it to tomorrow', () => {
    const r = setup();
    expect(r.profile.get()).toBeNull();
    r.profile.save({ sex: 'female', birthYear: 1996, heightCm: 165, activity: 'light', goal: 'maintain', units: 'metric', pregnantOrBreastfeeding: false }, 62);
    const p = r.profile.get()!;
    expect(r.profile.latestWeightKg()).toBe(62);
    const target = targetForProfile(p, 62, ageFromBirthYear(p.birthYear, '2026-11-13'));
    expect(target.status).toBe('ok');

    const jollof = searchFoods(r.food.all(), 'jollof')[0]!;
    const n = nutrientsFor(jollof, jollof.portionG);
    const e = r.log.add({ meal: 'lunch', foodId: jollof.id, name: jollof.name, grams: jollof.portionG, kcal: n.kcal, proteinG: n.proteinG, carbsG: n.carbsG, fatG: n.fatG, source: 'manual', localDate: '2026-11-13' });
    r.water.add(250, '2026-11-13');

    const sum = summariseDay(target.kcal, target.macros, r.log.totalsForDay('2026-11-13'));
    expect(sum.eatenKcal).toBeCloseTo(n.kcal, 6);
    expect(sum.remainingKcal + Math.round(sum.eatenKcal)).toBeGreaterThanOrEqual(target.kcal - 1);
    expect(r.water.totalForDay('2026-11-13')).toBe(250);
    expect(r.log.recent()[0]?.name).toBe('Jollof rice');

    expect(r.log.copyDay('2026-11-13', '2026-11-14')).toBe(1);
    expect(r.log.forDay('2026-11-14')[0]?.source).toBe('copy');
    r.log.remove(e.id);
    expect(r.log.forDay('2026-11-13')).toHaveLength(0);
    expect(r.water.undoLast('2026-11-13')).toBe(true);
    expect(r.water.totalForDay('2026-11-13')).toBe(0);
  });

  it('a custom food can be added, found and logged', () => {
    const r = setup();
    const f = r.food.addCustom({ name: "Mama's jollof", kcalPer100g: 160, proteinPer100g: 3, carbsPer100g: 28, fatPer100g: 4, portionG: 300 });
    expect(f.origin).toBe('custom');
    expect(searchFoods(r.food.all(), 'mama')[0]?.id).toBe(f.id);
  });

  it('reseeding does not duplicate or overwrite', () => {
    const r = setup();
    r.food.seed(SEED_FOODS);
    expect(r.food.all().filter((f) => f.origin === 'verified')).toHaveLength(SEED_FOODS.length);
  });
});
