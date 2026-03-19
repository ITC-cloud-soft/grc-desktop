#!/usr/bin/env node
/**
 * Apply migrations 027 (roadmap) and 028 (kpis) to the live database.
 */
import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_URL = "mysql://root:Admin123@13.78.81.86:18306/grc-server";

async function main() {
  console.log("Connecting to database...");
  const conn = await mysql.createConnection(DB_URL);

  const migrations = [
    path.join(__dirname, "../src/shared/db/migrations/027_roadmap.sql"),
    path.join(__dirname, "../src/shared/db/migrations/028_kpis.sql"),
  ];

  for (const filePath of migrations) {
    const name = path.basename(filePath);
    console.log(`\nApplying ${name}...`);
    const sqlContent = fs.readFileSync(filePath, "utf8");

    // Split on semicolons, filter out comments and empty strings
    const statements = sqlContent
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 5 && !s.startsWith("--"));

    for (const stmt of statements) {
      try {
        await conn.execute(stmt);
        console.log("  OK:", stmt.substring(0, 70).replace(/\n/g, " "));
      } catch (err) {
        console.log("  WARN:", err.message.substring(0, 120));
      }
    }
  }

  // Verify
  const [roadmap] = await conn.execute("SHOW TABLES LIKE 'roadmap%'");
  const [kpis] = await conn.execute("SHOW TABLES LIKE 'kpi%'");
  console.log("\nVerification:");
  console.log("  Roadmap tables:", JSON.stringify(roadmap));
  console.log("  KPI tables:", JSON.stringify(kpis));

  await conn.end();
  console.log("\nDone.");
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
