import { SEED_FOODS } from '../food/seed';
import { getDb } from './openDb';
import { notifyChange } from './changes';
import { createFoodRepo } from './foodRepo';
import { createLogRepo } from './logRepo';
import { createProfileRepo } from './profileRepo';
import { createWaterRepo } from './waterRepo';

const now = () => new Date();

function build() {
  const db = getDb();
  const food = createFoodRepo(db, now, notifyChange);
  food.seed(SEED_FOODS);
  return {
    db,
    food,
    log: createLogRepo(db, now, notifyChange),
    water: createWaterRepo(db, now, notifyChange),
    profile: createProfileRepo(db, now, notifyChange),
  };
}

let cached: ReturnType<typeof build> | null = null;

/** The one place screens get their repos. Opens the DB, migrates and seeds once per launch. */
export function repos() {
  return (cached ??= build());
}
