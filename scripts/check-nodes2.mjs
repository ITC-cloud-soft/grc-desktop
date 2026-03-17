import mysql from "mysql2/promise";
const db = await mysql.createConnection("mysql://root:Admin123@13.78.81.86:18306/grc-server");
const [nodes] = await db.query("SELECT node_id, role_id, role_mode, display_name FROM nodes ORDER BY role_id");
console.log("=== NODES TABLE ===");
for (const n of nodes) {
  console.log(n.node_id.substring(0, 12) + " | role=" + (n.role_id || "NULL") + " | mode=" + (n.role_mode || "NULL") + " | name=" + (n.display_name || "-"));
}
console.log("Total: " + nodes.length);
console.log("With role: " + nodes.filter(n => n.role_id !== null).length);
console.log("Without role: " + nodes.filter(n => n.role_id === null).length);
await db.end();
