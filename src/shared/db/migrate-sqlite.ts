import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function runSqliteMigrations(db: ReturnType<typeof Database>) {
  // Create migrations tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS __migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT DEFAULT (datetime('now'))
    )
  `);

  const migrationsDir = path.join(__dirname, "migrations", "sqlite");
  if (!fs.existsSync(migrationsDir)) {
    console.warn(`[SQLite] Migrations directory not found: ${migrationsDir}`);
    return;
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const applied = db
      .prepare("SELECT 1 FROM __migrations WHERE name = ?")
      .get(file);
    if (applied) continue;

    const sqlContent = fs.readFileSync(
      path.join(migrationsDir, file),
      "utf-8",
    );

    // Wrap in transaction for atomicity
    const runMigration = db.transaction(() => {
      db.exec(sqlContent);
      db.prepare("INSERT INTO __migrations (name) VALUES (?)").run(file);
    });

    try {
      runMigration();
      console.log(`[SQLite] Applied migration: ${file}`);
    } catch (err) {
      console.error(`[SQLite] Migration failed: ${file}`, err);
      throw err;
    }
  }
}
