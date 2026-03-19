-- 031: Skill Catalog table for role skill recommendations
CREATE TABLE IF NOT EXISTS skill_catalog (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  plugin_name VARCHAR(100) NOT NULL,
  tier ENUM('P0', 'P1', 'P2', 'P3') NOT NULL,
  description TEXT,
  capabilities TEXT,
  slash_commands TEXT,
  departments TEXT,
  role_count INT DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
