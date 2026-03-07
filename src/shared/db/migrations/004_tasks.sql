-- 004_tasks.sql
-- Task Management for AI Employee Office Console

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

CREATE TABLE IF NOT EXISTS `tasks` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `task_code` VARCHAR(50) NOT NULL COMMENT 'Human-readable task code: CEO-001, MKT-Q1-003',
  `title` VARCHAR(500) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `category` VARCHAR(50) DEFAULT NULL COMMENT 'strategic, operational, administrative, expense',
  `priority` ENUM('critical','high','medium','low') NOT NULL DEFAULT 'medium',
  `status` ENUM('draft','pending','in_progress','blocked','review','approved','completed','cancelled') NOT NULL DEFAULT 'pending',
  `assigned_role_id` VARCHAR(50) DEFAULT NULL COMMENT 'FK to role_templates.id',
  `assigned_node_id` VARCHAR(255) DEFAULT NULL COMMENT 'Specific node assignment',
  `assigned_by` VARCHAR(255) DEFAULT NULL COMMENT 'node_id or grc-admin who assigned',
  `deadline` TIMESTAMP NULL DEFAULT NULL,
  `depends_on` JSON DEFAULT NULL COMMENT 'Array of task IDs this depends on',
  `collaborators` JSON DEFAULT NULL COMMENT 'Array of node_ids or role_ids',
  `deliverables` JSON DEFAULT NULL COMMENT 'Array of expected deliverable descriptions',
  `notes` TEXT DEFAULT NULL,
  `expense_amount` DECIMAL(15,2) DEFAULT NULL COMMENT 'Budget amount if expense task',
  `expense_currency` VARCHAR(10) DEFAULT NULL,
  `expense_approved` TINYINT(1) DEFAULT NULL COMMENT 'NULL=not expense, 0=pending, 1=approved',
  `expense_approved_by` VARCHAR(255) DEFAULT NULL,
  `expense_approved_at` TIMESTAMP NULL DEFAULT NULL,
  `result_summary` TEXT DEFAULT NULL COMMENT 'Completion summary by assignee',
  `result_data` JSON DEFAULT NULL COMMENT 'Structured completion data',
  `version` INT NOT NULL DEFAULT 1 COMMENT 'Optimistic lock version',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `completed_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_task_code` (`task_code`),
  INDEX `idx_status` (`status`),
  INDEX `idx_priority` (`priority`),
  INDEX `idx_assigned_role` (`assigned_role_id`),
  INDEX `idx_assigned_node` (`assigned_node_id`),
  INDEX `idx_category` (`category`),
  INDEX `idx_deadline` (`deadline`),
  INDEX `idx_expense_approved` (`expense_approved`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `task_progress_log` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `task_id` CHAR(36) NOT NULL,
  `actor` VARCHAR(255) NOT NULL COMMENT 'node_id or admin email',
  `action` VARCHAR(50) NOT NULL COMMENT 'status_change, comment, assignment, expense_decision',
  `from_status` VARCHAR(30) DEFAULT NULL,
  `to_status` VARCHAR(30) DEFAULT NULL,
  `details` JSON DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_task_id` (`task_id`),
  INDEX `idx_created_at` (`created_at`),
  CONSTRAINT `fk_progress_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `task_comments` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `task_id` CHAR(36) NOT NULL,
  `author` VARCHAR(255) NOT NULL COMMENT 'node_id or admin email',
  `content` TEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_task_id` (`task_id`),
  CONSTRAINT `fk_comment_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
