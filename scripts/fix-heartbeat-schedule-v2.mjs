import Database from "better-sqlite3";
import mysql from "mysql2/promise";
import fs from "node:fs";

function fixSchedule(md) {
  if (!md) return md;
  let f = md;
  // All Daily variants → Every 24 Hours
  f = f.replace(/## Daily \([^)]*\)/gi, "## Every 24 Hours");
  f = f.replace(/## Daily$/gm, "## Every 24 Hours");
  // All Weekly variants → Every 7 Days
  f = f.replace(/## Weekly \([^)]*\)/gi, "## Every 7 Days");
  f = f.replace(/## Weekly Cadence/gi, "## Every 7 Days");
  f = f.replace(/## Weekly$/gm, "## Every 7 Days");
  // All Monthly variants → Every 30 Days
  f = f.replace(/## Monthly \([^)]*\)/gi, "## Every 30 Days");
  f = f.replace(/## Monthly Cadence/gi, "## Every 30 Days");
  f = f.replace(/## Monthly$/gm, "## Every 30 Days");
  // Combined Weekly/Monthly → Every 7/30 Days
  f = f.replace(/## Weekly\/Monthly Cadence/gi, "## Every 7/30 Days");
  // business day → days
  f = f.replace(/by \d+(?:st|nd|rd|th) business day/gi, "within first 5 days");
  f = f.replace(/business days?/gi, "days");
  // Friday/Monday references
  f = f.replace(/Friday \d{2}:\d{2}/gi, "every 7 days");
  f = f.replace(/Monday \d{2}:\d{2}/gi, "every 7 days");
  return f;
}

// 1. JSON
const jsonPath = "scripts/role-templates-import.json";
const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
let jc = 0;
data.forEach(r => {
  if (r.heartbeat_md) {
    const b = r.heartbeat_md;
    r.heartbeat_md = fixSchedule(r.heartbeat_md);
    if (b !== r.heartbeat_md) jc++;
  }
});
fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + "\n", "utf-8");
console.log("JSON: " + jc + " fixed");

// 2. SQLite templates
const db = new Database(process.env.APPDATA + "/GRC/data/grc.db");
const tpls = db.prepare("SELECT id, heartbeat_md FROM role_templates WHERE heartbeat_md IS NOT NULL").all();
let sc = 0;
const ut = db.prepare("UPDATE role_templates SET heartbeat_md = ? WHERE id = ?");
for (const t of tpls) { const f = fixSchedule(t.heartbeat_md); if (f !== t.heartbeat_md) { ut.run(f, t.id); sc++; } }
console.log("SQLite templates: " + sc + " fixed");

// 3. SQLite nodes
const ns = db.prepare("SELECT node_id, employee_name, resolved_heartbeat_md FROM nodes WHERE resolved_heartbeat_md IS NOT NULL").all();
let nc = 0;
const un = db.prepare("UPDATE nodes SET resolved_heartbeat_md = ? WHERE node_id = ?");
for (const n of ns) { const f = fixSchedule(n.resolved_heartbeat_md); if (f !== n.resolved_heartbeat_md) { un.run(f, n.node_id); nc++; } }
console.log("SQLite nodes: " + nc + " fixed");
db.close();

// 4. MySQL
try {
  const pool = await mysql.createPool("mysql://root:Admin123@13.78.81.86:18306/grc-server");
  const [rows] = await pool.execute("SELECT id, heartbeat_md FROM role_templates WHERE heartbeat_md IS NOT NULL");
  let mc = 0;
  for (const r of rows) { const f = fixSchedule(r.heartbeat_md); if (f !== r.heartbeat_md) { await pool.execute("UPDATE role_templates SET heartbeat_md = ? WHERE id = ?", [f, r.id]); mc++; } }
  console.log("MySQL: " + mc + " fixed");
  await pool.end();
} catch (e) { console.log("MySQL: " + e.message); }

console.log("=== All done ===");
