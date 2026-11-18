import type { Food } from '../contracts';
import type { SqlDriver } from './driver';
import { newId } from './id';

interface Row {
  id: string; name: string; aliases: string; kcal_per_100g: number; protein_per_100g: number;
  carbs_per_100g: number; fat_per_100g: number; portion_g: number; portion_label: string;
  origin: Food['origin']; needs_review: number;
}

const toFood = (r: Row): Food => ({
  id: r.id, name: r.name, aliases: r.aliases ? r.aliases.split(' ') : [],
  kcalPer100g: r.kcal_per_100g, proteinPer100g: r.protein_per_100g, carbsPer100g: r.carbs_per_100g,
  fatPer100g: r.fat_per_100g, portionG: r.portion_g, portionLabel: r.portion_label,
  origin: r.origin, needsReview: r.needs_review === 1,
});

export interface NewCustomFood {
  name: string; kcalPer100g: number; proteinPer100g: number; carbsPer100g: number; fatPer100g: number;
  portionG?: number;
}

export function createFoodRepo(db: SqlDriver, now: () => Date = () => new Date(), onChange: () => void = () => {}) {
  const api = {
    /** Inserts built-in foods that are not there yet. Never overwrites a row (ids are stable). */
    seed(foods: readonly Food[]): void {
      const ts = now().toISOString();
      db.transaction(() => {
        for (const f of foods) {
          db.run(
            `INSERT OR IGNORE INTO food (id, name, aliases, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, portion_g, portion_label, origin, needs_review, updated_at)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
            [f.id, f.name, f.aliases.join(' '), f.kcalPer100g, f.proteinPer100g, f.carbsPer100g, f.fatPer100g,
              f.portionG, f.portionLabel, f.origin, f.needsReview ? 1 : 0, ts]);
        }
      });
    },
    all(): Food[] {
      return db.all<Row>('SELECT * FROM food WHERE deleted_at IS NULL ORDER BY name').map(toFood);
    },
    get(id: string): Food | null {
      const r = db.all<Row>('SELECT * FROM food WHERE id = ?', [id])[0];
      return r ? toFood(r) : null;
    },
    addCustom(input: NewCustomFood): Food {
      const id = newId();
      const portionG = input.portionG ?? 100;
      const ts = now().toISOString();
      db.transaction(() => {
        db.run(
          `INSERT INTO food (id, name, aliases, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, portion_g, portion_label, origin, needs_review, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
          [id, input.name.trim(), '', input.kcalPer100g, input.proteinPer100g, input.carbsPer100g, input.fatPer100g,
            portionG, `${portionG} g`, 'custom', 0, ts]);
        db.run('INSERT INTO outbox (entity, entity_id, op, payload, created_at) VALUES (?,?,?,?,?)',
          ['food', id, 'upsert', JSON.stringify({ id, ...input }), ts]);
      });
      onChange();
      return api.get(id) as Food;
    },
  };
  return api;
}
