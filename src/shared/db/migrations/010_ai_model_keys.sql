-- 010_ai_model_keys.sql — AI Model API Key Management
-- Adds ai_model_keys table and extends nodes with key assignment columns.

CREATE TABLE IF NOT EXISTS ai_model_keys (
  id            CHAR(36)     NOT NULL PRIMARY KEY,
  category      ENUM('primary','auxiliary') NOT NULL COMMENT '密钥类别: 主业务/辅助业务',
  name          VARCHAR(100) NOT NULL COMMENT '显示名称',
  provider      VARCHAR(50)  NOT NULL COMMENT '提供商: openai/anthropic/google/deepseek/qwen/custom',
  model_name    VARCHAR(100) NOT NULL COMMENT '模型名称',
  api_key_enc   TEXT         NOT NULL COMMENT 'AES-256-GCM 加密后的API密钥',
  base_url      VARCHAR(500) DEFAULT NULL COMMENT '自定义API端点URL (可选)',
  notes         TEXT         DEFAULT NULL COMMENT '备注信息',
  is_active     TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '是否激活',
  created_by    VARCHAR(255) NOT NULL DEFAULT '' COMMENT '创建者',
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_mk_category (category),
  INDEX idx_mk_provider (provider),
  INDEX idx_mk_active (is_active)
);

-- Extend nodes table with key assignment columns
ALTER TABLE nodes
  ADD COLUMN primary_key_id   CHAR(36) DEFAULT NULL COMMENT '割当済み主業務密鍵FK',
  ADD COLUMN auxiliary_key_id  CHAR(36) DEFAULT NULL COMMENT '割当済み辅助業務密鍵FK',
  ADD COLUMN key_config_json   JSON     DEFAULT NULL COMMENT '解決済み密鍵設定JSON';

ALTER TABLE nodes
  ADD INDEX idx_primary_key (primary_key_id),
  ADD INDEX idx_auxiliary_key (auxiliary_key_id);
