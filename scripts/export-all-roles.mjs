import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dbPath = path.join(process.env.APPDATA, "GRC", "data", "grc.db");
const db = new Database(dbPath, { readonly: true });

const roles = db.prepare(`SELECT id, name, emoji, department, mode, description,
  identity_md, soul_md, agents_md, tasks_md, tools_md, user_md, heartbeat_md, bootstrap_md
  FROM role_templates ORDER BY department, id`).all();

console.log(`Exported ${roles.length} roles from SQLite`);

const jsonPath = path.resolve("scripts/role-templates-import.json");
fs.writeFileSync(jsonPath, JSON.stringify(roles, null, 2) + "\n", "utf-8");
console.log(`Written to ${jsonPath}`);

// Verify
const hasNew = roles.filter(r => r.heartbeat_md?.includes("Step 1: Check & Claim")).length;
const hasOld = roles.filter(r => r.heartbeat_md?.includes("Every 4 Hours")).length;
console.log(`New format: ${hasNew}/${roles.length}`);
console.log(`Old format: ${hasOld}`);

db.close();
