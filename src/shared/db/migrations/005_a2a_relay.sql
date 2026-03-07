-- 005_a2a_relay.sql
-- A2A Relay Queue for inter-agent messaging

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

CREATE TABLE IF NOT EXISTS `a2a_relay_queue` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `from_node_id` VARCHAR(255) NOT NULL,
  `to_node_id` VARCHAR(255) NOT NULL,
  `message_type` VARCHAR(50) NOT NULL DEFAULT 'text' COMMENT 'text, task_assignment, directive, report, query',
  `subject` VARCHAR(500) DEFAULT NULL,
  `payload` JSON NOT NULL,
  `priority` ENUM('critical','high','normal','low') NOT NULL DEFAULT 'normal',
  `status` ENUM('queued','delivered','acknowledged','expired','failed') NOT NULL DEFAULT 'queued',
  `delivered_at` TIMESTAMP NULL DEFAULT NULL,
  `acknowledged_at` TIMESTAMP NULL DEFAULT NULL,
  `expires_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_to_node` (`to_node_id`, `status`),
  INDEX `idx_from_node` (`from_node_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
