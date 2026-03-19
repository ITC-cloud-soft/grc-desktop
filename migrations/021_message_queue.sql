-- Migration 021: Async Message Queue (Phase 2.3)
--
-- Persistent message queue to replace synchronous sessions_send
-- which frequently times out under load.

CREATE TABLE IF NOT EXISTS message_queue (
  id          CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
  from_node_id VARCHAR(128) NOT NULL,
  to_node_id   VARCHAR(128) NULL,
  to_role_id   VARCHAR(50)  NULL,
  message_type VARCHAR(20)  NOT NULL,
  subject      VARCHAR(255) NULL,
  body         TEXT         NULL,
  priority     ENUM('critical','high','normal','low') NOT NULL DEFAULT 'normal',
  status       ENUM('pending','delivered','read','failed','expired') NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  delivered_at TIMESTAMP    NULL,
  read_at      TIMESTAMP    NULL,

  INDEX idx_mq_to_node_status (to_node_id, status),
  INDEX idx_mq_to_role_status (to_role_id, status),
  INDEX idx_mq_from_node      (from_node_id),
  INDEX idx_mq_status         (status),
  INDEX idx_mq_priority       (priority),
  INDEX idx_mq_created_at     (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
