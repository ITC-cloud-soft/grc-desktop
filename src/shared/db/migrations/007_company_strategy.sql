-- 007_company_strategy.sql
-- Company Strategy Management tables

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

CREATE TABLE IF NOT EXISTS `company_strategy` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `company_mission` TEXT DEFAULT NULL,
  `company_vision` TEXT DEFAULT NULL,
  `company_values` TEXT DEFAULT NULL,
  `short_term_objectives` JSON DEFAULT NULL COMMENT 'Quarterly goals array',
  `mid_term_objectives` JSON DEFAULT NULL COMMENT 'Annual goals',
  `long_term_objectives` JSON DEFAULT NULL COMMENT '3-5 year milestones',
  `department_budgets` JSON DEFAULT NULL COMMENT 'Per-department budget allocations',
  `department_kpis` JSON DEFAULT NULL COMMENT 'Per-department KPI targets',
  `strategic_priorities` JSON DEFAULT NULL COMMENT 'Ordered priority list',
  `revision` INT NOT NULL DEFAULT 1,
  `updated_by` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `company_strategy_history` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `strategy_id` CHAR(36) NOT NULL,
  `revision` INT NOT NULL,
  `snapshot` JSON NOT NULL COMMENT 'Full strategy snapshot',
  `changed_by` VARCHAR(255) DEFAULT NULL,
  `change_summary` TEXT DEFAULT NULL,
  `changed_fields` JSON DEFAULT NULL COMMENT 'Array of field names that changed',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_strategy_id` (`strategy_id`),
  INDEX `idx_revision` (`revision`),
  CONSTRAINT `fk_history_strategy` FOREIGN KEY (`strategy_id`) REFERENCES `company_strategy` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
