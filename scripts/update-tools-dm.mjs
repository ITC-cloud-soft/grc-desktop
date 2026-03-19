#!/usr/bin/env node
/**
 * Append Agent Direct Messaging tools section to all role templates' tools_md.
 * Also bumps config_revision for all assigned nodes to trigger SSE push.
 */
import mysql from "mysql2/promise";

const DB_URL = process.env.DATABASE_URL || "mysql://root:Admin123@13.78.81.86:18306/grc-server";

const DM_TOOLS_SECTION = `

---

## Agent Direct Messaging (WinClaw Built-in Tools)

Send messages directly to other AI employees. **DO NOT write HTTP requests manually.**
Use these 3 built-in WinClaw tools — authentication is handled automatically.

### grc_relay_send — Send Direct Message
Send a message to another AI employee. Delivery is guaranteed even if the recipient is offline.

\`\`\`
Tool: grc_relay_send
Parameters:
  to_role_id: "finance"              # Target role ID (alternative to to_node_id)
  to_node_id: "38edcf5d..."         # Target node ID (use grc_roster to find)
  message_type: "directive"          # directive | query | report | text | task_assignment
  subject: "Budget Review Request"   # Subject line
  message: "Please prepare Q2 budget" # Message body
  priority: "normal"                 # critical | high | normal | low
\`\`\`

Examples:
- CEO to Finance: to_role_id="finance", message_type="directive"
- Engineering to CEO: to_role_id="ceo", message_type="report"
- Ask a question: to_role_id="marketing", message_type="query"

### grc_broadcast — Broadcast to All or Specific Roles
Send a message to all employees or filter by roles.

\`\`\`
Tool: grc_broadcast
Parameters:
  subject: "Company Meeting Notice"   # Subject line
  message: "Meeting at 2pm tomorrow"  # Message body
  target_roles: ["finance", "sales"]  # Target roles (omit for all)
  priority: "high"                    # critical | high | normal | low
\`\`\`

### grc_roster — List All Employees & Online Status
Check all AI employees and their current online/SSE connection status.

\`\`\`
Tool: grc_roster
Parameters: none
\`\`\`

Returns: employee name, node ID, role ID, online status, SSE connection status

### IMPORTANT RULES
- **NEVER use axios/fetch/curl to call relay APIs directly** — you will get 401 errors
- These 3 tools handle authentication tokens automatically
- Use to_role_id when you don't know the exact node ID
- Messages are queued and delivered via SSE when the recipient comes online
`;

async function main() {
  const conn = await mysql.createConnection(DB_URL);
  console.log("Connected to database");

  const [roles] = await conn.query("SELECT id, tools_md FROM role_templates");
  console.log(`Found ${roles.length} roles`);

  let updated = 0;
  for (const role of roles) {
    if (role.tools_md && role.tools_md.includes("grc_relay_send")) {
      console.log(`  [SKIP] ${role.id} — already has DM tools`);
      continue;
    }

    const newToolsMd = (role.tools_md || "") + DM_TOOLS_SECTION;
    await conn.query("UPDATE role_templates SET tools_md = ? WHERE id = ?", [newToolsMd, role.id]);
    console.log(`  [OK] ${role.id} — DM tools appended`);
    updated++;
  }

  console.log(`\nUpdated: ${updated} roles`);

  // Bump config_revision for all assigned nodes to trigger SSE push
  const [result] = await conn.query(
    "UPDATE nodes SET config_revision = config_revision + 1 WHERE role_id IS NOT NULL"
  );
  console.log(`Config revision bumped for ${result.affectedRows} nodes`);

  await conn.end();
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
