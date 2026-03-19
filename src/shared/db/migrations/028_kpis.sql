-- Migration 028: KPI Definitions and Records tables
-- Supports KPI tracking with target values, periods, and historical records

CREATE TABLE IF NOT EXISTS kpi_definitions (
  id              CHAR(36)       NOT NULL PRIMARY KEY,
  name            VARCHAR(100)   NOT NULL,
  description     TEXT           NULL,
  category        VARCHAR(50)    NULL,
  unit            VARCHAR(20)    NULL,
  target_value    DECIMAL(14,2)  NULL,
  kpi_period      ENUM('daily','weekly','monthly','quarterly','yearly') DEFAULT 'monthly',
  owner_role      VARCHAR(50)    NULL,
  created_at      DATETIME       DEFAULT NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kpi_records (
  id              CHAR(36)       NOT NULL PRIMARY KEY,
  kpi_id          CHAR(36)       NOT NULL,
  value           DECIMAL(14,2)  NOT NULL,
  recorded_at     DATETIME       DEFAULT NOW(),
  recorded_by     VARCHAR(100)   NULL,
  notes           TEXT           NULL,
  INDEX idx_kpi_records_kpi_id (kpi_id),
  INDEX idx_kpi_records_recorded_at (recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
