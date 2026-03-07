-- 006_nodes_role.sql
-- Add role assignment and config distribution fields to nodes table

ALTER TABLE `nodes`
  ADD COLUMN `role_id` VARCHAR(50) DEFAULT NULL COMMENT 'FK to role_templates.id' AFTER `employee_email`,
  ADD COLUMN `role_mode` ENUM('autonomous','copilot') DEFAULT NULL AFTER `role_id`,
  ADD COLUMN `config_revision` INT NOT NULL DEFAULT 0 COMMENT 'Incremented on each config change' AFTER `role_mode`,
  ADD COLUMN `config_applied_revision` INT NOT NULL DEFAULT 0 COMMENT 'Last revision confirmed by client' AFTER `config_revision`,
  ADD COLUMN `assignment_variables` JSON DEFAULT NULL COMMENT 'Template variables for this assignment' AFTER `config_applied_revision`,
  ADD COLUMN `config_overrides` JSON DEFAULT NULL COMMENT 'Per-file content overrides' AFTER `assignment_variables`,
  ADD COLUMN `resolved_agents_md` MEDIUMTEXT DEFAULT NULL COMMENT 'Resolved AGENTS.md with vars applied' AFTER `config_overrides`,
  ADD COLUMN `resolved_soul_md` MEDIUMTEXT DEFAULT NULL AFTER `resolved_agents_md`,
  ADD COLUMN `resolved_identity_md` MEDIUMTEXT DEFAULT NULL AFTER `resolved_soul_md`,
  ADD COLUMN `resolved_user_md` MEDIUMTEXT DEFAULT NULL AFTER `resolved_identity_md`,
  ADD COLUMN `resolved_tools_md` MEDIUMTEXT DEFAULT NULL AFTER `resolved_user_md`,
  ADD COLUMN `resolved_heartbeat_md` MEDIUMTEXT DEFAULT NULL AFTER `resolved_tools_md`,
  ADD COLUMN `resolved_bootstrap_md` MEDIUMTEXT DEFAULT NULL AFTER `resolved_heartbeat_md`,
  ADD COLUMN `resolved_tasks_md` MEDIUMTEXT DEFAULT NULL AFTER `resolved_bootstrap_md`,
  ADD INDEX `idx_role_id` (`role_id`),
  ADD INDEX `idx_config_revision` (`config_revision`);
