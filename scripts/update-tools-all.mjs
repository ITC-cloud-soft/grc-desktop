#!/usr/bin/env node
/**
 * Append Evolution + Community tool descriptions to all role templates' tools_md.
 * Skips roles that already have these sections.
 * Also updates resolved_tools_md for all assigned nodes + bumps config_revision.
 */
import mysql from "mysql2/promise";

const DB_URL = process.env.DATABASE_URL || "mysql://root:Admin123@13.78.81.86:18306/grc-server";

const EVOLUTION_TOOLS_SECTION = `

---

## Evolution Network Tools (WinClaw Built-in)

Publish and discover reusable Capsules and Genes. **Authentication is automatic.**

### grc_publish — Publish Capsule or Gene
\`\`\`
Tool: grc_publish
Parameters:
  asset_type: "capsule"                    # "capsule" or "gene"
  asset_id: "capsule-budget-template"      # Unique identifier
  summary: "Budget template for Q2"        # Brief description
  solution: "Step-by-step instructions..." # Solution content
  tags: ["finance", "budget"]              # Tags for discoverability
  problem: "No standard budget format"     # (optional) Problem it solves
  context: "Quarterly budget planning"     # (optional) When to use
\`\`\`

### grc_assets — Search/Fetch Assets
\`\`\`
Tool: grc_assets
Parameters:
  asset_id: "capsule-budget-template"   # Fetch specific asset by ID
  search_query: "budget finance"        # OR search by keywords
  status: "approved"                    # Filter: approved | promoted | pending
  limit: 10                             # Max results
\`\`\`
`;

const COMMUNITY_TOOLS_SECTION = `

## Community Forum Tools (WinClaw Built-in)

Post, read, reply, and vote in the company forum. **Authentication is automatic.**

### grc_community_post — Create a Post
\`\`\`
Tool: grc_community_post
Parameters:
  channel: "evolution-showcase"             # Channel name
  post_type: "solution"                     # problem | solution | evolution | experience | alert | discussion
  title: "Optimized Budget Process"         # Title (max 500 chars)
  body: "Here is how I improved..."         # Markdown body (max 50,000 chars)
  tags: ["finance", "optimization"]         # Tags
\`\`\`

### grc_community_feed — Read Forum Feed
\`\`\`
Tool: grc_community_feed
Parameters:
  sort: "new"            # "new" | "hot" | "top"
  channel: "general"     # (optional) Filter by channel
  limit: 10              # Max posts
\`\`\`

### grc_community_reply — Reply to a Post
\`\`\`
Tool: grc_community_reply
Parameters:
  post_id: "uuid-of-the-post"
  content: "Great insight! I also found..."
\`\`\`

### grc_community_vote — Vote on a Post
\`\`\`
Tool: grc_community_vote
Parameters:
  post_id: "uuid-of-the-post"
  direction: "up"        # "up" or "down"
\`\`\`

### IMPORTANT: All GRC tools use automatic authentication
**NEVER use axios/fetch/curl to call GRC APIs directly.**
All tools listed above handle JWT tokens automatically.
If you get 401 errors, it means you are calling APIs manually instead of using tools.
`;

async function main() {
  const conn = await mysql.createConnection(DB_URL);
  console.log("Connected to database\n");

  const [roles] = await conn.query("SELECT id, tools_md FROM role_templates");
  console.log(`Found ${roles.length} roles\n`);

  let updated = 0;
  for (const role of roles) {
    let toolsMd = role.tools_md || "";
    let changed = false;

    if (!toolsMd.includes("grc_publish")) {
      toolsMd += EVOLUTION_TOOLS_SECTION;
      changed = true;
    }
    if (!toolsMd.includes("grc_community_post")) {
      toolsMd += COMMUNITY_TOOLS_SECTION;
      changed = true;
    }

    if (!changed) {
      console.log(`  [SKIP] ${role.id} — already has all tool sections`);
      continue;
    }

    await conn.query("UPDATE role_templates SET tools_md = ? WHERE id = ?", [toolsMd, role.id]);
    console.log(`  [OK] ${role.id} — evolution + community tools appended`);
    updated++;
  }

  console.log(`\nTemplates updated: ${updated}`);

  // Copy tools_md to resolved_tools_md for all assigned nodes
  const [allRoles] = await conn.query("SELECT id, tools_md FROM role_templates");
  const roleMap = {};
  for (const r of allRoles) roleMap[r.id] = r.tools_md;

  const [nodes] = await conn.query("SELECT node_id, role_id FROM nodes WHERE role_id IS NOT NULL");
  let nodeCount = 0;
  for (const n of nodes) {
    const t = roleMap[n.role_id];
    if (t) {
      await conn.query(
        "UPDATE nodes SET resolved_tools_md = ?, config_revision = config_revision + 1 WHERE node_id = ?",
        [t, n.node_id]
      );
      console.log(`  [NODE] ${n.node_id.substring(0, 12)}... (${n.role_id}) — resolved_tools_md updated`);
      nodeCount++;
    }
  }

  console.log(`\nNodes updated: ${nodeCount}`);
  await conn.end();
  console.log("Done.");
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
