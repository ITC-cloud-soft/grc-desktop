-- ─────────────────────────────────────────────────────────────────────────────
-- GRC Desktop — Unified SQLite Schema
-- Generated from MySQL migrations 001 through 031
-- Conversion: MySQL → SQLite (see ADR-002)
-- ─────────────────────────────────────────────────────────────────────────────

PRAGMA foreign_keys = ON;

-- ══════════════════════════════════════════════════
-- Module: Auth
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS users (
  id            TEXT NOT NULL,
  provider      TEXT NOT NULL,
  provider_id   TEXT NOT NULL,
  display_name  TEXT DEFAULT NULL,
  avatar_url    TEXT DEFAULT NULL,
  email         TEXT DEFAULT NULL,
  password_hash TEXT DEFAULT NULL,
  tier          TEXT NOT NULL DEFAULT 'free',
  role          TEXT NOT NULL DEFAULT 'user',
  promoted_asset_count INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (id),
  UNIQUE (provider, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_users_tier  ON users (tier);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

CREATE TABLE IF NOT EXISTS api_keys (
  id            TEXT NOT NULL,
  user_id       TEXT NOT NULL,
  key_hash      TEXT NOT NULL,
  key_prefix    TEXT NOT NULL,
  name          TEXT NOT NULL,
  scopes        TEXT NOT NULL DEFAULT '[]',
  last_used_at  TEXT DEFAULT NULL,
  expires_at    TEXT DEFAULT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (id),
  UNIQUE (key_hash),
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys (user_id);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id            TEXT NOT NULL,
  user_id       TEXT NOT NULL,
  token_hash    TEXT NOT NULL,
  expires_at    TEXT NOT NULL,
  revoked_at    TEXT DEFAULT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id    ON refresh_tokens (user_id);

-- verification_codes referenced by migration 011 (ALTER COLUMN code length fix)
CREATE TABLE IF NOT EXISTS verification_codes (
  id         TEXT NOT NULL,
  email      TEXT NOT NULL,
  code       TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at    TEXT DEFAULT NULL,
  attempts   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (id)
);

-- ══════════════════════════════════════════════════
-- Module: Node Management
-- (includes columns added by migrations 002, 006, 010, 013, 014)
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS nodes (
  id                       TEXT NOT NULL,
  node_id                  TEXT NOT NULL,
  user_id                  TEXT DEFAULT NULL,
  display_name             TEXT DEFAULT NULL,
  platform                 TEXT DEFAULT NULL,
  winclaw_version          TEXT DEFAULT NULL,
  last_heartbeat           TEXT DEFAULT NULL,
  capabilities             TEXT DEFAULT NULL,
  gene_count               INTEGER NOT NULL DEFAULT 0,
  capsule_count            INTEGER NOT NULL DEFAULT 0,
  env_fingerprint          TEXT DEFAULT NULL,
  -- 002: employee identification fields
  employee_id              TEXT DEFAULT NULL,
  employee_name            TEXT DEFAULT NULL,
  employee_email           TEXT DEFAULT NULL,
  -- 006: role assignment and config distribution
  role_id                  TEXT DEFAULT NULL,
  role_mode                TEXT CHECK(role_mode IN ('autonomous','copilot')) DEFAULT NULL,
  config_revision          INTEGER NOT NULL DEFAULT 0,
  config_applied_revision  INTEGER NOT NULL DEFAULT 0,
  assignment_variables     TEXT DEFAULT NULL,
  config_overrides         TEXT DEFAULT NULL,
  resolved_agents_md       TEXT DEFAULT NULL,
  resolved_soul_md         TEXT DEFAULT NULL,
  resolved_identity_md     TEXT DEFAULT NULL,
  resolved_user_md         TEXT DEFAULT NULL,
  resolved_tools_md        TEXT DEFAULT NULL,
  resolved_heartbeat_md    TEXT DEFAULT NULL,
  resolved_bootstrap_md    TEXT DEFAULT NULL,
  resolved_tasks_md        TEXT DEFAULT NULL,
  -- 010: AI model key assignment
  primary_key_id           TEXT DEFAULT NULL,
  auxiliary_key_id         TEXT DEFAULT NULL,
  key_config_json          TEXT DEFAULT NULL,
  -- 014: provisioning / container support
  provisioning_mode        TEXT CHECK(provisioning_mode IN ('local_docker','daytona_sandbox')) DEFAULT NULL,
  container_id             TEXT DEFAULT NULL,
  sandbox_id               TEXT DEFAULT NULL,
  gateway_url              TEXT DEFAULT NULL,
  gateway_port             INTEGER DEFAULT NULL,
  workspace_path           TEXT DEFAULT NULL,
  created_at               TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at               TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (id),
  UNIQUE (node_id),
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_nodes_user_id           ON nodes (user_id);
CREATE INDEX IF NOT EXISTS idx_nodes_last_heartbeat    ON nodes (last_heartbeat);
CREATE INDEX IF NOT EXISTS idx_nodes_role_id           ON nodes (role_id);
CREATE INDEX IF NOT EXISTS idx_nodes_config_revision   ON nodes (config_revision);
CREATE INDEX IF NOT EXISTS idx_nodes_primary_key       ON nodes (primary_key_id);
CREATE INDEX IF NOT EXISTS idx_nodes_auxiliary_key     ON nodes (auxiliary_key_id);

-- ══════════════════════════════════════════════════
-- Module: AI Model Keys
-- (migration 010 + 013 api_type column)
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ai_model_keys (
  id           TEXT NOT NULL,
  category     TEXT NOT NULL CHECK(category IN ('primary','auxiliary')),
  name         TEXT NOT NULL,
  provider     TEXT NOT NULL,
  model_name   TEXT NOT NULL,
  api_key_enc  TEXT NOT NULL,
  base_url     TEXT DEFAULT NULL,
  notes        TEXT DEFAULT NULL,
  is_active    INTEGER NOT NULL DEFAULT 1,
  created_by   TEXT NOT NULL DEFAULT '',
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_mk_category ON ai_model_keys (category);
CREATE INDEX IF NOT EXISTS idx_mk_provider  ON ai_model_keys (provider);
CREATE INDEX IF NOT EXISTS idx_mk_active    ON ai_model_keys (is_active);

-- ══════════════════════════════════════════════════
-- Module: Role Templates
-- (migration 003)
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS role_templates (
  id              TEXT NOT NULL,
  name            TEXT NOT NULL,
  emoji           TEXT DEFAULT NULL,
  description     TEXT DEFAULT NULL,
  department      TEXT DEFAULT NULL,
  industry        TEXT DEFAULT NULL,
  mode            TEXT NOT NULL DEFAULT 'autonomous' CHECK(mode IN ('autonomous','copilot')),
  is_builtin      INTEGER NOT NULL DEFAULT 0,
  agents_md       TEXT NOT NULL,
  soul_md         TEXT NOT NULL,
  identity_md     TEXT NOT NULL,
  user_md         TEXT NOT NULL,
  tools_md        TEXT NOT NULL,
  heartbeat_md    TEXT NOT NULL,
  bootstrap_md    TEXT NOT NULL,
  tasks_md        TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_role_templates_department ON role_templates (department);
CREATE INDEX IF NOT EXISTS idx_role_templates_industry   ON role_templates (industry);
CREATE INDEX IF NOT EXISTS idx_role_templates_mode       ON role_templates (mode);

-- ══════════════════════════════════════════════════
-- Module: Role Job Descriptions
-- (migration 016)
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS role_job_descriptions (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  role_id          TEXT NOT NULL UNIQUE,
  display_name     TEXT NOT NULL,
  summary          TEXT NOT NULL,
  responsibilities TEXT NOT NULL,
  expertise        TEXT DEFAULT NULL,
  reports_to       TEXT DEFAULT NULL,
  collaboration    TEXT DEFAULT NULL,
  created_at       TEXT DEFAULT (datetime('now')),
  updated_at       TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (role_id) REFERENCES role_templates (id) ON DELETE CASCADE
);

-- ══════════════════════════════════════════════════
-- Module: Skill Catalog
-- (migration 031)
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS skill_catalog (
  id            TEXT NOT NULL,
  name          TEXT NOT NULL,
  plugin_name   TEXT NOT NULL,
  tier          TEXT NOT NULL CHECK(tier IN ('P0','P1','P2','P3')),
  description   TEXT DEFAULT NULL,
  capabilities  TEXT DEFAULT NULL,
  slash_commands TEXT DEFAULT NULL,
  departments   TEXT DEFAULT NULL,
  role_count    INTEGER DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (id)
);

-- ══════════════════════════════════════════════════
-- Module: Task Management
-- (migrations 004 + 012 payment columns)
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tasks (
  id                    TEXT NOT NULL,
  task_code             TEXT NOT NULL,
  title                 TEXT NOT NULL,
  description           TEXT DEFAULT NULL,
  category              TEXT DEFAULT NULL,
  priority              TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('critical','high','medium','low')),
  status                TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('draft','pending','in_progress','blocked','review','approved','completed','cancelled')),
  assigned_role_id      TEXT DEFAULT NULL,
  assigned_node_id      TEXT DEFAULT NULL,
  creator_node_id       TEXT DEFAULT NULL,
  assigned_by           TEXT DEFAULT NULL,
  deadline              TEXT DEFAULT NULL,
  depends_on            TEXT DEFAULT NULL,
  collaborators         TEXT DEFAULT NULL,
  deliverables          TEXT DEFAULT NULL,
  notes                 TEXT DEFAULT NULL,
  expense_amount        REAL DEFAULT NULL,
  expense_currency      TEXT DEFAULT NULL,
  expense_approved      INTEGER DEFAULT NULL,
  expense_approved_by   TEXT DEFAULT NULL,
  expense_approved_at   TEXT DEFAULT NULL,
  -- 012: payment tracking
  expense_paid          INTEGER DEFAULT NULL,
  expense_paid_by       TEXT DEFAULT NULL,
  expense_paid_at       TEXT DEFAULT NULL,
  result_summary        TEXT DEFAULT NULL,
  result_data           TEXT DEFAULT NULL,
  version               INTEGER NOT NULL DEFAULT 1,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at          TEXT DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE (task_code)
);

CREATE INDEX IF NOT EXISTS idx_tasks_status         ON tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority       ON tasks (priority);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_role  ON tasks (assigned_role_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_node  ON tasks (assigned_node_id);
CREATE INDEX IF NOT EXISTS idx_tasks_category       ON tasks (category);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline       ON tasks (deadline);
CREATE INDEX IF NOT EXISTS idx_tasks_expense_approved ON tasks (expense_approved);

CREATE TABLE IF NOT EXISTS task_progress_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id     TEXT NOT NULL,
  actor       TEXT NOT NULL,
  action      TEXT NOT NULL,
  from_status TEXT DEFAULT NULL,
  to_status   TEXT DEFAULT NULL,
  details     TEXT DEFAULT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_progress_log_task_id    ON task_progress_log (task_id);
CREATE INDEX IF NOT EXISTS idx_task_progress_log_created_at ON task_progress_log (created_at);

CREATE TABLE IF NOT EXISTS task_comments (
  id         TEXT NOT NULL,
  task_id    TEXT NOT NULL,
  author     TEXT NOT NULL,
  content    TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (id),
  FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments (task_id);

-- ══════════════════════════════════════════════════
-- Module: A2A Relay Queue
-- (migration 005)
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS a2a_relay_queue (
  id              TEXT NOT NULL,
  from_node_id    TEXT NOT NULL,
  to_node_id      TEXT NOT NULL,
  message_type    TEXT NOT NULL DEFAULT 'text',
  subject         TEXT DEFAULT NULL,
  payload         TEXT NOT NULL,
  priority        TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('critical','high','normal','low')),
  status          TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','delivered','acknowledged','expired','failed')),
  delivered_at    TEXT DEFAULT NULL,
  acknowledged_at TEXT DEFAULT NULL,
  expires_at      TEXT DEFAULT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_a2a_relay_queue_to_node   ON a2a_relay_queue (to_node_id, status);
CREATE INDEX IF NOT EXISTS idx_a2a_relay_queue_from_node ON a2a_relay_queue (from_node_id);
CREATE INDEX IF NOT EXISTS idx_a2a_relay_queue_status    ON a2a_relay_queue (status);
CREATE INDEX IF NOT EXISTS idx_a2a_relay_queue_created   ON a2a_relay_queue (created_at);
CREATE INDEX IF NOT EXISTS idx_a2a_relay_queue_expires   ON a2a_relay_queue (expires_at);

-- ══════════════════════════════════════════════════
-- Module: Agent Direct Messages
-- (migrations 017_agent_messages + 020_agent_messages)
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS agent_messages (
  id           TEXT NOT NULL,
  from_node_id TEXT NOT NULL,
  to_node_id   TEXT NOT NULL,
  message_type TEXT NOT NULL,
  subject      TEXT DEFAULT NULL,
  payload      TEXT DEFAULT NULL,
  read         INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_agent_msg_to      ON agent_messages (to_node_id);
CREATE INDEX IF NOT EXISTS idx_agent_msg_from    ON agent_messages (from_node_id);
CREATE INDEX IF NOT EXISTS idx_agent_msg_created ON agent_messages (created_at);

-- ══════════════════════════════════════════════════
-- Module: Async Message Queue
-- (migration 021)
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS message_queue (
  id            TEXT NOT NULL,
  from_node_id  TEXT NOT NULL,
  to_node_id    TEXT DEFAULT NULL,
  to_role_id    TEXT DEFAULT NULL,
  message_type  TEXT NOT NULL,
  subject       TEXT DEFAULT NULL,
  body          TEXT DEFAULT NULL,
  priority      TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('critical','high','normal','low')),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','delivered','read','failed','expired')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  delivered_at  TEXT DEFAULT NULL,
  read_at       TEXT DEFAULT NULL,
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_mq_to_node_status ON message_queue (to_node_id, status);
CREATE INDEX IF NOT EXISTS idx_mq_to_role_status  ON message_queue (to_role_id, status);
CREATE INDEX IF NOT EXISTS idx_mq_from_node       ON message_queue (from_node_id);
CREATE INDEX IF NOT EXISTS idx_mq_status          ON message_queue (status);
CREATE INDEX IF NOT EXISTS idx_mq_priority        ON message_queue (priority);
CREATE INDEX IF NOT EXISTS idx_mq_created_at      ON message_queue (created_at);

-- ══════════════════════════════════════════════════
-- Module: A2A Gateway — Agent Card Registry
-- (migration 008 + 022 node_id length widened to VARCHAR(128))
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS agent_cards (
  node_id      TEXT NOT NULL,
  agent_card   TEXT NOT NULL,
  skills       TEXT DEFAULT NULL,
  capabilities TEXT DEFAULT NULL,
  last_seen_at TEXT DEFAULT NULL,
  status       TEXT NOT NULL DEFAULT 'offline' CHECK(status IN ('online','offline','busy')),
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (node_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_cards_status    ON agent_cards (status);
CREATE INDEX IF NOT EXISTS idx_agent_cards_last_seen ON agent_cards (last_seen_at);

-- ══════════════════════════════════════════════════
-- Module: Meetings
-- (migration 009)
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS meeting_sessions (
  id                    TEXT NOT NULL,
  title                 TEXT NOT NULL,
  type                  TEXT NOT NULL DEFAULT 'discussion' CHECK(type IN ('discussion','review','brainstorm','decision')),
  status                TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','active','paused','concluded','cancelled')),
  initiator_type        TEXT NOT NULL DEFAULT 'human' CHECK(initiator_type IN ('human','agent')),
  initiation_reason     TEXT DEFAULT NULL,
  facilitator_node_id   TEXT NOT NULL,
  context_id            TEXT NOT NULL,
  shared_context        TEXT DEFAULT NULL,
  turn_policy           TEXT NOT NULL DEFAULT 'facilitator-directed',
  max_duration_minutes  INTEGER NOT NULL DEFAULT 60,
  agenda                TEXT DEFAULT NULL,
  decisions             TEXT DEFAULT NULL,
  action_items          TEXT DEFAULT NULL,
  summary               TEXT DEFAULT NULL,
  scheduled_at          TEXT DEFAULT NULL,
  started_at            TEXT DEFAULT NULL,
  ended_at              TEXT DEFAULT NULL,
  created_by            TEXT NOT NULL,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_meeting_sessions_status       ON meeting_sessions (status);
CREATE INDEX IF NOT EXISTS idx_meeting_sessions_scheduled    ON meeting_sessions (scheduled_at);
CREATE INDEX IF NOT EXISTS idx_meeting_sessions_initiator    ON meeting_sessions (initiator_type);
CREATE INDEX IF NOT EXISTS idx_meeting_sessions_context_id   ON meeting_sessions (context_id);
CREATE INDEX IF NOT EXISTS idx_meeting_sessions_created_at   ON meeting_sessions (created_at);

CREATE TABLE IF NOT EXISTS meeting_participants (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id   TEXT NOT NULL,
  node_id      TEXT NOT NULL,
  role_id      TEXT NOT NULL,
  display_name TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'invited' CHECK(status IN ('invited','joined','speaking','left')),
  invited_at   TEXT NOT NULL DEFAULT (datetime('now')),
  joined_at    TEXT DEFAULT NULL,
  left_at      TEXT DEFAULT NULL,
  UNIQUE (session_id, node_id),
  FOREIGN KEY (session_id) REFERENCES meeting_sessions (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_meeting_participants_session ON meeting_participants (session_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_node    ON meeting_participants (node_id);

CREATE TABLE IF NOT EXISTS meeting_transcript (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id        TEXT NOT NULL,
  speaker_node_id   TEXT NOT NULL,
  speaker_role      TEXT NOT NULL,
  content           TEXT NOT NULL,
  type              TEXT NOT NULL DEFAULT 'statement' CHECK(type IN ('statement','question','answer','proposal','objection','agreement','system')),
  reply_to_id       INTEGER DEFAULT NULL,
  agenda_item_index INTEGER DEFAULT NULL,
  metadata          TEXT DEFAULT NULL,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES meeting_sessions (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_meeting_transcript_session_time ON meeting_transcript (session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_meeting_transcript_speaker      ON meeting_transcript (speaker_node_id);

CREATE TABLE IF NOT EXISTS meeting_auto_triggers (
  id                 TEXT NOT NULL,
  name               TEXT NOT NULL,
  description        TEXT DEFAULT NULL,
  event              TEXT NOT NULL,
  enabled            INTEGER NOT NULL DEFAULT 1,
  facilitator_role   TEXT NOT NULL,
  meeting_template   TEXT NOT NULL,
  last_triggered_at  TEXT DEFAULT NULL,
  trigger_count      INTEGER NOT NULL DEFAULT 0,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_meeting_auto_triggers_event   ON meeting_auto_triggers (event);
CREATE INDEX IF NOT EXISTS idx_meeting_auto_triggers_enabled ON meeting_auto_triggers (enabled);

-- ══════════════════════════════════════════════════
-- Module: Company Strategy
-- (migrations 007 + 015 company profile columns)
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS company_strategy (
  id                     TEXT NOT NULL,
  -- 015: company profile fields
  company_name           TEXT DEFAULT NULL,
  industry               TEXT DEFAULT NULL,
  employee_count         INTEGER DEFAULT NULL,
  annual_revenue_target  TEXT DEFAULT NULL,
  fiscal_year_start      TEXT DEFAULT NULL,
  fiscal_year_end        TEXT DEFAULT NULL,
  currency               TEXT DEFAULT 'JPY',
  language               TEXT DEFAULT 'ja',
  timezone               TEXT DEFAULT 'Asia/Tokyo',
  -- strategy content
  company_mission        TEXT DEFAULT NULL,
  company_vision         TEXT DEFAULT NULL,
  company_values         TEXT DEFAULT NULL,
  short_term_objectives  TEXT DEFAULT NULL,
  mid_term_objectives    TEXT DEFAULT NULL,
  long_term_objectives   TEXT DEFAULT NULL,
  department_budgets     TEXT DEFAULT NULL,
  department_kpis        TEXT DEFAULT NULL,
  strategic_priorities   TEXT DEFAULT NULL,
  revision               INTEGER NOT NULL DEFAULT 1,
  updated_by             TEXT DEFAULT NULL,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS company_strategy_history (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  strategy_id     TEXT NOT NULL,
  revision        INTEGER NOT NULL,
  snapshot        TEXT NOT NULL,
  changed_by      TEXT DEFAULT NULL,
  change_summary  TEXT DEFAULT NULL,
  changed_fields  TEXT DEFAULT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (strategy_id) REFERENCES company_strategy (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_strategy_history_strategy_id ON company_strategy_history (strategy_id);
CREATE INDEX IF NOT EXISTS idx_strategy_history_revision    ON company_strategy_history (revision);

-- ══════════════════════════════════════════════════
-- Module: ClawHub+ (Skill Marketplace)
-- (migration 001)
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS skills (
  id              TEXT NOT NULL,
  slug            TEXT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT DEFAULT NULL,
  author_id       TEXT DEFAULT NULL,
  category        TEXT DEFAULT NULL,
  latest_version  TEXT DEFAULT NULL,
  download_count  INTEGER NOT NULL DEFAULT 0,
  rating_avg      REAL NOT NULL DEFAULT 0,
  rating_count    INTEGER NOT NULL DEFAULT 0,
  tags            TEXT DEFAULT NULL,
  is_official     INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'active',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (id),
  UNIQUE (slug),
  FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_skills_author_id     ON skills (author_id);
CREATE INDEX IF NOT EXISTS idx_skills_category      ON skills (category);
CREATE INDEX IF NOT EXISTS idx_skills_download_count ON skills (download_count);
CREATE INDEX IF NOT EXISTS idx_skills_status        ON skills (status);

CREATE TABLE IF NOT EXISTS skill_versions (
  id                    TEXT NOT NULL,
  skill_id              TEXT NOT NULL,
  version               TEXT NOT NULL,
  changelog             TEXT DEFAULT NULL,
  tarball_url           TEXT NOT NULL,
  checksum_sha256       TEXT NOT NULL,
  tarball_size          INTEGER NOT NULL DEFAULT 0,
  min_winclaw_version   TEXT DEFAULT NULL,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (id),
  UNIQUE (skill_id, version),
  FOREIGN KEY (skill_id) REFERENCES skills (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_skill_versions_skill_id ON skill_versions (skill_id);

CREATE TABLE IF NOT EXISTS skill_ratings (
  id         TEXT NOT NULL,
  skill_id   TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  rating     INTEGER NOT NULL,
  review     TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (id),
  UNIQUE (skill_id, user_id),
  FOREIGN KEY (skill_id) REFERENCES skills (id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)  REFERENCES users (id)  ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_skill_ratings_skill_id ON skill_ratings (skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_ratings_user_id  ON skill_ratings (user_id);

CREATE TABLE IF NOT EXISTS skill_downloads (
  id           TEXT NOT NULL,
  skill_id     TEXT NOT NULL,
  version      TEXT DEFAULT NULL,
  node_id      TEXT DEFAULT NULL,
  user_id      TEXT DEFAULT NULL,
  ip_hash      TEXT DEFAULT NULL,
  downloaded_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (id),
  FOREIGN KEY (skill_id) REFERENCES skills (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_skill_downloads_skill_id     ON skill_downloads (skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_downloads_downloaded_at ON skill_downloads (downloaded_at);
CREATE INDEX IF NOT EXISTS idx_skill_downloads_node_id      ON skill_downloads (node_id);

-- ══════════════════════════════════════════════════
-- Module: Evolution Pool
-- (migration 001)
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS genes (
  id               TEXT NOT NULL,
  asset_id         TEXT NOT NULL,
  node_id          TEXT DEFAULT NULL,
  user_id          TEXT DEFAULT NULL,
  category         TEXT DEFAULT NULL,
  signals_match    TEXT DEFAULT NULL,
  strategy         TEXT DEFAULT NULL,
  constraints_data TEXT DEFAULT NULL,
  validation       TEXT DEFAULT NULL,
  status           TEXT NOT NULL DEFAULT 'pending',
  use_count        INTEGER NOT NULL DEFAULT 0,
  success_rate     REAL NOT NULL DEFAULT 0,
  fail_count       INTEGER NOT NULL DEFAULT 0,
  signature        TEXT DEFAULT NULL,
  chain_id         TEXT DEFAULT NULL,
  content_hash     TEXT DEFAULT NULL,
  schema_version   INTEGER NOT NULL DEFAULT 1,
  safety_score     REAL DEFAULT NULL,
  promoted_at      TEXT DEFAULT NULL,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (id),
  UNIQUE (asset_id),
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_genes_node_id      ON genes (node_id);
CREATE INDEX IF NOT EXISTS idx_genes_user_id      ON genes (user_id);
CREATE INDEX IF NOT EXISTS idx_genes_status       ON genes (status);
CREATE INDEX IF NOT EXISTS idx_genes_category     ON genes (category);
CREATE INDEX IF NOT EXISTS idx_genes_use_count    ON genes (use_count);
CREATE INDEX IF NOT EXISTS idx_genes_success_rate ON genes (success_rate);
CREATE INDEX IF NOT EXISTS idx_genes_content_hash ON genes (content_hash);

CREATE TABLE IF NOT EXISTS capsules (
  id              TEXT NOT NULL,
  asset_id        TEXT NOT NULL,
  gene_asset_id   TEXT DEFAULT NULL,
  node_id         TEXT DEFAULT NULL,
  user_id         TEXT DEFAULT NULL,
  trigger_data    TEXT DEFAULT NULL,
  summary         TEXT DEFAULT NULL,
  confidence      REAL DEFAULT NULL,
  success_rate    REAL NOT NULL DEFAULT 0,
  success_streak  INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending',
  use_count       INTEGER NOT NULL DEFAULT 0,
  signature       TEXT DEFAULT NULL,
  chain_id        TEXT DEFAULT NULL,
  content_hash    TEXT DEFAULT NULL,
  schema_version  INTEGER NOT NULL DEFAULT 1,
  safety_score    REAL DEFAULT NULL,
  promoted_at     TEXT DEFAULT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (id),
  UNIQUE (asset_id),
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_capsules_gene_asset_id ON capsules (gene_asset_id);
CREATE INDEX IF NOT EXISTS idx_capsules_node_id       ON capsules (node_id);
CREATE INDEX IF NOT EXISTS idx_capsules_user_id       ON capsules (user_id);
CREATE INDEX IF NOT EXISTS idx_capsules_status        ON capsules (status);
CREATE INDEX IF NOT EXISTS idx_capsules_content_hash  ON capsules (content_hash);

CREATE TABLE IF NOT EXISTS asset_reports (
  id                TEXT NOT NULL,
  asset_id          TEXT NOT NULL,
  asset_type        TEXT NOT NULL,
  reporter_node_id  TEXT DEFAULT NULL,
  reporter_user_id  TEXT DEFAULT NULL,
  report_type       TEXT NOT NULL,
  details           TEXT DEFAULT NULL,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_asset_reports_asset_id      ON asset_reports (asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_reports_report_type   ON asset_reports (report_type);
CREATE INDEX IF NOT EXISTS idx_asset_reports_reporter_node ON asset_reports (reporter_node_id);

CREATE TABLE IF NOT EXISTS asset_votes (
  id            TEXT NOT NULL,
  asset_id      TEXT NOT NULL,
  asset_type    TEXT NOT NULL CHECK(asset_type IN ('gene','capsule')),
  voter_node_id TEXT NOT NULL,
  vote          TEXT NOT NULL CHECK(vote IN ('upvote','downvote')),
  reason        TEXT DEFAULT NULL,
  created_at    TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (id),
  UNIQUE (asset_id, voter_node_id)
);

CREATE INDEX IF NOT EXISTS idx_asset_votes_asset_id ON asset_votes (asset_id);

CREATE TABLE IF NOT EXISTS evolution_events (
  id          TEXT NOT NULL,
  event_type  TEXT NOT NULL,
  asset_id    TEXT DEFAULT NULL,
  asset_type  TEXT DEFAULT NULL,
  node_id     TEXT DEFAULT NULL,
  user_id     TEXT DEFAULT NULL,
  details     TEXT DEFAULT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_evolution_events_event_type ON evolution_events (event_type);
CREATE INDEX IF NOT EXISTS idx_evolution_events_asset_id   ON evolution_events (asset_id);
CREATE INDEX IF NOT EXISTS idx_evolution_events_node_id    ON evolution_events (node_id);
CREATE INDEX IF NOT EXISTS idx_evolution_events_created_at ON evolution_events (created_at);

-- ══════════════════════════════════════════════════
-- Module: Update Gateway
-- (migration 001)
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS client_releases (
  id                    TEXT NOT NULL,
  version               TEXT NOT NULL,
  channel               TEXT NOT NULL DEFAULT 'stable',
  platform              TEXT NOT NULL,
  download_url          TEXT NOT NULL,
  checksum_sha256       TEXT DEFAULT NULL,
  size_bytes            INTEGER NOT NULL DEFAULT 0,
  changelog             TEXT DEFAULT NULL,
  min_upgrade_version   TEXT DEFAULT NULL,
  is_critical           INTEGER NOT NULL DEFAULT 0,
  published_at          TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (id),
  UNIQUE (version, platform, channel)
);

CREATE INDEX IF NOT EXISTS idx_client_releases_channel      ON client_releases (channel);
CREATE INDEX IF NOT EXISTS idx_client_releases_platform     ON client_releases (platform);
CREATE INDEX IF NOT EXISTS idx_client_releases_published_at ON client_releases (published_at);

CREATE TABLE IF NOT EXISTS update_reports (
  id             TEXT NOT NULL,
  node_id        TEXT DEFAULT NULL,
  from_version   TEXT DEFAULT NULL,
  to_version     TEXT DEFAULT NULL,
  platform       TEXT DEFAULT NULL,
  status         TEXT NOT NULL DEFAULT 'success',
  error_message  TEXT DEFAULT NULL,
  duration_ms    INTEGER DEFAULT NULL,
  reported_at    TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_update_reports_node_id     ON update_reports (node_id);
CREATE INDEX IF NOT EXISTS idx_update_reports_status      ON update_reports (status);
CREATE INDEX IF NOT EXISTS idx_update_reports_to_version  ON update_reports (to_version);
CREATE INDEX IF NOT EXISTS idx_update_reports_reported_at ON update_reports (reported_at);

-- ══════════════════════════════════════════════════
-- Module: Telemetry
-- (migration 001)
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS telemetry_reports (
  id               TEXT NOT NULL,
  node_id          TEXT NOT NULL,
  anonymous_id     TEXT DEFAULT NULL,
  report_date      TEXT NOT NULL,
  skill_calls      TEXT DEFAULT NULL,
  gene_usage       TEXT DEFAULT NULL,
  capsule_usage    TEXT DEFAULT NULL,
  platform         TEXT DEFAULT NULL,
  winclaw_version  TEXT DEFAULT NULL,
  session_count    INTEGER NOT NULL DEFAULT 0,
  active_minutes   INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (id),
  UNIQUE (node_id, report_date)
);

CREATE INDEX IF NOT EXISTS idx_telemetry_reports_report_date     ON telemetry_reports (report_date);
CREATE INDEX IF NOT EXISTS idx_telemetry_reports_winclaw_version ON telemetry_reports (winclaw_version);

-- ══════════════════════════════════════════════════
-- Module: Community
-- (migration 001 + 017 task-updates channel)
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS community_channels (
  id               TEXT NOT NULL,
  name             TEXT NOT NULL,
  display_name     TEXT NOT NULL,
  description      TEXT DEFAULT NULL,
  creator_node_id  TEXT DEFAULT NULL,
  is_system        INTEGER NOT NULL DEFAULT 0,
  subscriber_count INTEGER NOT NULL DEFAULT 0,
  post_count       INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (id),
  UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS community_topics (
  id              TEXT NOT NULL,
  author_id       TEXT NOT NULL,
  channel_id      TEXT DEFAULT NULL,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  post_type       TEXT NOT NULL DEFAULT 'discussion',
  category        TEXT DEFAULT NULL,
  tags            TEXT DEFAULT NULL,
  context_data    TEXT DEFAULT NULL,
  code_snippets   TEXT DEFAULT NULL,
  related_assets  TEXT DEFAULT NULL,
  view_count      INTEGER NOT NULL DEFAULT 0,
  reply_count     INTEGER NOT NULL DEFAULT 0,
  score           REAL NOT NULL DEFAULT 0,
  upvotes         INTEGER NOT NULL DEFAULT 0,
  downvotes       INTEGER NOT NULL DEFAULT 0,
  is_pinned       INTEGER NOT NULL DEFAULT 0,
  is_locked       INTEGER NOT NULL DEFAULT 0,
  is_distilled    INTEGER NOT NULL DEFAULT 0,
  last_reply_at   TEXT DEFAULT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (id),
  FOREIGN KEY (channel_id) REFERENCES community_channels (id)
);

CREATE INDEX IF NOT EXISTS idx_community_topics_author      ON community_topics (author_id);
CREATE INDEX IF NOT EXISTS idx_community_topics_category    ON community_topics (category);
CREATE INDEX IF NOT EXISTS idx_community_topics_channel     ON community_topics (channel_id);
CREATE INDEX IF NOT EXISTS idx_community_topics_created_at  ON community_topics (created_at);
CREATE INDEX IF NOT EXISTS idx_community_topics_last_reply  ON community_topics (last_reply_at);

CREATE TABLE IF NOT EXISTS community_replies (
  id          TEXT NOT NULL,
  topic_id    TEXT NOT NULL,
  author_id   TEXT NOT NULL,
  body        TEXT NOT NULL,
  is_solution INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (id),
  FOREIGN KEY (topic_id) REFERENCES community_topics (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_community_replies_topic_id   ON community_replies (topic_id);
CREATE INDEX IF NOT EXISTS idx_community_replies_author_node ON community_replies (author_id);

CREATE TABLE IF NOT EXISTS community_votes (
  id          TEXT NOT NULL,
  node_id     TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id   TEXT NOT NULL,
  direction   INTEGER NOT NULL,
  weight      REAL NOT NULL DEFAULT 1.0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (id),
  UNIQUE (node_id, target_type, target_id)
);

CREATE TABLE IF NOT EXISTS community_subscriptions (
  id            TEXT NOT NULL,
  node_id       TEXT NOT NULL,
  channel_id    TEXT NOT NULL,
  subscribed_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (id),
  UNIQUE (node_id, channel_id),
  FOREIGN KEY (channel_id) REFERENCES community_channels (id)
);

CREATE TABLE IF NOT EXISTS community_follows (
  id                 TEXT NOT NULL,
  follower_node_id   TEXT NOT NULL,
  following_node_id  TEXT NOT NULL,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (id),
  UNIQUE (follower_node_id, following_node_id)
);

-- ══════════════════════════════════════════════════
-- Module: Platform
-- (migration 001)
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS platform_values (
  id           TEXT NOT NULL,
  content      TEXT NOT NULL DEFAULT '',
  content_hash TEXT NOT NULL DEFAULT '',
  updated_by   TEXT DEFAULT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (id)
);

-- ══════════════════════════════════════════════════
-- Module: Marketing — Campaigns
-- (migration 025)
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS campaigns (
  id               TEXT NOT NULL,
  title            TEXT NOT NULL,
  description      TEXT DEFAULT NULL,
  start_date       TEXT NOT NULL,
  end_date         TEXT DEFAULT NULL,
  campaign_status  TEXT NOT NULL DEFAULT 'draft' CHECK(campaign_status IN ('draft','planned','active','completed','cancelled')),
  owner_id         TEXT DEFAULT NULL,
  owner_role       TEXT DEFAULT NULL,
  channel          TEXT DEFAULT NULL,
  budget           REAL DEFAULT NULL,
  kpi_target       TEXT DEFAULT NULL,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_campaigns_status     ON campaigns (campaign_status);
CREATE INDEX IF NOT EXISTS idx_campaigns_start_date ON campaigns (start_date);
CREATE INDEX IF NOT EXISTS idx_campaigns_owner      ON campaigns (owner_id);

-- ══════════════════════════════════════════════════
-- Module: Sales Pipeline
-- (migration 026)
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sales_pipeline (
  id                   TEXT NOT NULL,
  company_name         TEXT NOT NULL,
  contact_name         TEXT DEFAULT NULL,
  deal_title           TEXT NOT NULL,
  pipeline_stage       TEXT NOT NULL DEFAULT 'lead' CHECK(pipeline_stage IN ('lead','qualified','proposal','negotiation','closed_won','closed_lost')),
  deal_value           REAL DEFAULT NULL,
  currency             TEXT DEFAULT 'JPY',
  probability          INTEGER DEFAULT 0,
  expected_close_date  TEXT DEFAULT NULL,
  owner_id             TEXT DEFAULT NULL,
  owner_role           TEXT DEFAULT NULL,
  notes                TEXT DEFAULT NULL,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_sales_pipeline_stage      ON sales_pipeline (pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_sales_pipeline_owner      ON sales_pipeline (owner_id);
CREATE INDEX IF NOT EXISTS idx_sales_pipeline_close_date ON sales_pipeline (expected_close_date);

-- ══════════════════════════════════════════════════
-- Module: Roadmap
-- (migration 027)
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS roadmap_items (
  id               TEXT NOT NULL,
  title            TEXT NOT NULL,
  description      TEXT DEFAULT NULL,
  roadmap_phase    TEXT DEFAULT 'later' CHECK(roadmap_phase IN ('now','next','later','done')),
  roadmap_priority TEXT DEFAULT 'should' CHECK(roadmap_priority IN ('must','should','could','wont')),
  category         TEXT DEFAULT NULL,
  start_date       TEXT DEFAULT NULL,
  end_date         TEXT DEFAULT NULL,
  progress         INTEGER DEFAULT 0,
  owner_id         TEXT DEFAULT NULL,
  owner_role       TEXT DEFAULT NULL,
  linked_task_ids  TEXT DEFAULT NULL,
  created_at       TEXT DEFAULT (datetime('now')),
  updated_at       TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_roadmap_phase    ON roadmap_items (roadmap_phase);
CREATE INDEX IF NOT EXISTS idx_roadmap_priority ON roadmap_items (roadmap_priority);
CREATE INDEX IF NOT EXISTS idx_roadmap_category ON roadmap_items (category);

-- ══════════════════════════════════════════════════
-- Module: KPIs
-- (migration 028)
-- ══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS kpi_definitions (
  id            TEXT NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT DEFAULT NULL,
  category      TEXT DEFAULT NULL,
  unit          TEXT DEFAULT NULL,
  target_value  REAL DEFAULT NULL,
  kpi_period    TEXT DEFAULT 'monthly' CHECK(kpi_period IN ('daily','weekly','monthly','quarterly','yearly')),
  owner_role    TEXT DEFAULT NULL,
  created_at    TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS kpi_records (
  id          TEXT NOT NULL,
  kpi_id      TEXT NOT NULL,
  value       REAL NOT NULL,
  recorded_at TEXT DEFAULT (datetime('now')),
  recorded_by TEXT DEFAULT NULL,
  notes       TEXT DEFAULT NULL,
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_kpi_records_kpi_id      ON kpi_records (kpi_id);
CREATE INDEX IF NOT EXISTS idx_kpi_records_recorded_at ON kpi_records (recorded_at);

-- ══════════════════════════════════════════════════
-- Default Data: Community Channels
-- (migrations 001 + 017_community_task_updates_channel)
-- ══════════════════════════════════════════════════

INSERT OR IGNORE INTO community_channels (id, name, display_name, description, is_system) VALUES
  (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))), 'evolution-showcase', 'Evolution Showcase', 'Share your successful evolution results', 1),
  (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))), 'problem-solving', 'Problem Solving', 'Discuss problems and collaborate on solutions', 1),
  (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))), 'skill-exchange', 'Skill Exchange', 'Share and discover useful skills', 1),
  (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))), 'bug-reports', 'Bug Reports', 'Report bugs and track fixes', 1),
  (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))), 'announcements', 'Announcements', 'Official announcements from the GRC team', 1),
  (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))), 'task-updates', 'Task Updates', 'Automatic posts when tasks are completed', 1);
