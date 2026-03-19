-- Agent Direct Messages Table
-- Created: 2026-03-18
-- Purpose: Enable P2P messaging between AI agents

CREATE TABLE IF NOT EXISTS agent_messages (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  from_node_id VARCHAR(255) NOT NULL,
  to_node_id VARCHAR(255) NOT NULL,
  message_type VARCHAR(50) NOT NULL,
  subject VARCHAR(500),
  payload JSON,
  `read` TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_agent_msg_to ON agent_messages (to_node_id);
CREATE INDEX idx_agent_msg_from ON agent_messages (from_node_id);
CREATE INDEX idx_agent_msg_created ON agent_messages (created_at);
