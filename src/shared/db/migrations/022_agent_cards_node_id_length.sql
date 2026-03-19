-- Migration 022: Widen agent_cards.node_id from CHAR(36) to VARCHAR(128)
-- Reason: WinClaw node IDs are SHA-256 hashes (64 hex chars), not UUIDs (36 chars).
-- This caused "Data too long for column 'node_id'" errors on Agent Card registration.

ALTER TABLE `agent_cards`
  MODIFY COLUMN `node_id` VARCHAR(128) NOT NULL;
