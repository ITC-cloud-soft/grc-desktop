/**
 * Re-resolve role templates for Daytona nodes after template updates.
 * This re-applies variable substitution and increments config_revision.
 * Run: node scripts/re-resolve-roles.mjs
 */
import mysql from "mysql2/promise";

const DB_URL = "mysql://root:Admin123@13.78.81.86:18306/grc-server";

const NODES = [
  { nodeId: "524a5c2de7da42fd13dc39b869aa344f1ce8c546be02e39e04c4f6193d3c8e4c", label: "node-1", roleId: "finance" },
  { nodeId: "c714cff9fb1ba95e171d91c07f09583e730e548208b512c4220bc08a860dcb20", label: "node-2", roleId: "marketing" },
  { nodeId: "6e5dbb95f3577930609f18052914d2d1c67297fca1a7e1758d369a9661a1ed0a", label: "node-3", roleId: "engineering-lead" },
];

const MD_FIELDS = [
  "agents_md", "soul_md", "identity_md", "user_md",
  "tools_md", "heartbeat_md", "bootstrap_md", "tasks_md",
];

const RESOLVED_COLUMNS = [
  "resolved_agents_md", "resolved_soul_md", "resolved_identity_md", "resolved_user_md",
  "resolved_tools_md", "resolved_heartbeat_md", "resolved_bootstrap_md", "resolved_tasks_md",
];

function resolveVariables(content, variables) {
  return content.replace(/\$\{([^}]+)\}/g, (match, key) => {
    const trimmedKey = key.trim();
    if (trimmedKey in variables) {
      return variables[trimmedKey];
    }
    return match; // Leave unresolved
  });
}

async function main() {
  const conn = await mysql.createConnection(DB_URL);

  // Get company name from strategy
  const [strategies] = await conn.query("SELECT company_mission FROM company_strategy ORDER BY created_at DESC LIMIT 1");
  const companyName = "WinClawHub AI"; // Default company name

  for (const node of NODES) {
    console.log(`\n--- Processing ${node.label} (${node.nodeId.substring(0, 8)}...) ---`);

    // Get current assignment_variables and config_revision
    const [nodeRows] = await conn.query(
      "SELECT assignment_variables, config_revision, employee_id, employee_name, employee_email FROM nodes WHERE node_id = ?",
      [node.nodeId]
    );

    if (nodeRows.length === 0) {
      console.log(`  ❌ Node not found`);
      continue;
    }

    const nodeData = nodeRows[0];
    let assignVars = {};
    try {
      assignVars = typeof nodeData.assignment_variables === "string"
        ? JSON.parse(nodeData.assignment_variables)
        : (nodeData.assignment_variables || {});
    } catch (e) {
      assignVars = {};
    }

    // Build variables map (merge assignment vars with defaults)
    const variables = {
      company_name: companyName,
      employee_name: nodeData.employee_name || assignVars.employee_name || "AI Employee",
      employee_id: nodeData.employee_id || assignVars.employee_id || "auto",
      employee_email: nodeData.employee_email || assignVars.employee_email || "",
      mode: "autonomous",
      budget_limit: assignVars.budget_limit || "10000",
      human_name: assignVars.human_name || "",
      human_title: assignVars.human_title || "",
      ...assignVars,
    };

    console.log(`  Variables: ${JSON.stringify(variables)}`);

    // Get the updated role template
    const [templateRows] = await conn.query(
      "SELECT * FROM role_templates WHERE id = ?",
      [node.roleId]
    );

    if (templateRows.length === 0) {
      console.log(`  ❌ Role template '${node.roleId}' not found`);
      continue;
    }

    const template = templateRows[0];

    // Resolve all 8 MD fields
    const resolvedValues = {};
    for (let i = 0; i < MD_FIELDS.length; i++) {
      const templateContent = template[MD_FIELDS[i]] || "";
      resolvedValues[RESOLVED_COLUMNS[i]] = resolveVariables(templateContent, variables);
    }

    // Increment config_revision
    const newRevision = (nodeData.config_revision || 0) + 1;

    // Update node
    const setClauses = RESOLVED_COLUMNS.map(col => `${col} = ?`).join(", ");
    const values = RESOLVED_COLUMNS.map(col => resolvedValues[col]);

    await conn.query(
      `UPDATE nodes SET ${setClauses}, config_revision = ?, updated_at = NOW() WHERE node_id = ?`,
      [...values, newRevision, node.nodeId]
    );

    console.log(`  ✅ Updated ${node.label}: role=${node.roleId}, new config_revision=${newRevision}`);
    console.log(`  📝 Resolved fields: ${RESOLVED_COLUMNS.map((col, i) => `${col.replace("resolved_", "")}=${resolvedValues[RESOLVED_COLUMNS[i]].length}B`).join(", ")}`);
  }

  // Final verification
  console.log("\n=== Final State ===");
  const [finalNodes] = await conn.query(
    "SELECT node_id, role_id, config_revision, config_applied_revision FROM nodes WHERE node_id IN (?, ?, ?)",
    NODES.map(n => n.nodeId)
  );
  for (const n of finalNodes) {
    console.log(`${n.node_id.substring(0, 8)}... | role=${n.role_id} | rev=${n.config_revision}/${n.config_applied_revision} (delta=${n.config_revision - n.config_applied_revision})`);
  }

  await conn.end();
  console.log("\n🎉 All nodes re-resolved with updated templates!");
}

main().catch(e => { console.error("❌ Error:", e.message); process.exit(1); });
