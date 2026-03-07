-- 002_employee_fields.sql
-- Add employee identification fields to nodes table.
-- These allow WinClaw AI assistants to identify which employee they represent.

ALTER TABLE `nodes`
  ADD COLUMN `employee_id` VARCHAR(100) DEFAULT NULL COMMENT 'Employee ID' AFTER `env_fingerprint`,
  ADD COLUMN `employee_name` VARCHAR(255) DEFAULT NULL COMMENT 'Employee display name' AFTER `employee_id`,
  ADD COLUMN `employee_email` VARCHAR(255) DEFAULT NULL COMMENT 'Employee contact email' AFTER `employee_name`;
