/**
 * SQLite Connection — Desktop Database Layer
 *
 * Singleton SQLite connection optimized for desktop (single-user) use.
 * Uses WAL mode, memory temp store, and a generous cache for fast queries.
 */

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { getDefaultSqlitePath } from "./adapter.js";

let sqliteDb: ReturnType<typeof Database> | null = null;
let drizzleDb: ReturnType<typeof drizzle> | null = null;

export function initSqliteDatabase(
  dbPath?: string,
): ReturnType<typeof drizzle> {
  const finalPath = dbPath ?? getDefaultSqlitePath();
  sqliteDb = new Database(finalPath);

  // Performance optimizations for desktop use
  sqliteDb.pragma("journal_mode = WAL");
  sqliteDb.pragma("foreign_keys = ON");
  sqliteDb.pragma("busy_timeout = 5000");
  sqliteDb.pragma("synchronous = NORMAL");
  sqliteDb.pragma("cache_size = -64000"); // 64MB cache
  sqliteDb.pragma("temp_store = MEMORY");

  drizzleDb = drizzle(sqliteDb);
  return drizzleDb;
}

export function getSqliteDb() {
  if (!drizzleDb)
    throw new Error(
      "SQLite database not initialized. Call initSqliteDatabase first.",
    );
  return drizzleDb;
}

export function getSqliteRaw(): InstanceType<typeof Database> {
  if (!sqliteDb) throw new Error("SQLite database not initialized.");
  return sqliteDb;
}

export async function closeSqliteDatabase() {
  if (sqliteDb) {
    sqliteDb.close();
    sqliteDb = null;
    drizzleDb = null;
  }
}
