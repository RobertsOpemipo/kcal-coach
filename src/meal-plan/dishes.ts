// src/meal-plan/dishes.ts
import type { Dish } from '../contracts';

/**
 * 25 sample dishes built from `src/food/seed.ts`.
 *
 * Every macro was computed from `SEED_FOODS`: `kcal = Σ(grams/100 × seed.kcalPer100g)`,
 * same for protein, carbs, fat. `dishes.test.ts` re-checks this on every run.
 *
 * Appliance tags: `[]` means "no specific appliance required — any heat source
 * or none is fine". `['gas_stove']` means the recipe is gas-specific in our
 * data; same for `['oven']`. This lets users without a gas stove still get a
 * full plan (non-gas pools per slot: 6 breakfast, 10 lunch/dinner, 3 snack).
 *
 * Every dish is `needsReview: true`. `batchCook: true` means the recipe can be
 * cooked in a larger batch ahead of time — no refrigeration implied, and no
 * dish is marked `fridgeDependent`.
 */

export const SEED_DISHES: readonly Dish[] = [
  // ---------- breakfast ----------

  {
    id: 'dish-akara-pap',
    name: 'Akara & pap',
    mealSlots: ['breakfast'],
    ingredients: [
      { foodId: 'seed-akara', grams: 100, section: 'proteins' },
      { foodId: 'seed-pap', grams: 300, section: 'grains_and_tubers' },
    ],
    kcal: 415, proteinG: 13, carbsG: 58, fatG: 14.9,
    allergenTags: [],
    requiredAppliances: ['gas_stove'],
    fridgeDependent: false,
    batchCook: false,
    prepSteps: [
      'Soak and blend beans into a smooth batter',
      'Fry spoonfuls in hot oil until golden',
      'Cook pap from fermented corn until thick',
      'Serve akara with hot pap',
    ],
    needsReview: true,
  },

  {
    id: 'dish-yam-egg-sauce',
    name: 'Boiled yam & egg sauce',
    mealSlots: ['breakfast'],
    ingredients: [
      { foodId: 'seed-yam-boiled', grams: 200, section: 'grains_and_tubers' },
      { foodId: 'seed-egg-boiled', grams: 50, section: 'dairy_and_eggs' },
      { foodId: 'seed-tomato-stew', grams: 100, section: 'vegetables_and_peppers' },
    ],
    kcal: 413.5, proteinG: 11.5, carbsG: 62.55, fatG: 13.4,
    allergenTags: ['egg'],
    requiredAppliances: [],
    fridgeDependent: false,
    batchCook: false,
    prepSteps: [
      'Boil yam slices until tender',
      'Boil egg and cut into pieces',
      'Warm tomato stew and add egg',
      'Serve over yam',
    ],
    needsReview: true,
  },

  {
    id: 'dish-bread-egg-milk',
    name: 'Bread, fried egg & milk',
    mealSlots: ['breakfast'],
    ingredients: [
      { foodId: 'seed-bread-white', grams: 80, section: 'grains_and_tubers' },
      { foodId: 'seed-egg-fried', grams: 50, section: 'dairy_and_eggs' },
      { foodId: 'seed-milk-whole', grams: 200, section: 'dairy_and_eggs' },
    ],
    kcal: 432, proteinG: 20.4, carbsG: 49.2, fatG: 16.66,
    allergenTags: ['egg', 'milk', 'wheat'],
    requiredAppliances: [],
    fridgeDependent: false,
    batchCook: false,
    prepSteps: [
      'Fry egg in a little oil',
      'Toast bread slices',
      'Pour a glass of milk',
      'Serve together',
    ],
    needsReview: true,
  },

  {
    id: 'dish-oat-milk',
    name: 'Oat porridge & milk',
    mealSlots: ['breakfast'],
    ingredients: [
      { foodId: 'seed-oat-porridge', grams: 300, section: 'grains_and_tubers' },
      { foodId: 'seed-milk-whole', grams: 200, section: 'dairy_and_eggs' },
    ],
    kcal: 335, proteinG: 13.9, carbsG: 45.6, fatG: 11.1,
    allergenTags: ['milk'],
    requiredAppliances: [],
    fridgeDependent: false,
    batchCook: false,
    prepSteps: [
      'Boil water and stir in oats',
      'Cook 3–5 min until thick',
      'Stir in milk and a pinch of salt',
      'Serve warm',
    ],
    needsReview: true,
  },

  {
    id: 'dish-moi-moi-pap',
    name: 'Moi moi & pap',
    mealSlots: ['breakfast'],
    ingredients: [
      { foodId: 'seed-moi-moi', grams: 150, section: 'proteins' },
      { foodId: 'seed-pap', grams: 300, section: 'grains_and_tubers' },
    ],
    kcal: 375, proteinG: 16.5, carbsG: 58.5, fatG: 8.4,
    allergenTags: [],
    requiredAppliances: ['gas_stove'],
    fridgeDependent: false,
    batchCook: true,
    prepSteps: [
      'Blend beans with pepper and oil',
      'Steam in leaves or foil until set',
      'Cook pap from fermented corn until thick',
      'Serve moi moi with pap',
    ],
    needsReview: true,
  },

  {
    id: 'dish-plantain-egg',
    name: 'Fried plantain & fried egg',
    mealSlots: ['breakfast'],
    ingredients: [
      { foodId: 'seed-plantain-fried', grams: 120, section: 'grains_and_tubers' },
      { foodId: 'seed-egg-fried', grams: 50, section: 'dairy_and_eggs' },
    ],
    kcal: 362, proteinG: 8.6, carbsG: 43.6, fatG: 18.3,
    allergenTags: ['egg'],
    requiredAppliances: [],
    fridgeDependent: false,
    batchCook: false,
    prepSteps: [
      'Peel and slice ripe plantain',
      'Fry slices until golden on both sides',
      'Fry egg in a separate pan',
      'Serve together',
    ],
    needsReview: true,
  },

  {
    id: 'dish-moi-moi-egg',
    name: 'Moi moi & boiled egg',
    mealSlots: ['breakfast'],
    ingredients: [
      { foodId: 'seed-moi-moi', grams: 150, section: 'proteins' },
      { foodId: 'seed-egg-boiled', grams: 50, section: 'dairy_and_eggs' },
    ],
    kcal: 287.5, proteinG: 20, carbsG: 23.05, fatG: 13,
    allergenTags: ['egg'],
    requiredAppliances: [],
    fridgeDependent: false,
    batchCook: true,
    prepSteps: [
      'Blend beans with pepper and oil',
      'Steam in leaves or foil until set',
      'Boil egg and slice',
      'Serve moi moi with boiled egg',
    ],
    needsReview: true,
  },

  {
    id: 'dish-egg-bread-milk',
    name: 'Bread, boiled egg & milk',
    mealSlots: ['breakfast'],
    ingredients: [
      { foodId: 'seed-bread-white', grams: 100, section: 'grains_and_tubers' },
      { foodId: 'seed-egg-boiled', grams: 100, section: 'dairy_and_eggs' },
      { foodId: 'seed-milk-whole', grams: 200, section: 'dairy_and_eggs' },
    ],
    kcal: 542, proteinG: 28.4, carbsG: 59.7, fatG: 20.8,
    allergenTags: ['egg', 'milk', 'wheat'],
    requiredAppliances: [],
    fridgeDependent: false,
    batchCook: false,
    prepSteps: [
      'Boil eggs and cool',
      'Slice bread and serve with eggs',
      'Pour a glass of milk alongside',
    ],
    needsReview: true,
  },

  // ---------- lunch & dinner ----------

  {
    id: 'dish-jollof-chicken',
    name: 'Jollof rice & fried chicken',
    mealSlots: ['lunch', 'dinner'],
    ingredients: [
      { foodId: 'seed-jollof-rice', grams: 250, section: 'grains_and_tubers' },
      { foodId: 'seed-chicken-fried', grams: 150, section: 'proteins' },
    ],
    kcal: 742.5, proteinG: 40.5, carbsG: 76.5, fatG: 29.75,
    allergenTags: [],
    requiredAppliances: ['gas_stove'],
    fridgeDependent: false,
    batchCook: true,
    prepSteps: [
      'Season chicken and fry until crisp',
      'Cook jollof rice with peppers and stock',
      'Plate rice with chicken on top',
    ],
    needsReview: true,
  },

  {
    id: 'dish-rice-egusi-beef',
    name: 'White rice, egusi & beef',
    mealSlots: ['lunch', 'dinner'],
    ingredients: [
      { foodId: 'seed-white-rice-boiled', grams: 200, section: 'grains_and_tubers' },
      { foodId: 'seed-egusi-soup', grams: 200, section: 'proteins' },
      { foodId: 'seed-beef-boiled', grams: 60, section: 'proteins' },
    ],
    kcal: 760, proteinG: 39, carbsG: 66, fatG: 39.2,
    allergenTags: [],
    requiredAppliances: [],
    fridgeDependent: false,
    batchCook: true,
    prepSteps: [
      'Cook egusi soup with ground melon seeds and greens',
      'Boil beef until tender',
      'Cook white rice',
      'Serve rice with soup and beef',
    ],
    needsReview: true,
  },

  {
    id: 'dish-pounded-efo-goat',
    name: 'Pounded yam, efo riro & goat',
    mealSlots: ['lunch', 'dinner'],
    ingredients: [
      { foodId: 'seed-pounded-yam', grams: 300, section: 'grains_and_tubers' },
      { foodId: 'seed-efo-riro', grams: 200, section: 'vegetables_and_peppers' },
      { foodId: 'seed-goat-meat-cooked', grams: 60, section: 'proteins' },
    ],
    kcal: 685.8, proteinG: 34.2, carbsG: 92, fatG: 20.4,
    allergenTags: [],
    requiredAppliances: ['gas_stove'],
    fridgeDependent: false,
    batchCook: true,
    prepSteps: [
      'Boil goat meat until tender',
      'Cook efo riro with spinach, pepper and palm oil',
      'Pound cooked yam (or use ready-pounded)',
      'Serve pounded yam with soup and goat',
    ],
    needsReview: true,
  },

  {
    id: 'dish-eba-okra-fish',
    name: 'Eba, okra soup & fried fish',
    mealSlots: ['lunch', 'dinner'],
    ingredients: [
      { foodId: 'seed-eba', grams: 300, section: 'grains_and_tubers' },
      { foodId: 'seed-okra-soup', grams: 200, section: 'vegetables_and_peppers' },
      { foodId: 'seed-fish-fried', grams: 120, section: 'proteins' },
    ],
    kcal: 833, proteinG: 38.6, carbsG: 126.6, fatG: 18.4,
    allergenTags: ['fish'],
    requiredAppliances: [],
    fridgeDependent: false,
    batchCook: true,
    prepSteps: [
      'Cook okra soup with ground crayfish and pepper',
      'Make eba from garri and hot water',
      'Fry fish until crisp',
      'Serve eba with soup and fish',
    ],
    needsReview: true,
  },

  {
    id: 'dish-amala-ogbono-goat',
    name: 'Amala, ogbono & goat',
    mealSlots: ['lunch', 'dinner'],
    ingredients: [
      { foodId: 'seed-amala', grams: 300, section: 'grains_and_tubers' },
      { foodId: 'seed-ogbono-soup', grams: 200, section: 'proteins' },
      { foodId: 'seed-goat-meat-cooked', grams: 60, section: 'proteins' },
    ],
    kcal: 770.8, proteinG: 34.7, carbsG: 90, fatG: 30.4,
    allergenTags: [],
    requiredAppliances: [],
    fridgeDependent: false,
    batchCook: true,
    prepSteps: [
      'Boil goat meat until tender',
      'Cook ogbono soup with ground ogbono seeds',
      'Make amala with yam flour and hot water',
      'Serve with goat and soup',
    ],
    needsReview: true,
  },

  {
    id: 'dish-friedrice-grilledchicken',
    name: 'Fried rice & grilled chicken',
    mealSlots: ['lunch', 'dinner'],
    ingredients: [
      { foodId: 'seed-fried-rice', grams: 250, section: 'grains_and_tubers' },
      { foodId: 'seed-chicken-breast-grilled', grams: 150, section: 'proteins' },
    ],
    kcal: 660, proteinG: 56.5, carbsG: 62.5, fatG: 19.15,
    allergenTags: [],
    requiredAppliances: ['oven'],
    fridgeDependent: false,
    batchCook: false,
    prepSteps: [
      'Season chicken breast and grill until cooked',
      'Cook fried rice with mixed vegetables',
      'Plate rice and chicken together',
    ],
    needsReview: true,
  },

  {
    id: 'dish-beans-plantain',
    name: 'Beans & fried plantain',
    mealSlots: ['lunch', 'dinner'],
    ingredients: [
      { foodId: 'seed-beans-boiled', grams: 200, section: 'proteins' },
      { foodId: 'seed-plantain-fried', grams: 120, section: 'grains_and_tubers' },
    ],
    kcal: 496, proteinG: 17.2, carbsG: 84.8, fatG: 11.8,
    allergenTags: [],
    requiredAppliances: [],
    fridgeDependent: false,
    batchCook: true,
    prepSteps: [
      'Boil beans until soft',
      'Fry plantain slices until golden',
      'Serve beans with fried plantain',
    ],
    needsReview: true,
  },

  {
    id: 'dish-suya-yam',
    name: 'Suya & boiled yam',
    mealSlots: ['lunch', 'dinner'],
    ingredients: [
      { foodId: 'seed-suya', grams: 100, section: 'proteins' },
      { foodId: 'seed-yam-boiled', grams: 200, section: 'grains_and_tubers' },
    ],
    kcal: 486, proteinG: 28, carbsG: 61, fatG: 15.4,
    allergenTags: ['peanut'],
    requiredAppliances: [],
    fridgeDependent: false,
    batchCook: false,
    prepSteps: [
      'Buy or grill suya on skewers',
      'Boil yam slices until tender',
      'Serve suya with yam on the side',
    ],
    needsReview: true,
  },

  {
    id: 'dish-noodles-egg',
    name: 'Noodles & fried egg',
    mealSlots: ['lunch', 'dinner'],
    ingredients: [
      { foodId: 'seed-noodles-cooked', grams: 200, section: 'grains_and_tubers' },
      { foodId: 'seed-egg-fried', grams: 50, section: 'dairy_and_eggs' },
    ],
    kcal: 378, proteinG: 14.8, carbsG: 40.4, fatG: 17.5,
    allergenTags: ['egg', 'wheat'],
    requiredAppliances: [],
    fridgeDependent: false,
    batchCook: false,
    prepSteps: [
      'Boil noodles with seasoning',
      'Fry egg separately',
      'Serve noodles topped with egg',
    ],
    needsReview: true,
  },

  {
    id: 'dish-spaghetti-fish',
    name: 'Jollof spaghetti & fried fish',
    mealSlots: ['lunch', 'dinner'],
    ingredients: [
      { foodId: 'seed-spaghetti-jollof', grams: 250, section: 'grains_and_tubers' },
      { foodId: 'seed-fish-fried', grams: 120, section: 'proteins' },
    ],
    kcal: 628, proteinG: 38.8, carbsG: 66.1, fatG: 23.3,
    allergenTags: ['fish', 'wheat'],
    requiredAppliances: [],
    fridgeDependent: false,
    batchCook: false,
    prepSteps: [
      'Cook spaghetti with pepper and tomato base',
      'Fry fish until crisp',
      'Plate spaghetti with fish',
    ],
    needsReview: true,
  },

  {
    id: 'dish-beans-egg',
    name: 'Beans & fried egg',
    mealSlots: ['lunch', 'dinner'],
    ingredients: [
      { foodId: 'seed-beans-boiled', grams: 200, section: 'proteins' },
      { foodId: 'seed-egg-fried', grams: 50, section: 'dairy_and_eggs' },
    ],
    kcal: 330, proteinG: 22.2, carbsG: 42, fatG: 8.5,
    allergenTags: ['egg'],
    requiredAppliances: [],
    fridgeDependent: false,
    batchCook: true,
    prepSteps: [
      'Boil beans until soft',
      'Fry egg in a small pan',
      'Serve beans topped with fried egg',
    ],
    needsReview: true,
  },

  {
    id: 'dish-chicken-pepper-soup',
    name: 'Chicken pepper soup',
    mealSlots: ['lunch', 'dinner'],
    ingredients: [
      // Uses the goat pepper-soup base with fried chicken for a chicken
      // pepper-soup variant. Approximation; dietitian to review.
      { foodId: 'seed-pepper-soup-goat', grams: 300, section: 'proteins' },
      { foodId: 'seed-chicken-fried', grams: 150, section: 'proteins' },
    ],
    kcal: 547.5, proteinG: 54, carbsG: 15, fatG: 30,
    allergenTags: [],
    requiredAppliances: [],
    fridgeDependent: false,
    batchCook: true,
    prepSteps: [
      'Simmer pepper soup base with stock',
      'Add fried chicken pieces and warm through',
      'Serve hot in a bowl',
    ],
    needsReview: true,
  },

  {
    id: 'dish-fish-pepper-soup',
    name: 'Fish pepper soup',
    mealSlots: ['lunch', 'dinner'],
    ingredients: [
      { foodId: 'seed-pepper-soup-goat', grams: 300, section: 'proteins' },
      { foodId: 'seed-fish-fried', grams: 120, section: 'proteins' },
    ],
    kcal: 408, proteinG: 49.8, carbsG: 9.6, fatG: 19.8,
    allergenTags: ['fish'],
    requiredAppliances: [],
    fridgeDependent: false,
    batchCook: true,
    prepSteps: [
      'Simmer pepper soup base with stock',
      'Add fried fish pieces and warm through',
      'Serve hot in a bowl',
    ],
    needsReview: true,
  },

  // ---------- snacks ----------

  {
    id: 'dish-banana',
    name: 'Banana',
    mealSlots: ['snack'],
    ingredients: [
      { foodId: 'seed-banana', grams: 120, section: 'fruit' },
    ],
    kcal: 106.8, proteinG: 1.32, carbsG: 27.6, fatG: 0.36,
    allergenTags: [],
    requiredAppliances: [],
    fridgeDependent: false,
    batchCook: false,
    prepSteps: [
      'Peel banana',
      'Eat fresh',
    ],
    needsReview: true,
  },

  {
    id: 'dish-puff-puff',
    name: 'Puff puff (3 balls)',
    mealSlots: ['snack'],
    ingredients: [
      { foodId: 'seed-puff-puff', grams: 120, section: 'grains_and_tubers' },
    ],
    kcal: 396, proteinG: 6, carbsG: 48, fatG: 20.4,
    allergenTags: ['wheat'],
    requiredAppliances: ['gas_stove'],
    fridgeDependent: false,
    batchCook: true,
    prepSteps: [
      'Mix flour, yeast, sugar and water into a batter',
      'Let rise until bubbly',
      'Deep-fry spoonfuls until golden',
    ],
    needsReview: true,
  },

  {
    id: 'dish-groundnuts',
    name: 'Roasted groundnuts (handful)',
    mealSlots: ['snack'],
    ingredients: [
      { foodId: 'seed-groundnuts-roasted', grams: 30, section: 'oils_and_seasonings' },
    ],
    kcal: 175.5, proteinG: 7.2, carbsG: 6.3, fatG: 15,
    allergenTags: ['peanut'],
    requiredAppliances: [],
    fridgeDependent: false,
    batchCook: true,
    prepSteps: [
      'Shell roasted groundnuts',
      'Eat as a snack',
    ],
    needsReview: true,
  },

  {
    id: 'dish-sweet-potato',
    name: 'Boiled sweet potato',
    mealSlots: ['snack'],
    ingredients: [
      { foodId: 'seed-sweet-potato-boiled', grams: 200, section: 'grains_and_tubers' },
    ],
    kcal: 180, proteinG: 3.2, carbsG: 42, fatG: 0.2,
    allergenTags: [],
    requiredAppliances: [],
    fridgeDependent: false,
    batchCook: true,
    prepSteps: [
      'Boil sweet potato until tender',
      'Peel and serve warm',
    ],
    needsReview: true,
  },
];

/** Lookup by dish id. */
export const DISHES_BY_ID: ReadonlyMap<string, Dish> = new Map(
  SEED_DISHES.map((d) => [d.id, d]),
);