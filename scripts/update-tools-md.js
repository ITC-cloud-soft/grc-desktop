/**
 * Update tools_md for all 184 role_templates:
 * 1. Fix "JWT tokens automatically" → "API key authentication automatically" (8 templates)
 * 2. Add Campaign, Pipeline, Roadmap, KPI A2A endpoints before "## Evolution Network" (all 184)
 *
 * Targets: SQLite (GRC Desktop), MySQL (GRC Cloud / Azure)
 */

// ── New business API section to insert ──────────
const BUSINESS_API_BLOCK = `
## Campaign Management (A2A)
- GET /a2a/tasks/campaigns — List campaigns (query: status, start_from, start_to)
- POST /a2a/tasks/campaigns — Create campaign
  - Fields: title, description, start_date, end_date, status (draft|planned|active|completed|cancelled), owner_role, channel, budget, kpi_target
- PUT /a2a/tasks/campaigns/:id — Update campaign
- DELETE /a2a/tasks/campaigns/:id — Delete campaign

## Sales Pipeline (A2A)
- GET /a2a/tasks/pipeline — List deals (query: stage, owner_id)
- GET /a2a/tasks/pipeline/summary — Pipeline summary stats
- POST /a2a/tasks/pipeline — Create deal
  - Fields: company_name, contact_name, deal_title, stage (lead|qualified|proposal|negotiation|closed_won|closed_lost), deal_value, currency, probability, expected_close_date, owner_role, notes
- PUT /a2a/tasks/pipeline/:id — Update deal
- DELETE /a2a/tasks/pipeline/:id — Delete deal

## Roadmap (A2A)
- GET /a2a/tasks/roadmap — List items (query: phase, priority, category)
- POST /a2a/tasks/roadmap — Create item
  - Fields: title, description, phase (now|next|later|done), priority (must|should|could|wont), category, start_date, end_date, progress, owner_role
- PUT /a2a/tasks/roadmap/:id — Update item
- DELETE /a2a/tasks/roadmap/:id — Delete item

## KPI Tracking (A2A)
- GET /a2a/tasks/kpis — List KPI definitions
- GET /a2a/tasks/kpis/dashboard — KPI dashboard overview
- POST /a2a/tasks/kpis — Create KPI definition
  - Fields: name, description, category, unit, target_value, target_period (daily|weekly|monthly|quarterly|yearly), owner_role
- PUT /a2a/tasks/kpis/:id — Update KPI definition
- POST /a2a/tasks/kpis/:id/record — Record KPI value (value, recorded_by, notes)
- GET /a2a/tasks/kpis/:id/history — KPI measurement history

`;

function updateToolsMd(toolsMd) {
  if (!toolsMd) return { updated: false, md: toolsMd };

  let md = toolsMd;
  let changed = false;

  // 1. Fix JWT → API key text (for the 8 detailed templates)
  if (md.includes('JWT tokens automatically')) {
    md = md.replace(
      /All tools listed above handle JWT tokens automatically\.\s*\nIf you get 401 errors, it means you are calling APIs manually instead of using tools\./g,
      'All tools listed above handle API key authentication automatically (via `x-api-key` header).\nIf you get 401 errors, it means you are calling APIs manually instead of using the built-in tools.'
    );
    changed = true;
  }

  // 2. Add business API block before "## Evolution Network" (if not already present)
  if (!md.includes('/a2a/tasks/campaigns')) {
    const evoMarker = '## Evolution Network';
    const evoIdx = md.indexOf(evoMarker);
    if (evoIdx >= 0) {
      md = md.substring(0, evoIdx) + BUSINESS_API_BLOCK + md.substring(evoIdx);
      changed = true;
    }
  }

  return { updated: changed, md };
}

async function updateSqlite() {
  const Database = require('better-sqlite3');
  const dbPath = process.env.APPDATA + '/GRC/data/grc.db';
  const db = new Database(dbPath);

  const rows = db.prepare('SELECT id, tools_md FROM role_templates').all();
  let updated = 0;

  const updateStmt = db.prepare('UPDATE role_templates SET tools_md = ?, updated_at = ? WHERE id = ?');

  const tx = db.transaction(() => {
    for (const row of rows) {
      const result = updateToolsMd(row.tools_md);
      if (result.updated) {
        updateStmt.run(result.md, new Date().toISOString(), row.id);
        updated++;
      }
    }
  });

  tx();
  console.error(`[SQLite] Updated ${updated}/${rows.length} role_templates`);
  db.close();
}

async function updateMySQL() {
  const mysql = require('mysql2/promise');

  // Parse DATABASE_URL from GRC .env
  let config;
  try {
    const fs = require('fs');
    const envContent = fs.readFileSync('C:/work/grc/.env', 'utf8');
    const dbUrlMatch = envContent.match(/DATABASE_URL=mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (!dbUrlMatch) throw new Error('DATABASE_URL not found');
    config = {
      host: dbUrlMatch[3],
      port: parseInt(dbUrlMatch[4]),
      user: dbUrlMatch[1],
      password: dbUrlMatch[2],
      database: dbUrlMatch[5].trim(),
    };
    console.error(`[MySQL] Connecting to ${config.host}:${config.port}/${config.database}`);
  } catch (e) {
    console.error(`[MySQL] Failed to parse config: ${e.message}`);
    return;
  }

  let conn;
  try {
    conn = await mysql.createConnection(config);

    const [rows] = await conn.execute('SELECT id, tools_md FROM role_templates');
    let updated = 0;

    for (const row of rows) {
      const result = updateToolsMd(row.tools_md);
      if (result.updated) {
        await conn.execute(
          'UPDATE role_templates SET tools_md = ?, updated_at = NOW() WHERE id = ?',
          [result.md, row.id]
        );
        updated++;
      }
    }

    console.error(`[MySQL] Updated ${updated}/${rows.length} role_templates`);
  } catch (e) {
    console.error(`[MySQL] Error: ${e.message}`);
  } finally {
    if (conn) await conn.end();
  }
}

async function main() {
  console.error('=== Updating tools_md for all role_templates ===\n');

  // 1. SQLite (GRC Desktop)
  await updateSqlite();

  // 2. MySQL (GRC Cloud / Azure)
  await updateMySQL();

  console.error('\nDone.');
}

main().catch(e => console.error('Fatal:', e));
