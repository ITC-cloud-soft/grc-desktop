-- 026_sales_pipeline.sql
-- Sales Pipeline table for deal tracking and pipeline management

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

CREATE TABLE IF NOT EXISTS `sales_pipeline` (
  `id` CHAR(36) NOT NULL,
  `company_name` VARCHAR(200) NOT NULL,
  `contact_name` VARCHAR(100) DEFAULT NULL,
  `deal_title` VARCHAR(200) NOT NULL,
  `pipeline_stage` ENUM('lead','qualified','proposal','negotiation','closed_won','closed_lost') NOT NULL DEFAULT 'lead',
  `deal_value` DECIMAL(14,2) DEFAULT NULL,
  `currency` VARCHAR(3) DEFAULT 'JPY',
  `probability` INT DEFAULT 0,
  `expected_close_date` DATETIME DEFAULT NULL,
  `owner_id` VARCHAR(100) DEFAULT NULL,
  `owner_role` VARCHAR(50) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_pipeline_stage` (`pipeline_stage`),
  INDEX `idx_pipeline_owner` (`owner_id`),
  INDEX `idx_pipeline_close_date` (`expected_close_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
