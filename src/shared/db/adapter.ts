/**
 * Database Adapter Factory — Supports MySQL and SQLite
 *
 * Provides a unified interface to create a Drizzle ORM database instance
 * backed by either MySQL (for server deployment) or SQLite (for desktop).
 */

import { drizzle as drizzleMysql } from "drizzle-orm/mysql2";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import mysql from "mysql2/promise";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

export type DbDialect = "mysql" | "sqlite";

export interface DbAdapter {
  dialect: DbDialect;
  db: ReturnType<typeof drizzleMysql> | ReturnType<typeof drizzleSqlite>;
  close(): Promise<void>;
}

export async function createDbAdapter(config: {
  dialect: DbDialect;
  mysqlUrl?: string;
  sqlitePath?: string;
}): Promise<DbAdapter> {
  if (config.dialect === "mysql") {
    const pool = mysql.createPool({
      uri: config.mysqlUrl!,
      waitForConnections: true,
      connectionLimit: 20,
      queueLimit: 100,
      enableKeepAlive: true,
      keepAliveInitialDelay: 30_000,
    });

    return {
      dialect: "mysql",
      db: drizzleMysql(pool),
      close: () => pool.end(),
    };
  }

  // SQLite (default for desktop)
  const dbPath = config.sqlitePath ?? getDefaultSqlitePath();
  const dir = path.dirname(dbPath);
  fs.mkdirSync(dir, { recursive: true });

  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("synchronous = NORMAL");

  return {
    dialect: "sqlite",
    db: drizzleSqlite(sqlite),
    close: async () => { sqlite.close(); },
  };
}

export function getDefaultSqlitePath(): string {
  const appData =
    process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
  const dir = path.join(appData, "GRC", "data");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "grc.db");
}
