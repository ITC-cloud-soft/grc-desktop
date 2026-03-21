const fs = require("fs");
const data = JSON.parse(fs.readFileSync("scripts/mysql-dump-roles.json", "utf8"));
const roles = data.data;
console.log("Roles:", roles.length);

const lines = [
  "-- Auto-generated: " + roles.length + " role templates from MySQL",
  "-- Generated: " + new Date().toISOString(),
  ""
];

for (const r of roles) {
  const e = (s) => (s == null ? "NULL" : "'" + String(s).replace(/'/g, "''") + "'");
  lines.push(
    "INSERT OR IGNORE INTO role_templates (id, name, emoji, description, department, industry, mode, is_builtin, agents_md, soul_md, identity_md, user_md, tools_md, heartbeat_md, bootstrap_md, tasks_md, created_at, updated_at) VALUES (" +
    [
      e(r.id), e(r.name), e(r.emoji), e(r.description), e(r.department), e(r.industry),
      e(r.mode || "autonomous"), r.isBuiltin ? "1" : "0",
      e(r.agentsMd || ""), e(r.soulMd || ""), e(r.identityMd || ""), e(r.userMd || ""),
      e(r.toolsMd || ""), e(r.heartbeatMd || ""), e(r.bootstrapMd || ""), e(r.tasksMd || ""),
      "datetime('now')", "datetime('now')"
    ].join(", ") + ");"
  );
}

// Also add 28 skill_catalog entries from the existing seed
const skillLines = fs.readFileSync("src/shared/db/migrations/sqlite/002_seed_roles_and_skills.sql", "utf8");
const skillMatch = skillLines.match(/-- ═══ Section 3[\s\S]*/);
if (skillMatch) {
  lines.push("");
  lines.push(skillMatch[0]);
}

const outPath = "src/shared/db/migrations/sqlite/002_seed_all_data.sql";
fs.writeFileSync(outPath, lines.join("\n") + "\n");
console.log("Written:", outPath, "(" + lines.length + " lines)");
