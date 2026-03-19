-- 025_campaigns.sql
-- Campaign Calendar table for marketing campaign management

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

CREATE TABLE IF NOT EXISTS `campaigns` (
  `id` CHAR(36) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `start_date` DATETIME NOT NULL,
  `end_date` DATETIME DEFAULT NULL,
  `campaign_status` ENUM('draft','planned','active','completed','cancelled') NOT NULL DEFAULT 'draft',
  `owner_id` VARCHAR(100) DEFAULT NULL,
  `owner_role` VARCHAR(50) DEFAULT NULL,
  `channel` VARCHAR(50) DEFAULT NULL,
  `budget` DECIMAL(12,2) DEFAULT NULL,
  `kpi_target` VARCHAR(200) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_campaign_status` (`campaign_status`),
  INDEX `idx_campaign_start_date` (`start_date`),
  INDEX `idx_campaign_owner` (`owner_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
