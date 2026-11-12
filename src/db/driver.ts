/** Minimal sync SQL surface so the same code runs on expo-sqlite (device) and node:sqlite (tests). */
export type SqlValue = string | number | null;
export interface SqlDriver {
  exec(sql: string): void;
  run(sql: string, params?: SqlValue[]): void;
  all<T = Record<string, SqlValue>>(sql: string, params?: SqlValue[]): T[];
  /** Run fn inside a transaction; rolls back if it throws. */
  transaction<T>(fn: () => T): T;
}
