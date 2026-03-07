import mysql from 'mysql2/promise';

async function run() {
  const conn = await mysql.createConnection('mysql://root:Admin123@13.78.81.86:18306/grc-server');
  try {
    await conn.query(`ALTER TABLE nodes
      ADD COLUMN role_id VARCHAR(50) DEFAULT NULL AFTER employee_email,
      ADD COLUMN role_mode ENUM('autonomous','copilot') DEFAULT NULL AFTER role_id,
      ADD COLUMN config_revision INT NOT NULL DEFAULT 0 AFTER role_mode,
      ADD COLUMN config_applied_revision INT NOT NULL DEFAULT 0 AFTER config_revision,
      ADD COLUMN assignment_variables JSON DEFAULT NULL AFTER config_applied_revision,
      ADD COLUMN config_overrides JSON DEFAULT NULL AFTER assignment_variables,
      ADD COLUMN resolved_agents_md MEDIUMTEXT DEFAULT NULL AFTER config_overrides,
      ADD COLUMN resolved_soul_md MEDIUMTEXT DEFAULT NULL AFTER resolved_agents_md,
      ADD COLUMN resolved_identity_md MEDIUMTEXT DEFAULT NULL AFTER resolved_soul_md,
      ADD COLUMN resolved_user_md MEDIUMTEXT DEFAULT NULL AFTER resolved_identity_md,
      ADD COLUMN resolved_tools_md MEDIUMTEXT DEFAULT NULL AFTER resolved_user_md,
      ADD COLUMN resolved_heartbeat_md MEDIUMTEXT DEFAULT NULL AFTER resolved_tools_md,
      ADD COLUMN resolved_bootstrap_md MEDIUMTEXT DEFAULT NULL AFTER resolved_heartbeat_md,
      ADD COLUMN resolved_tasks_md MEDIUMTEXT DEFAULT NULL AFTER resolved_bootstrap_md,
      ADD INDEX idx_role_id (role_id),
      ADD INDEX idx_config_revision (config_revision)`);
    console.log('006 migration OK');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME' || e.code === 'ER_DUP_KEYNAME') {
      console.log('006 SKIP: columns/indexes already exist');
    } else {
      console.log('006 ERROR:', e.message);
    }
  }
  await conn.end();
}
run();
