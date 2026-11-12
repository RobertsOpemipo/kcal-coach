import type { SQLiteDatabase } from 'expo-sqlite';
import type { SqlDriver, SqlValue } from './driver';

export function expoDriver(db: SQLiteDatabase): SqlDriver {
  return {
    exec: (sql) => db.execSync(sql),
    run: (sql, params = []) => void db.runSync(sql, params),
    all: <T,>(sql: string, params: SqlValue[] = []) => db.getAllSync(sql, params) as T[],
    transaction: <T,>(fn: () => T): T => {
      let out!: T;
      db.withTransactionSync(() => { out = fn(); });
      return out;
    },
  };
}
