/**
 * Trigger SSE task_assigned events for pending tasks.
 *
 * Strategy:
 * 1. Generate admin JWT with correct issuer (grc.myaiportal.net)
 * 2. Reset task status to "draft" via direct DB
 * 3. Change draft → pending via GRC API (this triggers SSE task_assigned)
 *
 * Run: node scripts/trigger-task-assignments.mjs
 */
import jwt from "jsonwebtoken";
import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GRC_BASE = "http://localhost:3100";
const DB_URL = "mysql://root:Admin123@13.78.81.86:18306/grc-server";
const ISSUER = "grc.myaiportal.net";

// Load RSA keys
const keysPath = path.join(__dirname, "..", ".dev-jwt-keys.json");
const keys = JSON.parse(fs.readFileSync(keysPath, "utf-8"));

// Generate admin JWT
const token = jwt.sign(
  {
    sub: "admin-script",
    tier: "pro",
    role: "admin",
    email: "admin@winclawhub.ai",
    scopes: ["read", "write", "admin"],
  },
  keys.privateKey,
  { algorithm: "RS256", issuer: ISSUER, expiresIn: "1h" }
);

console.log("✅ Admin JWT generated (issuer:", ISSUER + ")");

// Pending tasks
const PENDING_TASKS = [
  { id: "1b638aea-6556-4f8a-aeed-0a38462d417b", title: "Review compliance roadmap", node: "finance" },
  { id: "63699451-a133-4b97-a2e3-a6a27ff3fdca", title: "Conduct cost reduction analysis", node: "finance" },
  { id: "71da8a77-b852-445d-9b46-07f470c3eafb", title: "Assess AI automation initiatives", node: "engineering-lead" },
  { id: "b54ef660-50a2-46fb-9aa1-464e99968831", title: "Update company strategy 2026", node: "marketing" },
  { id: "e40787a9-5c29-4762-a82e-2c01c6699b00", title: "Go-to-market strategy", node: "marketing" },
];

async function changeStatusViaApi(taskId, newStatus) {
  const res = await fetch(`${GRC_BASE}/api/v1/admin/tasks/${taskId}/status`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: newStatus }),
  });
  const body = await res.json();
  return { ok: res.ok, status: res.status, body };
}

async function main() {
  // Step 1: Test auth
  const authRes = await fetch(`${GRC_BASE}/api/v1/admin/tasks/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!authRes.ok) {
    console.error("❌ Auth failed:", authRes.status);
    process.exit(1);
  }
  console.log("✅ GRC auth OK\n");

  // Step 2: Reset pending tasks to draft via direct DB
  const conn = await mysql.createConnection(DB_URL);

  for (const task of PENDING_TASKS) {
    // Check current status
    const [rows] = await conn.query("SELECT status, version FROM tasks WHERE id = ?", [task.id]);
    if (rows.length === 0) {
      console.log(`⚠️  Task ${task.id} not found, skipping`);
      continue;
    }

    const currentStatus = rows[0].status;
    if (currentStatus !== "pending") {
      console.log(`⚠️  Task "${task.title}" is '${currentStatus}' not 'pending', skipping`);
      continue;
    }

    // Reset to draft via DB
    await conn.query("UPDATE tasks SET status = 'draft', version = version + 1 WHERE id = ?", [task.id]);
    console.log(`📝 "${task.title}" → draft (DB reset)`);
  }

  await conn.end();
  console.log("");

  // Step 3: Change draft → pending via API (triggers SSE task_assigned)
  for (const task of PENDING_TASKS) {
    const result = await changeStatusViaApi(task.id, "pending");
    if (result.ok) {
      console.log(`✅ "${task.title}" → pending → SSE task_assigned sent! (→ ${task.node})`);
    } else {
      console.log(`❌ "${task.title}" failed: ${result.status} ${JSON.stringify(result.body).substring(0, 120)}`);
    }
  }

  console.log("\n🎉 Done! SSE task_assigned events should now be pushed to connected nodes.");
}

main().catch(e => { console.error("Error:", e); process.exit(1); });
