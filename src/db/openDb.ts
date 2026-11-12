import { openDatabaseSync } from 'expo-sqlite';
import type { SqlDriver } from './driver';
import { expoDriver } from './expoDriver';
import { migrate } from './migrations';

let cached: SqlDriver | null = null;

/** Opens the on-device database and applies migrations once per launch. */
export function getDb(): SqlDriver {
  if (cached) return cached;
  const raw = openDatabaseSync('kcalcoach.db');
  raw.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const db = expoDriver(raw);
  migrate(db);
  cached = db;
  return db;
}
