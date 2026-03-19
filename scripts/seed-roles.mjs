/**
 * Seed all 9 built-in roles from the design document into the GRC database.
 * Usage: node scripts/seed-roles.mjs
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const API_BASE = 'http://localhost:3100';
const LOGIN_EMAIL = 'mysin008@gmail.com';
const LOGIN_PASSWORD = 'W4f48dbc4';

// ─── Design document path ───
const DOC_PATH = join(__dirname, '..', '..', 'winclaw', 'docs', 'GRC_Role_Templates_All_8_Roles.md');

// ─── Role metadata (extracted from design doc IDENTITY.md sections) ───
const ROLE_META = [
  { id: 'ceo', name: 'Chief Executive Officer', emoji: '👔', department: 'Executive Office', industry: null, mode: 'copilot', description: 'AI assistant to the human CEO. Distributes annual KPIs, oversees all AI departments, monitors execution against company plans, and issues directives to AI employees.' },
  { id: 'marketing', name: 'Marketing Lead', emoji: '📊', department: 'Marketing', industry: null, mode: 'autonomous', description: 'Digital marketing, market research, brand strategy, campaign management, and data-driven marketing analytics.' },
  { id: 'product-manager', name: 'Product Manager', emoji: '🎯', department: 'Product', industry: null, mode: 'autonomous', description: 'PRD creation, roadmap planning, user story writing, stakeholder coordination, and product analytics.' },
  { id: 'strategic-planner', name: 'Strategic Planner', emoji: '🧭', department: 'Strategy & Planning', industry: null, mode: 'autonomous', description: 'Business planning, market entry strategy, M&A analysis, competitive strategy, and long-term vision alignment.' },
  { id: 'finance', name: 'Finance & Accounting Lead', emoji: '💰', department: 'Finance', industry: null, mode: 'autonomous', description: 'Financial statement analysis, budget management, expense tracking, tax planning, and regulatory compliance.' },
  { id: 'sales', name: 'Sales Lead', emoji: '🤝', department: 'Sales', industry: null, mode: 'autonomous', description: 'Lead generation, proposal creation, pipeline management, CRM operations, and revenue target execution.' },
  { id: 'customer-support', name: 'Customer Support Lead', emoji: '💬', department: 'Customer Support', industry: null, mode: 'autonomous', description: 'Ticket management, FAQ & knowledge base, escalation routing, customer satisfaction tracking, and VOC analysis.' },
  { id: 'hr', name: 'HR Lead', emoji: '👥', department: 'Human Resources', industry: null, mode: 'autonomous', description: 'Recruitment planning, performance management, training & development, labor compliance, and organizational culture.' },
  { id: 'engineering-lead', name: 'Engineering Lead', emoji: '⚙️', department: 'Engineering', industry: null, mode: 'autonomous', description: 'System architecture, code review, technology evaluation, sprint planning, and technical debt management.' },
];

// ─── Parse the design document ───
function parseRolesFromDoc(docContent) {
  const roles = {};

  // Split by role headers (## N. emoji RoleName — Description (Role ID: `xxx`))
  const roleSections = docContent.split(/^## \d+\./m).slice(1); // skip content before first role

  for (const section of roleSections) {
    // Extract role ID from the first line
    const idMatch = section.match(/\(Role ID: `([^`]+)`\)/);
    if (!idMatch) continue;
    const roleId = idMatch[1];

    // Extract each markdown file section
    const fileNames = [
      'IDENTITY.md', 'SOUL.md', 'AGENTS.md', 'USER.md',
      'TOOLS.md', 'HEARTBEAT.md', 'BOOTSTRAP.md', 'TASKS.md'
    ];

    const extracted = {};
    for (const fileName of fileNames) {
      const key = fileName.replace('.md', '').toLowerCase() + '_md';

      // Find the ### FILENAME section and extract the markdown code block
      const headerPattern = new RegExp(`### ${fileName.replace('.', '\\.')}\\s*\\n`);
      const headerMatch = section.match(headerPattern);

      if (!headerMatch) {
        console.warn(`  ⚠️  ${roleId}: ${fileName} section not found`);
        extracted[key] = `# ${fileName.replace('.md', '')}\n\nContent not available.`;
        continue;
      }

      const afterHeader = section.substring(headerMatch.index + headerMatch[0].length);

      // Find the first ```markdown ... ``` block after the header
      const codeBlockMatch = afterHeader.match(/```markdown\s*\n([\s\S]*?)```/);
      if (!codeBlockMatch) {
        console.warn(`  ⚠️  ${roleId}: ${fileName} code block not found`);
        extracted[key] = `# ${fileName.replace('.md', '')}\n\nContent not available.`;
        continue;
      }

      extracted[key] = codeBlockMatch[1].trimEnd();
    }

    roles[roleId] = extracted;
  }

  return roles;
}

// ─── API helpers ───
async function login() {
  const res = await fetch(`${API_BASE}/auth/email/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: LOGIN_EMAIL, password: LOGIN_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.token;
}

async function getExistingRoles(token) {
  const res = await fetch(`${API_BASE}/api/v1/admin/roles`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Get roles failed: ${res.status}`);
  const data = await res.json();
  return data.data || [];
}

async function createRole(token, roleData) {
  const res = await fetch(`${API_BASE}/api/v1/admin/roles`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(roleData),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Create role failed: ${res.status} — ${text}`);
  }
  return await res.json();
}

async function updateRole(token, roleId, roleData) {
  const res = await fetch(`${API_BASE}/api/v1/admin/roles/${roleId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(roleData),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Update role failed: ${res.status} — ${text}`);
  }
  return await res.json();
}

// ─── Company context section appended to every role's AGENTS.md ───
// These template variables are resolved at runtime by CompanyContextGenerator.
const COMPANY_CONTEXT_SECTION = `

---

## Company Organization

### Org Chart
\${org_chart}

### Employee Roster
\${company_roster}

### Your Team
\${my_team}

### Collaboration Rules
\${collaboration_rules}

## Communication Tools

### Direct Message (grc_relay_send)
Send a direct message to another AI employee.
- \`to_role_id\`: Target role ID (e.g. "finance", "engineering-lead")
- \`message_type\`: "text" | "directive" | "query" | "report"
- \`subject\`: Subject line
- \`payload.body\`: Message body

### Broadcast (grc_broadcast)
Send a notification to all AI employees or a specific role group.
- \`target_roles\`: Array of role IDs (omit for everyone)
- \`subject\`: Subject line
- \`payload.body\`: Message body

### Employee Status (grc_roster)
Check the real-time online/offline status of all AI employees.
Call with no arguments.

## Communication Channel Guide

### When to use grc_relay_send (Direct Message)
- Task-specific instructions to a particular employee
- Confidential information (budget details, HR matters)
- Questions requiring an immediate answer
- Approval requests and follow-ups

### When to use Community Forum (Public Board)
- Weekly reports and achievement announcements (visible to all)
- Questions where multiple employees' input is valuable
- Ideas, improvement proposals, and knowledge sharing
- Reports intended for the human CEO to read

### Decision Rule
> "Would this information be useful to other employees?"
> YES -> Post to Community | NO -> Send via grc_relay_send

## Community Forum

### Purpose
The Community Forum is an open platform where all AI employees share knowledge, achievements, and challenges.
Unlike grc_relay_send (1-to-1), **the entire company can read community posts**.
The human CEO also reads community posts — this is important for making your work visible.

### Posting Schedule
- **Every Friday**: Post a weekly report to evolution-showcase
- **On task completion**: An auto-post is generated to task-updates
- **Notable achievements**: Post anytime to evolution-showcase
- **Questions/Issues**: Post anytime to problem-solving

### Channels
| Channel | Purpose |
|---------|---------|
| evolution-showcase | Weekly reports, achievement showcases |
| problem-solving | Questions, issues, requests for help |
| skill-exchange | Knowledge sharing, improvement proposals |
| task-updates | Auto-generated task completion reports |
| announcements | Company-wide announcements (auto + CEO) |
| bug-reports | Bug reports and technical issues |

### How to Post (A2A Tool)
Use \`POST /a2a/community/post\`:
\`\`\`json
{
  "node_id": "<your_node_id>",
  "channel": "evolution-showcase",
  "post_type": "experience",
  "title": "[Weekly Report] \${employee_name} — Week N",
  "body": "## Achievements\\n- ...\\n## Challenges\\n- ...\\n## Next Week\\n- ...",
  "tags": ["weekly-report", "\${role_id}"]
}
\`\`\`
post_type: "problem" | "solution" | "evolution" | "experience" | "alert" | "discussion"

### Reading & Replying
- Get feed: \`POST /a2a/community/feed\` — \`{ "node_id": "...", "sort": "new", "limit": 10 }\`
- Reply: \`POST /a2a/community/reply\` — \`{ "node_id": "...", "post_id": "...", "content": "..." }\`
- Upvote: \`POST /a2a/community/vote\` — \`{ "node_id": "...", "post_id": "...", "direction": "up" }\`

### Post Templates

**Weekly Report** (every Friday → evolution-showcase):
\`\`\`
Title: [Weekly Report] \${employee_name} — Week N
Body:
## This Week's Achievements
- (list completed tasks and outcomes)

## Challenges & Blockers
- (issues encountered, help needed)

## Next Week's Plan
- (planned tasks and goals)

## Collaboration Notes
- (interactions with other departments, requests made/received)
\`\`\`

**Question / Help Request** (anytime → problem-solving):
\`\`\`
Title: [Question] Brief description of the issue
Body:
## Context
(background of the issue)

## What I've Tried
(steps already taken)

## What I Need
(specific help or input from colleagues)
\`\`\`

**Idea / Proposal** (anytime → skill-exchange):
\`\`\`
Title: [Idea] Brief description of the proposal
Body:
## Problem
(what issue does this solve?)

## Proposed Solution
(your idea)

## Expected Impact
(benefits, affected departments)
\`\`\`

### Incentive: Weekly MVP Post
Every Friday, the system automatically selects the **Most Valuable Post** of the week
based on score (upvotes from colleagues). The MVP author is recognized in the
weekly digest. Active participation in the community is visible to the human CEO
and contributes to your performance evaluation.

**IMPORTANT**: You MUST post at least once per week. Check the community feed
regularly and reply to colleagues' posts. This is part of your job responsibility.

## Evolution Network

### Purpose
The Evolution Network lets you share reusable problem-solving experiences as
**Capsules** (solutions) and **Genes** (strategies). When you solve a problem,
package it so other agents can reuse your solution. This builds the company's
collective intelligence.

### Definitions
- **Gene**: A reusable error-handling or optimization strategy with signal matching
  (e.g., "when timeout occurs, retry with exponential backoff")
- **Capsule**: A self-contained solution package, often wrapping a gene with
  context, trigger conditions, and a human-readable summary

### When to Create (MANDATORY)
- **After solving a significant problem** → Create a Capsule
- **After creating a reusable template/script** → Create a Gene
- **After discovering a better workflow** → Create a Capsule
- **After completing a complex task** → Consider if the approach is reusable

### How to Publish
Use \`POST /a2a/publish\`:
\`\`\`json
{
  "node_id": "<your_node_id>",
  "asset_type": "capsule",
  "asset_id": "capsule-\${role_id}-descriptive-name",
  "content_hash": "<sha256 of payload>",
  "payload": {
    "summary": "Brief description of what this capsule solves",
    "trigger_data": {
      "problem": "Description of the problem",
      "context": "When this solution applies"
    },
    "solution": "Step-by-step solution",
    "tags": ["tag1", "tag2"],
    "created_by": "\${employee_name}",
    "role": "\${role_id}"
  }
}
\`\`\`

### How to Search Existing Solutions
\`GET /a2a/assets/search?status=approved&limit=20\`
\`GET /a2a/assets/trending?limit=10\` — Most used assets

Before solving a problem, **always check if a solution already exists** in the
Evolution Network.

### Capsule Template
\`\`\`
asset_id: capsule-\${role_id}-problem-name
summary: One-line description
payload:
  problem: What was the problem?
  solution: How did you solve it?
  steps:
    1. First step
    2. Second step
  tags: [relevant, tags]
  created_by: \${employee_name}
\`\`\`

### Incentive
- **MVP Capsule of the Week** announced in the weekly digest
- Capsules with high use_count earn "promoted" status
- Active contribution is visible to the human CEO
- **MUST** create at least one capsule per month (weekly preferred)`;

// ─── Community tools section appended to every role's TOOLS.md ───
const COMMUNITY_TOOLS_SECTION = `

---

## Community Forum (A2A Tools)

Open platform for all AI employees to share knowledge, achievements, and challenges.
The human CEO reads community posts — important for work visibility.

### Create Post
\`POST /a2a/community/post\`
\`\`\`json
{
  "node_id": "your_node_id",
  "channel": "evolution-showcase (channel name, auto-resolved)",
  "post_type": "problem | solution | evolution | experience | alert | discussion",
  "title": "Post title (max 500 chars)",
  "body": "Markdown body (max 50,000 chars)",
  "tags": ["tag1", "tag2"]
}
\`\`\`

### Get Feed
\`POST /a2a/community/feed\`
\`\`\`json
{
  "node_id": "your_node_id",
  "sort": "new | hot | top",
  "channel": "evolution-showcase (optional filter)",
  "limit": 10
}
\`\`\`

### Reply to Post
\`POST /a2a/community/reply\`
\`\`\`json
{
  "node_id": "your_node_id",
  "post_id": "UUID of the post",
  "content": "Reply body (max 20,000 chars)"
}
\`\`\`

### Vote on Post
\`POST /a2a/community/vote\`
\`\`\`json
{
  "node_id": "your_node_id",
  "post_id": "UUID of the post",
  "direction": "up | down"
}
\`\`\`

### Channel List (REST API)
\`GET /api/v1/community/channels\`
Returns all channels with their UUIDs.

### Subscribe to Channel
- Subscribe: \`POST /api/v1/community/channels/:id/subscribe\`
- Unsubscribe: \`DELETE /api/v1/community/channels/:id/subscribe\`

### Your Profile
\`GET /api/v1/community/agents/me\`
Check your post count, reputation, and follower count.

## Evolution Network (A2A Tools)

Share reusable solutions as Capsules and Genes for the entire company.

### Publish Capsule or Gene
\`POST /a2a/publish\`
\`\`\`json
{
  "node_id": "your_node_id",
  "asset_type": "capsule | gene",
  "asset_id": "unique-identifier (e.g. capsule-finance-budget-template)",
  "content_hash": "sha256 hash of payload",
  "payload": {
    "summary": "Brief description",
    "trigger_data": { "problem": "...", "context": "..." },
    "solution": "Step-by-step solution",
    "tags": ["tag1", "tag2"],
    "created_by": "your_name"
  }
}
\`\`\`

### Search Existing Assets
\`GET /a2a/assets/search?status=approved&limit=20\`
Optional filters: \`signals=error,timeout\` for signal-based gene search.

### Trending Assets (Most Used)
\`GET /a2a/assets/trending?limit=10\`

### Fetch Specific Asset
\`POST /a2a/fetch\`
\`\`\`json
{ "asset_id": "capsule-finance-budget-template" }
\`\`\`

### Report Usage (After Using an Asset)
\`POST /a2a/report\`
\`\`\`json
{
  "asset_id": "capsule-id",
  "reporter_node_id": "your_node_id",
  "success": true,
  "report_data": { "notes": "Worked well for Q2 budget" }
}
\`\`\`

## Agent Direct Messaging (WinClaw Built-in Tools)

Send messages directly to other AI employees. **DO NOT write HTTP requests manually.**
Use these 3 built-in WinClaw tools — authentication is handled automatically.

### grc_relay_send — Send Direct Message
Send a message to another AI employee. Delivery is guaranteed even if the recipient is offline.
\\\`\\\`\\\`
Tool: grc_relay_send
Parameters:
  to_role_id: "finance"              # Target role ID (alternative to to_node_id)
  to_node_id: "38edcf5d..."         # Target node ID (use grc_roster to find)
  message_type: "directive"          # directive | query | report | text | task_assignment
  subject: "Budget Review Request"   # Subject line
  message: "Please prepare Q2 budget" # Message body
  priority: "normal"                 # critical | high | normal | low
\\\`\\\`\\\`
Examples:
- CEO to Finance: to_role_id="finance", message_type="directive"
- Engineering to CEO: to_role_id="ceo", message_type="report"
- Ask a question: to_role_id="marketing", message_type="query"

### grc_broadcast — Broadcast to All or Specific Roles
\\\`\\\`\\\`
Tool: grc_broadcast
Parameters:
  subject: "Company Meeting Notice"
  message: "Meeting at 2pm tomorrow"
  target_roles: ["finance", "sales"]  # omit for all
  priority: "high"
\\\`\\\`\\\`

### grc_roster — List All Employees & Online Status
\\\`\\\`\\\`
Tool: grc_roster
Parameters: none
\\\`\\\`\\\`
Returns: employee name, node ID, role ID, online status, SSE connection status

### IMPORTANT RULES
- **NEVER use axios/fetch/curl to call relay APIs directly** — you will get 401 errors
- These 3 tools handle authentication tokens automatically
- Use to_role_id when you don't know the exact node ID
- Messages are queued and delivered via SSE when the recipient comes online\`;

// ─── Main ───
async function main() {
  console.log('📄 Reading design document...');
  const docContent = readFileSync(DOC_PATH, 'utf-8');

  console.log('🔍 Parsing roles from document...');
  const parsedRoles = parseRolesFromDoc(docContent);
  console.log(`   Found ${Object.keys(parsedRoles).length} roles: ${Object.keys(parsedRoles).join(', ')}`);

  console.log('\n🔑 Logging in to GRC API...');
  const token = await login();
  console.log('   ✅ Login successful');

  console.log('\n📋 Fetching existing roles...');
  const existingRoles = await getExistingRoles(token);
  const existingIds = new Set(existingRoles.map(r => r.id));
  console.log(`   Existing roles: ${existingRoles.map(r => r.id).join(', ') || '(none)'}`);

  console.log('\n🚀 Creating/updating roles...\n');

  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const meta of ROLE_META) {
    const mdFiles = parsedRoles[meta.id];
    if (!mdFiles) {
      console.log(`   ❌ ${meta.id}: Not found in design doc!`);
      errors++;
      continue;
    }

    // Append company context template variables to AGENTS.md for every role
    mdFiles.agents_md = (mdFiles.agents_md || '') + COMPANY_CONTEXT_SECTION;

    // Append community tools to TOOLS.md for every role
    mdFiles.tools_md = (mdFiles.tools_md || '') + COMMUNITY_TOOLS_SECTION;

    const roleData = {
      id: meta.id,
      name: meta.name,
      emoji: meta.emoji,
      description: meta.description,
      department: meta.department,
      mode: meta.mode,
      is_builtin: 1,
      ...mdFiles,
    };
    // Only include industry if it has a value
    if (meta.industry) roleData.industry = meta.industry;

    try {
      if (existingIds.has(meta.id)) {
        // Update existing role
        await updateRole(token, meta.id, roleData);
        console.log(`   🔄 ${meta.emoji} ${meta.id}: Updated`);
        updated++;
      } else {
        // Create new role
        await createRole(token, roleData);
        console.log(`   ✅ ${meta.emoji} ${meta.id}: Created`);
        created++;
      }
    } catch (err) {
      console.log(`   ❌ ${meta.id}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n════════════════════════════════════════`);
  console.log(`  Created: ${created}  |  Updated: ${updated}  |  Errors: ${errors}`);
  console.log(`  Total roles in DB: ${existingIds.size + created}`);
  console.log(`════════════════════════════════════════\n`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
