import mysql from "mysql2/promise";

const DB_URL = "mysql://root:Admin123@13.78.81.86:18306/grc-server";
const NODE_IDS = [
  "524a5c2de7da42fd13dc39b869aa344f1ce8c546be02e39e04c4f6193d3c8e4c", // node-1
  "c714cff9fb1ba95e171d91c07f09583e730e548208b512c4220bc08a860dcb20", // node-2
  "6e5dbb95f3577930609f18052914d2d1c67297fca1a7e1758d369a9661a1ed0a", // node-3
];

async function main() {
  const conn = await mysql.createConnection(DB_URL);

  const [nodes] = await conn.query(
    "SELECT node_id, role_id, role_mode, config_revision, config_applied_revision, employee_name FROM nodes WHERE node_id IN (?, ?, ?)",
    NODE_IDS
  );

  console.log("=== Current Daytona Node State ===");
  for (const n of nodes) {
    console.log(`${n.node_id.substring(0, 8)}... | role=${n.role_id || "NULL"} | mode=${n.role_mode || "NULL"} | rev=${n.config_revision}/${n.config_applied_revision} | name=${n.employee_name || "null"}`);
  }

  // Check pending tasks
  const [tasks] = await conn.query(
    "SELECT id, title, status, assigned_node_id, priority FROM tasks WHERE status IN ('pending', 'assigned') AND assigned_node_id IN (?, ?, ?)",
    NODE_IDS
  );

  console.log(`\n=== Pending Tasks for Daytona Nodes (${tasks.length}) ===`);
  for (const t of tasks) {
    console.log(`${t.id} | ${t.status} | ${t.priority} | ${t.title.substring(0, 60)} → ${t.assigned_node_id.substring(0, 8)}...`);
  }

  await conn.end();
}

main().catch(e => console.error(e));
