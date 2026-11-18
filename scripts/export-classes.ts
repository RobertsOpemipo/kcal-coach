// Writes training/classes.txt: the food ids the scan model should learn, one per line.
// Run: node --experimental-strip-types scripts/export-classes.ts
// Drinks, oils and milk are excluded: a photo cannot tell them apart usefully.
import { writeFileSync } from 'node:fs';
import { SEED_FOODS } from '../src/food/seed.ts';

const EXCLUDE = new Set(['seed-cooking-oil', 'seed-beer', 'seed-soft-drink', 'seed-milk-whole']);
const ids = SEED_FOODS.map((f) => f.id).filter((id) => !EXCLUDE.has(id));
writeFileSync(new URL('../training/classes.txt', import.meta.url), ids.join('\n') + '\n');
console.log(`${ids.length} classes written to training/classes.txt`);
