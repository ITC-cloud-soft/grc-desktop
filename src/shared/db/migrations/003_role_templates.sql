-- 003_role_templates.sql
-- Role Templates for AI Employee Office Console

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

CREATE TABLE IF NOT EXISTS `role_templates` (
  `id` VARCHAR(50) NOT NULL COMMENT 'Role identifier: ceo, marketing, custom-xyz',
  `name` VARCHAR(255) NOT NULL COMMENT 'Display name',
  `emoji` VARCHAR(10) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `department` VARCHAR(100) DEFAULT NULL,
  `industry` VARCHAR(100) DEFAULT NULL COMMENT 'NULL = universal, or specific industry tag',
  `mode` ENUM('autonomous','copilot') NOT NULL DEFAULT 'autonomous',
  `is_builtin` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'TRUE for the 9 starter templates',
  `agents_md` MEDIUMTEXT NOT NULL COMMENT 'AGENTS.md content (MUST be English)',
  `soul_md` MEDIUMTEXT NOT NULL COMMENT 'SOUL.md content',
  `identity_md` MEDIUMTEXT NOT NULL COMMENT 'IDENTITY.md content',
  `user_md` MEDIUMTEXT NOT NULL COMMENT 'USER.md content',
  `tools_md` MEDIUMTEXT NOT NULL COMMENT 'TOOLS.md content',
  `heartbeat_md` MEDIUMTEXT NOT NULL COMMENT 'HEARTBEAT.md content',
  `bootstrap_md` MEDIUMTEXT NOT NULL COMMENT 'BOOTSTRAP.md content',
  `tasks_md` MEDIUMTEXT NOT NULL COMMENT 'TASKS.md content (template)',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_department` (`department`),
  INDEX `idx_industry` (`industry`),
  INDEX `idx_mode` (`mode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
