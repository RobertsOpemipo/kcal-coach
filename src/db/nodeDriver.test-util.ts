import { DatabaseSync } from 'node:sqlite';
import type { SqlDriver, SqlValue } from './driver';

/** Test-only driver on Node's built-in SQLite. */
export function nodeDriver(): SqlDriver {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  return {
    exec: (sql) => db.exec(sql),
    run: (sql, params = []) => void db.prepare(sql).run(...params),
    all: <T,>(sql: string, params: SqlValue[] = []) => db.prepare(sql).all(...params) as unknown as T[],
    transaction: <T,>(fn: () => T): T => {
      db.exec('BEGIN');
      try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
    },
  };
}
