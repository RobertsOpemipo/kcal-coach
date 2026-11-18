import type { Food } from '../contracts';

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/** Higher is better; 0 means no match. */
function score(food: Food, q: string): number {
  const name = norm(food.name);
  const terms = [name, ...food.aliases.map(norm)];
  let best = 0;
  for (const t of terms) {
    if (t === q) best = Math.max(best, 100);
    else if (t.startsWith(q)) best = Math.max(best, 80);
    else if (t.split(' ').some((w) => w.startsWith(q))) best = Math.max(best, 60);
    else if (t.includes(q)) best = Math.max(best, 40);
  }
  if (best === 0) {
    // every query word must match the start of some word in the name or an alias
    const qs = q.split(' ');
    const words = terms.flatMap((t) => t.split(' '));
    if (qs.length > 1 && qs.every((w) => words.some((x) => x.startsWith(w)))) best = 30;
  }
  return best;
}

export function searchFoods(foods: readonly Food[], query: string, limit = 25): Food[] {
  const q = norm(query);
  if (!q) return [];
  return foods
    .map((f) => ({ f, s: score(f, q) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.f.name.length - b.f.name.length || a.f.name.localeCompare(b.f.name))
    .slice(0, limit)
    .map((x) => x.f);
}
