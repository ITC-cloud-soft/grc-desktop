import Database from "better-sqlite3";
import fs from "node:fs";
import mysql from "mysql2/promise";

// Strategy API tools section to append to tools_md
const STRATEGY_TOOLS_SECTION = `

---

## Company Strategy Management (CEO Exclusive API)

> **Only the CEO role can update strategy, KPIs, and budgets via these APIs.**
> Other roles can read but not modify. All changes are audited and posted to Community.

### grc_strategy_get — Read Current Company Strategy
\`\`\`
Tool: web_fetch
  url: "{grc_url}/a2a/strategy"
  method: GET
\`\`\`
Returns: mission, vision, short/mid/long-term objectives, strategic priorities, budgets, KPIs.

### grc_strategy_update — Update Company Strategy
\`\`\`
Tool: web_fetch
  url: "{grc_url}/a2a/strategy"
  method: PUT
  body:
    mission: "New mission statement"
    vision: "New vision"
    short_term_objectives: { ... }
    mid_term_objectives: { ... }
    long_term_objectives: { ... }
    strategic_priorities: [ ... ]
\`\`\`
**Only include fields you want to change.** Unchanged fields are preserved.

### grc_strategy_deploy — Publish Strategy to All Agents
\`\`\`
Tool: web_fetch
  url: "{grc_url}/a2a/strategy/deploy"
  method: POST
  body:
    reason: "Q2 strategy revision based on market analysis"
\`\`\`
**IMPORTANT**: After updating strategy, you MUST deploy for changes to reach all agents.

### grc_strategy_budgets_get — Read Department Budgets
\`\`\`
Tool: web_fetch
  url: "{grc_url}/a2a/strategy/budgets"
  method: GET
\`\`\`

### grc_strategy_budgets_update — Update Department Budgets
\`\`\`
Tool: web_fetch
  url: "{grc_url}/a2a/strategy/budgets"
  method: PUT
  body:
    budgets:
      engineering: { amount: 500000, currency: "USD" }
      marketing: { amount: 200000, currency: "USD" }
    force: false
\`\`\`
**Budget guardrail**: Single update cannot change any department by more than ±20%.
Set \`force: true\` only for emergency restructuring (logged as warning).

### grc_strategy_kpis_get — Read Department KPIs
\`\`\`
Tool: web_fetch
  url: "{grc_url}/a2a/strategy/kpis"
  method: GET
\`\`\`

### grc_strategy_kpis_update — Update Department KPIs
\`\`\`
Tool: web_fetch
  url: "{grc_url}/a2a/strategy/kpis"
  method: PUT
  body:
    kpis:
      engineering: { code_quality: 95, sprint_velocity: 80 }
      marketing: { lead_gen: 1000, conversion_rate: 5 }
\`\`\`

### grc_strategy_history — View Strategy Change History
\`\`\`
Tool: web_fetch
  url: "{grc_url}/a2a/strategy/history"
  method: GET
\`\`\`

### Strategy Management Workflow
1. **Read current**: GET /a2a/strategy
2. **Plan changes**: Analyze data, consult department heads
3. **Update**: PUT /a2a/strategy (and/or budgets, KPIs)
4. **Deploy**: POST /a2a/strategy/deploy
5. **Notify**: Post to Community about changes
`;

// Agents_md addition for strategy management authority
const AGENTS_MD_ADDITION = `

### Company Strategy Management Authority (CEO Exclusive)
As CEO, you have the authority to directly manage company strategy through the GRC Strategy API:
- **Read & analyze** current company strategy, budgets, and KPIs at any time
- **Update strategy** when the human CEO requests changes to plans, objectives, or direction
- **Adjust budgets** within ±20% per department (emergency override available with justification)
- **Set KPIs** for all departments aligned with company objectives
- **Deploy changes** to all AI employees after updates
- **Review history** of all strategic changes for accountability

**When the human CEO requests strategic changes:**
1. Read the current strategy to understand the baseline
2. Make the requested modifications via the Strategy API
3. Deploy the updated strategy to all agents
4. Post a summary to the Community forum
5. Report back to the human CEO confirming the changes

**Budget change protocol:**
- Changes ≤20%: Execute directly
- Changes >20%: Confirm with human CEO before using force override
- All changes are automatically audited and logged
`;

// 1. Update SQLite
const sqlitePath = process.env.APPDATA + "/GRC/data/grc.db";
const db = new Database(sqlitePath);

const ceo = db.prepare("SELECT tools_md, agents_md FROM role_templates WHERE id = 'ceo'").get();
if (!ceo) { console.log("CEO role not found in SQLite"); process.exit(1); }

let newTools = ceo.tools_md || "";
let newAgents = ceo.agents_md || "";

// Only add if not already present
if (!newTools.includes("Company Strategy Management")) {
  newTools += STRATEGY_TOOLS_SECTION;
}
if (!newAgents.includes("Company Strategy Management Authority")) {
  newAgents += AGENTS_MD_ADDITION;
}

db.prepare("UPDATE role_templates SET tools_md = ?, agents_md = ? WHERE id = 'ceo'").run(newTools, newAgents);
console.log("SQLite updated");
db.close();

// 2. Update JSON
const jsonPath = "scripts/role-templates-import.json";
const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
const ceoJson = data.find(r => r.id === "ceo");
if (ceoJson) {
  if (!ceoJson.tools_md?.includes("Company Strategy Management")) {
    ceoJson.tools_md = (ceoJson.tools_md || "") + STRATEGY_TOOLS_SECTION;
  }
  if (!ceoJson.agents_md?.includes("Company Strategy Management Authority")) {
    ceoJson.agents_md = (ceoJson.agents_md || "") + AGENTS_MD_ADDITION;
  }
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + "\n", "utf-8");
  console.log("JSON updated");
} else {
  console.log("CEO not found in JSON");
}

// 3. Update MySQL
const pool = await mysql.createPool("mysql://root:Admin123@13.78.81.86:18306/grc-server");
const [rows] = await pool.execute("SELECT tools_md, agents_md FROM role_templates WHERE id = 'ceo'");
if (rows.length > 0) {
  let mTools = rows[0].tools_md || "";
  let mAgents = rows[0].agents_md || "";
  if (!mTools.includes("Company Strategy Management")) {
    mTools += STRATEGY_TOOLS_SECTION;
  }
  if (!mAgents.includes("Company Strategy Management Authority")) {
    mAgents += AGENTS_MD_ADDITION;
  }
  await pool.execute("UPDATE role_templates SET tools_md = ?, agents_md = ? WHERE id = 'ceo'", [mTools, mAgents]);
  console.log("MySQL updated");
} else {
  console.log("CEO not found in MySQL");
}
await pool.end();

console.log("=== All 3 databases updated ===");
