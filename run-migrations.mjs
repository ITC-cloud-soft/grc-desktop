import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

async function run() {
  const conn = await mysql.createConnection('mysql://root:Admin123@13.78.81.86:18306/grc-server');
  const files = [
    '003_role_templates.sql',
    '004_tasks.sql',
    '005_a2a_relay.sql',
    '006_nodes_role.sql',
    '007_company_strategy.sql',
  ];
  for (const f of files) {
    const p = path.join('src/shared/db/migrations', f);
    const sql = fs.readFileSync(p, 'utf8');
    const stmts = sql.split(';').map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('--'));
    console.log(`Running: ${f} (${stmts.length} statements)`);
    for (const stmt of stmts) {
      try {
        await conn.query(stmt);
        console.log('  OK');
      } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME' || e.code === 'ER_DUP_KEYNAME' || e.message?.includes('Duplicate')) {
          console.log(`  SKIP: ${e.message?.slice(0, 80)}`);
        } else {
          console.log(`  ERROR: ${e.message?.slice(0, 120)}`);
        }
      }
    }
  }
  await conn.end();
  console.log('All migrations complete');
}
run().catch(e => console.error('FATAL:', e.message));
