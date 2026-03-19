-- Migration 027: Roadmap Items table
-- Supports phase-based product roadmap tracking with priority and progress

CREATE TABLE IF NOT EXISTS roadmap_items (
  id              CHAR(36)      NOT NULL PRIMARY KEY,
  title           VARCHAR(200)  NOT NULL,
  description     TEXT          NULL,
  roadmap_phase   ENUM('now','next','later','done') DEFAULT 'later',
  roadmap_priority ENUM('must','should','could','wont') DEFAULT 'should',
  category        VARCHAR(50)   NULL,
  start_date      DATETIME      NULL,
  end_date        DATETIME      NULL,
  progress        INT           DEFAULT 0,
  owner_id        VARCHAR(100)  NULL,
  owner_role      VARCHAR(50)   NULL,
  linked_task_ids TEXT          NULL,
  created_at      DATETIME      DEFAULT NOW(),
  updated_at      DATETIME      DEFAULT NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indexes for common query patterns
CREATE INDEX idx_roadmap_phase    ON roadmap_items (roadmap_phase);
CREATE INDEX idx_roadmap_priority ON roadmap_items (roadmap_priority);
CREATE INDEX idx_roadmap_category ON roadmap_items (category);
