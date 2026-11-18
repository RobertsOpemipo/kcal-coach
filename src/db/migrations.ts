import type { SqlDriver } from './driver';

/** Append-only. Never edit a shipped migration; add a new one. */
export const MIGRATIONS: readonly string[] = [
  // 1: core tables
  `
  CREATE TABLE profile (
    id TEXT PRIMARY KEY,
    sex TEXT NOT NULL CHECK (sex IN ('male','female')),
    birth_year INTEGER NOT NULL,
    height_cm REAL NOT NULL,
    activity TEXT NOT NULL,
    goal TEXT NOT NULL CHECK (goal IN ('lose','maintain','gain')),
    units TEXT NOT NULL DEFAULT 'metric' CHECK (units IN ('metric','imperial')),
    pregnant_or_breastfeeding INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE weight_entry (
    id TEXT PRIMARY KEY,
    local_date TEXT NOT NULL,
    weight_kg REAL NOT NULL CHECK (weight_kg > 0),
    waist_cm REAL,
    body_fat_pct REAL,
    body_fat_source TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );
  CREATE INDEX idx_weight_date ON weight_entry (local_date);
  CREATE TABLE food (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    kcal_per_100g REAL NOT NULL,
    protein_per_100g REAL NOT NULL,
    carbs_per_100g REAL NOT NULL,
    fat_per_100g REAL NOT NULL,
    origin TEXT NOT NULL CHECK (origin IN ('verified','custom')),
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );
  CREATE TABLE log_entry (
    id TEXT PRIMARY KEY,
    local_date TEXT NOT NULL,
    meal TEXT NOT NULL CHECK (meal IN ('breakfast','lunch','dinner','snack')),
    food_id TEXT REFERENCES food(id),
    name TEXT NOT NULL,
    grams REAL NOT NULL CHECK (grams >= 0),
    kcal REAL NOT NULL,
    protein_g REAL NOT NULL,
    carbs_g REAL NOT NULL,
    fat_g REAL NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('manual','scan','custom','copy')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );
  CREATE INDEX idx_log_date ON log_entry (local_date);
  CREATE TABLE water_entry (
    id TEXT PRIMARY KEY,
    local_date TEXT NOT NULL,
    ml INTEGER NOT NULL CHECK (ml > 0),
    created_at TEXT NOT NULL,
    deleted_at TEXT
  );
  CREATE INDEX idx_water_date ON water_entry (local_date);
  CREATE TABLE outbox (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    entity TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    op TEXT NOT NULL CHECK (op IN ('upsert','delete')),
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0
  );
  `,
  // 2: food list fields used by search and default portions
  `
  ALTER TABLE food ADD COLUMN aliases TEXT NOT NULL DEFAULT '';
  ALTER TABLE food ADD COLUMN portion_g REAL NOT NULL DEFAULT 100;
  ALTER TABLE food ADD COLUMN portion_label TEXT NOT NULL DEFAULT '100 g';
  ALTER TABLE food ADD COLUMN needs_review INTEGER NOT NULL DEFAULT 1;
  `,
];

export function currentVersion(db: SqlDriver): number {
  return Number(db.all<{ user_version: number }>('PRAGMA user_version')[0]?.user_version ?? 0);
}

/** Applies pending migrations, each in its own transaction. Returns the new version. */
export function migrate(db: SqlDriver, migrations: readonly string[] = MIGRATIONS): number {
  let v = currentVersion(db);
  if (v > migrations.length) throw new Error(`Database is newer (v${v}) than this app (v${migrations.length})`);
  for (; v < migrations.length; v++) {
    const sql = migrations[v] as string;
    db.transaction(() => {
      db.exec(sql);
      db.exec(`PRAGMA user_version = ${v + 1}`);
    });
  }
  return v;
}
