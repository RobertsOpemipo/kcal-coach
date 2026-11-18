import type { Food } from '../contracts';

/**
 * Built-in starter foods, per 100 g, for plain cooked or ready-to-eat forms.
 * NEEDS EXPERT REVIEW: values are rough, written from general knowledge. A registered
 * dietitian must check every row (and recipes vary by cook) before release. Ids are
 * stable: never rename one, because log entries may point to it.
 */
type Row = [name: string, aliases: string, kcal: number, p: number, c: number, f: number, portionG: number, portionLabel: string];

const ROWS: Row[] = [
  ["Jollof rice", "jollof", 150, 3, 27, 3.5, 250, "1 plate"],
  ["White rice, boiled", "rice plain rice", 130, 2.7, 28, 0.3, 200, "1 plate"],
  ["Fried rice", "", 165, 4, 25, 5.5, 250, "1 plate"],
  ["Coconut rice", "", 175, 3, 27, 6, 250, "1 plate"],
  ["Tuwo shinkafa", "tuwo rice", 130, 2.5, 28, 0.3, 250, "1 wrap"],
  ["Beans, boiled", "ewa beans cowpeas", 116, 7.7, 20.8, 0.5, 200, "1 plate"],
  ["Moi moi", "moin moin steamed bean pudding", 140, 9, 15, 5, 150, "1 wrap"],
  ["Akara", "bean cake bean fritters", 250, 10, 22, 14, 100, "4 pieces"],
  ["Yam, boiled", "", 118, 1.5, 28, 0.2, 200, "2 slices"],
  ["Yam, fried", "fried yam", 190, 2, 30, 7, 150, "4 pieces"],
  ["Pounded yam", "iyan swallow", 120, 2, 28, 0.2, 300, "1 wrap"],
  ["Amala", "swallow yam flour", 115, 1.5, 26, 0.2, 300, "1 wrap"],
  ["Eba", "garri swallow", 155, 0.6, 37, 0.2, 300, "1 wrap"],
  ["Fufu", "akpu swallow cassava", 140, 0.8, 34, 0.2, 300, "1 wrap"],
  ["Semo", "semovita swallow", 135, 4, 28, 0.5, 300, "1 wrap"],
  ["Egusi soup", "egusi melon seed soup", 190, 9, 5, 16, 200, "1 serving"],
  ["Efo riro", "spinach soup vegetable soup", 120, 6, 4, 9, 200, "1 serving"],
  ["Okra soup", "okro soup", 70, 4, 6, 3.5, 200, "1 serving"],
  ["Ogbono soup", "draw soup", 170, 7, 6, 14, 200, "1 serving"],
  ["Tomato stew", "pepper stew ata stew sauce", 100, 2, 6, 7.5, 100, "4 tbsp"],
  ["Beef, boiled", "meat cow", 200, 26, 0, 11, 60, "1 piece"],
  ["Goat meat, cooked", "meat", 143, 27, 0, 3, 60, "1 piece"],
  ["Chicken, fried", "fried chicken", 245, 22, 6, 14, 150, "1 thigh"],
  ["Chicken breast, grilled", "grilled chicken", 165, 31, 0, 3.6, 150, "1 breast"],
  ["Fish, fried", "tilapia fried fish titus", 190, 24, 3, 9, 120, "1 fish"],
  ["Suya", "beef suya", 250, 25, 5, 15, 100, "1 stick"],
  ["Pepper soup, goat", "peppersoup", 60, 7, 2, 3, 300, "1 bowl"],
  ["Plantain, fried", "dodo", 220, 1.5, 36, 9, 120, "6 slices"],
  ["Plantain, boiled", "", 120, 1, 31, 0.2, 150, "1 plantain"],
  ["Plantain, roasted", "boli", 140, 1.3, 34, 0.3, 200, "1 plantain"],
  ["Bread, white", "agege bread slice", 265, 9, 49, 3.2, 40, "1 slice"],
  ["Egg, boiled", "", 155, 13, 1.1, 11, 50, "1 egg"],
  ["Egg, fried", "", 196, 13.6, 0.8, 15, 50, "1 egg"],
  ["Pap", "ogi akamu custard", 55, 1, 12, 0.3, 300, "1 bowl"],
  ["Oat porridge", "oats oatmeal", 71, 2.5, 12, 1.5, 300, "1 bowl"],
  ["Puff puff", "", 330, 5, 40, 17, 40, "1 ball"],
  ["Chin chin", "", 480, 7, 60, 23, 50, "1 handful"],
  ["Meat pie", "", 300, 8, 30, 17, 120, "1 pie"],
  ["Noodles, cooked", "indomie instant noodles", 140, 4, 20, 5, 200, "1 pack"],
  ["Spaghetti, jollof", "", 160, 4, 25, 5, 250, "1 plate"],
  ["Sweet potato, boiled", "", 90, 1.6, 21, 0.1, 200, "1 medium"],
  ["Banana", "", 89, 1.1, 23, 0.3, 120, "1 medium"],
  ["Orange", "", 47, 0.9, 12, 0.1, 130, "1 medium"],
  ["Pineapple", "", 50, 0.5, 13, 0.1, 150, "1 slice"],
  ["Watermelon", "", 30, 0.6, 8, 0.2, 250, "1 wedge"],
  ["Mango", "", 60, 0.8, 15, 0.4, 200, "1 medium"],
  ["Pawpaw", "papaya", 43, 0.5, 11, 0.3, 200, "1 slice"],
  ["Groundnuts, roasted", "peanuts", 585, 24, 21, 50, 30, "1 handful"],
  ["Milk, whole", "", 61, 3.2, 4.8, 3.3, 200, "1 glass"],
  ["Soft drink", "soda coke fanta", 42, 0, 10.6, 0, 350, "1 bottle"],
  ["Beer", "", 43, 0.5, 3.6, 0, 330, "1 bottle"],
  ["Cooking oil", "vegetable oil palm oil", 884, 0, 0, 100, 15, "1 tbsp"],
];

const slug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const SEED_FOODS: Food[] = ROWS.map(([name, aliases, kcal, p, c, f, portionG, portionLabel]) => ({
  id: `seed-${slug(name)}`,
  name,
  aliases: aliases ? aliases.split(' ') : [],
  kcalPer100g: kcal,
  proteinPer100g: p,
  carbsPer100g: c,
  fatPer100g: f,
  portionG,
  portionLabel,
  origin: 'verified',
  needsReview: true,
}));
