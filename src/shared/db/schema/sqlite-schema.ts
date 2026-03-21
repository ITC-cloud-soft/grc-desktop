/**
 * Unified SQLite Schema — Auto-generated equivalent of MySQL module schemas
 *
 * Source of truth: individual module schema.ts files
 * Generated mapping: MySQL (drizzle-orm/mysql-core) -> SQLite (drizzle-orm/sqlite-core)
 *
 * Mapping rules applied:
 *   mysqlTable        -> sqliteTable
 *   varchar / char    -> text
 *   int / tinyint     -> integer
 *   bigint / serial   -> integer (autoIncrement where needed)
 *   float / decimal   -> real
 *   datetime / timestamp -> text (ISO 8601 strings)
 *   json              -> text({ mode: "json" })
 *   boolean           -> integer({ mode: "boolean" })
 *   mysqlEnum         -> text (enforce via CHECK in migration SQL)
 *   mediumtext / text -> text
 *   date              -> text
 *   DEFAULT (UUID())  -> omitted (generate in app layer)
 *   DEFAULT CURRENT_TIMESTAMP -> sql`(datetime('now'))`
 *   ON UPDATE CURRENT_TIMESTAMP / .onUpdateNow() -> omitted (handle in app layer)
 */

import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ═══════════════════════════════════════════════════════════════
// Auth Module (src/modules/auth/schema.ts)
// ═══════════════════════════════════════════════════════════════

// ── Users Table ─────────────────────────────────

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey().notNull(),
    provider: text("provider").notNull(),
    providerId: text("provider_id").notNull(),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    email: text("email"),
    passwordHash: text("password_hash"),
    tier: text("tier").notNull().default("free"),
    role: text("role").notNull().default("user"),
    promotedAssetCount: integer("promoted_asset_count").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    // MySQL equivalent: updatedAt had .onUpdateNow() — handle in app layer
  },
  (table) => [
    uniqueIndex("uk_provider").on(table.provider, table.providerId),
    index("idx_tier").on(table.tier),
    index("idx_email").on(table.email),
  ],
);

// ── API Keys Table ──────────────────────────────

export const apiKeys = sqliteTable(
  "api_keys",
  {
    id: text("id").primaryKey().notNull(),
    userId: text("user_id").notNull(),
    keyHash: text("key_hash").notNull(),
    keyPrefix: text("key_prefix").notNull(),
    name: text("name").notNull(),
    scopes: text("scopes", { mode: "json" }).notNull().$type<string[]>(),
    lastUsedAt: text("last_used_at"),
    expiresAt: text("expires_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex("uk_key_hash").on(table.keyHash),
    index("idx_key_prefix").on(table.keyPrefix),
    index("idx_apikeys_user_id").on(table.userId),
  ],
);

// ── Refresh Tokens Table ────────────────────────

export const refreshTokens = sqliteTable(
  "refresh_tokens",
  {
    id: text("id").primaryKey().notNull(),
    userId: text("user_id").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: text("expires_at").notNull(),
    revokedAt: text("revoked_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex("uk_token_hash").on(table.tokenHash),
    index("idx_rt_user_id").on(table.userId),
    index("idx_rt_expires_at").on(table.expiresAt),
  ],
);

// ── Verification Codes Table ──────────────────

export const verificationCodes = sqliteTable(
  "verification_codes",
  {
    id: text("id").primaryKey().notNull(),
    // MySQL equivalent: $defaultFn(() => crypto.randomUUID()) — handle in app layer
    email: text("email").notNull(),
    code: text("code").notNull(),
    expiresAt: text("expires_at").notNull(),
    // MySQL equivalent: datetimeUtc
    usedAt: text("used_at"),
    attempts: integer("attempts").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index("idx_vc_email_code").on(table.email, table.code),
    index("idx_vc_expires").on(table.expiresAt),
  ],
);

// ═══════════════════════════════════════════════════════════════
// Evolution Module (src/modules/evolution/schema.ts)
// ═══════════════════════════════════════════════════════════════

// ── Nodes ────────────────────────────────────────

export const nodesTable = sqliteTable(
  "nodes",
  {
    id: text("id").primaryKey().notNull(),
    nodeId: text("node_id").notNull(),
    userId: text("user_id"),
    displayName: text("display_name"),
    platform: text("platform"),
    winclawVersion: text("winclaw_version"),
    lastHeartbeat: text("last_heartbeat"),
    capabilities: text("capabilities", { mode: "json" }),
    geneCount: integer("gene_count").notNull().default(0),
    capsuleCount: integer("capsule_count").notNull().default(0),
    envFingerprint: text("env_fingerprint"),
    employeeId: text("employee_id"),
    employeeName: text("employee_name"),
    employeeEmail: text("employee_email"),
    // ── Role assignment fields ──
    roleId: text("role_id"),
    roleMode: text("role_mode"),
    // MySQL equivalent: mysqlEnum("role_mode", ["autonomous", "copilot"])
    configRevision: integer("config_revision").notNull().default(0),
    configAppliedRevision: integer("config_applied_revision").notNull().default(0),
    assignmentVariables: text("assignment_variables", { mode: "json" }),
    configOverrides: text("config_overrides", { mode: "json" }),
    resolvedAgentsMd: text("resolved_agents_md"),
    // MySQL equivalent: mediumtext
    resolvedSoulMd: text("resolved_soul_md"),
    resolvedIdentityMd: text("resolved_identity_md"),
    resolvedUserMd: text("resolved_user_md"),
    resolvedToolsMd: text("resolved_tools_md"),
    resolvedHeartbeatMd: text("resolved_heartbeat_md"),
    resolvedBootstrapMd: text("resolved_bootstrap_md"),
    resolvedTasksMd: text("resolved_tasks_md"),
    // ── Key assignment fields ──
    primaryKeyId: text("primary_key_id"),
    auxiliaryKeyId: text("auxiliary_key_id"),
    keyConfigJson: text("key_config_json", { mode: "json" }),
    // ── Node provisioning fields ──
    provisioningMode: text("provisioning_mode"),
    // MySQL equivalent: mysqlEnum("provisioning_mode", ["local_docker", "daytona_sandbox"])
    containerId: text("container_id"),
    sandboxId: text("sandbox_id"),
    gatewayUrl: text("gateway_url"),
    gatewayPort: integer("gateway_port"),
    workspacePath: text("workspace_path"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    // MySQL equivalent: updatedAt had .onUpdateNow() — handle in app layer
  },
  (table) => [
    uniqueIndex("uk_node_id").on(table.nodeId),
    index("idx_nodes_user_id").on(table.userId),
    index("idx_last_heartbeat").on(table.lastHeartbeat),
    index("idx_role_id").on(table.roleId),
    index("idx_config_revision").on(table.configRevision),
  ],
);

// ── Genes ────────────────────────────────────────

export const genesTable = sqliteTable(
  "genes",
  {
    id: text("id").primaryKey().notNull(),
    assetId: text("asset_id").notNull(),
    nodeId: text("node_id"),
    userId: text("user_id"),
    category: text("category"),
    signalsMatch: text("signals_match", { mode: "json" }),
    strategy: text("strategy", { mode: "json" }),
    constraintsData: text("constraints_data", { mode: "json" }),
    validation: text("validation", { mode: "json" }),
    contentHash: text("content_hash"),
    signature: text("signature"),
    status: text("status").notNull().default("pending"),
    useCount: integer("use_count").notNull().default(0),
    failCount: integer("fail_count").notNull().default(0),
    successRate: real("success_rate").notNull().default(0),
    // MySQL equivalent: float
    chainId: text("chain_id"),
    schemaVersion: integer("schema_version").notNull().default(1),
    safetyScore: real("safety_score"),
    // MySQL equivalent: float
    promotedAt: text("promoted_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex("uk_asset_id").on(table.assetId),
    index("idx_genes_status").on(table.status),
    index("idx_genes_node_id").on(table.nodeId),
    index("idx_use_count").on(table.useCount),
  ],
);

// ── Capsules ─────────────────────────────────────

export const capsulesTable = sqliteTable(
  "capsules",
  {
    id: text("id").primaryKey().notNull(),
    assetId: text("asset_id").notNull(),
    geneAssetId: text("gene_asset_id"),
    nodeId: text("node_id"),
    userId: text("user_id"),
    contentHash: text("content_hash"),
    triggerData: text("trigger_data", { mode: "json" }),
    summary: text("summary"),
    signature: text("signature"),
    status: text("status").notNull().default("pending"),
    useCount: integer("use_count").notNull().default(0),
    confidence: real("confidence"),
    // MySQL equivalent: float
    successStreak: integer("success_streak").notNull().default(0),
    successRate: real("success_rate").notNull().default(0),
    chainId: text("chain_id"),
    schemaVersion: integer("schema_version").notNull().default(1),
    safetyScore: real("safety_score"),
    promotedAt: text("promoted_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex("capsules_uk_asset_id").on(table.assetId),
    index("capsules_idx_status").on(table.status),
    index("capsules_idx_node_id").on(table.nodeId),
  ],
);

// ── Asset Reports ────────────────────────────────

export const assetReportsTable = sqliteTable(
  "asset_reports",
  {
    id: text("id").primaryKey().notNull(),
    assetId: text("asset_id").notNull(),
    assetType: text("asset_type").notNull(),
    reporterNodeId: text("reporter_node_id").notNull(),
    reporterUserId: text("reporter_user_id"),
    reportType: text("report_type").notNull(),
    details: text("details", { mode: "json" }),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index("idx_ar_asset_id").on(table.assetId),
    index("idx_reporter").on(table.reporterNodeId),
  ],
);

// ── Evolution Events ─────────────────────────────

export const evolutionEventsTable = sqliteTable(
  "evolution_events",
  {
    id: text("id").primaryKey().notNull(),
    eventType: text("event_type").notNull(),
    assetId: text("asset_id"),
    assetType: text("asset_type"),
    nodeId: text("node_id"),
    userId: text("user_id"),
    details: text("details", { mode: "json" }),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index("events_idx_asset_id").on(table.assetId),
    index("idx_event_type").on(table.eventType),
    index("events_idx_created_at").on(table.createdAt),
  ],
);

// ── Asset Votes ─────────────────────────────────

export const assetVotesTable = sqliteTable(
  "asset_votes",
  {
    id: text("id").primaryKey(),
    assetId: text("asset_id").notNull(),
    assetType: text("asset_type").notNull(),
    // MySQL equivalent: mysqlEnum("asset_type", ["gene", "capsule"])
    voterNodeId: text("voter_node_id").notNull(),
    vote: text("vote").notNull(),
    // MySQL equivalent: mysqlEnum("vote", ["upvote", "downvote"])
    reason: text("reason"),
    createdAt: text("created_at").default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex("uk_asset_voter").on(table.assetId, table.voterNodeId),
    index("idx_av_asset_id").on(table.assetId),
  ],
);

// ═══════════════════════════════════════════════════════════════
// Roles Module (src/modules/roles/schema.ts)
// ═══════════════════════════════════════════════════════════════

// ── Role Templates ──────────────────────────────

export const roleTemplatesTable = sqliteTable(
  "role_templates",
  {
    id: text("id").primaryKey().notNull(),
    name: text("name").notNull(),
    emoji: text("emoji"),
    description: text("description"),
    department: text("department"),
    industry: text("industry"),
    mode: text("mode").notNull().default("autonomous"),
    // MySQL equivalent: mysqlEnum("mode", ["autonomous", "copilot"])
    isBuiltin: integer("is_builtin").notNull().default(0),
    // MySQL equivalent: tinyint
    agentsMd: text("agents_md").notNull(),
    // MySQL equivalent: mediumtext
    soulMd: text("soul_md").notNull(),
    identityMd: text("identity_md").notNull(),
    userMd: text("user_md").notNull(),
    toolsMd: text("tools_md").notNull(),
    heartbeatMd: text("heartbeat_md").notNull(),
    bootstrapMd: text("bootstrap_md").notNull(),
    tasksMd: text("tasks_md").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index("idx_department").on(table.department),
    index("idx_industry").on(table.industry),
    index("idx_mode").on(table.mode),
    index("idx_is_builtin").on(table.isBuiltin),
  ],
);

// ── Skill Catalog ───────────────────────────────

export const skillCatalogTable = sqliteTable("skill_catalog", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  pluginName: text("plugin_name").notNull(),
  tier: text("tier").notNull(),
  // MySQL equivalent: mysqlEnum("tier", ["P0", "P1", "P2", "P3"])
  description: text("description"),
  capabilities: text("capabilities"),
  // MySQL: text (JSON array of capability strings)
  slashCommands: text("slash_commands"),
  // MySQL: text (JSON array of command strings)
  departments: text("departments"),
  // MySQL: text (JSON array of department names)
  roleCount: integer("role_count").default(0),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ═══════════════════════════════════════════════════════════════
// Roles Module — Job Descriptions (src/modules/roles/job-descriptions-schema.ts)
// ═══════════════════════════════════════════════════════════════

// ── Role Job Descriptions ──────────────────────────

export const roleJobDescriptionsTable = sqliteTable(
  "role_job_descriptions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    // MySQL equivalent: int().autoincrement().primaryKey()
    roleId: text("role_id").notNull().unique(),
    displayName: text("display_name").notNull(),
    summary: text("summary").notNull(),
    responsibilities: text("responsibilities").notNull(),
    expertise: text("expertise", { mode: "json" }),
    // MySQL: json("expertise") — string[]
    reportsTo: text("reports_to"),
    collaboration: text("collaboration", { mode: "json" }),
    // MySQL: json("collaboration") — Record<string, string>
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
);

// ═══════════════════════════════════════════════════════════════
// Tasks Module (src/modules/tasks/schema.ts)
// ═══════════════════════════════════════════════════════════════

// ── Tasks ────────────────────────────────────────

export const tasksTable = sqliteTable(
  "tasks",
  {
    id: text("id").primaryKey().notNull(),
    taskCode: text("task_code").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    category: text("category"),
    priority: text("priority").notNull().default("medium"),
    // MySQL equivalent: mysqlEnum("priority", ["critical","high","medium","low"])
    status: text("status").notNull().default("pending"),
    // MySQL equivalent: mysqlEnum("status", ["draft","pending","in_progress","blocked","review","approved","completed","cancelled"])
    assignedRoleId: text("assigned_role_id"),
    assignedNodeId: text("assigned_node_id"),
    creatorNodeId: text("creator_node_id"),
    assignedBy: text("assigned_by"),
    deadline: text("deadline"),
    dependsOn: text("depends_on", { mode: "json" }),
    collaborators: text("collaborators", { mode: "json" }),
    deliverables: text("deliverables", { mode: "json" }),
    notes: text("notes"),
    expenseAmount: real("expense_amount"),
    // MySQL equivalent: decimal(15, 2)
    expenseCurrency: text("expense_currency"),
    expenseApproved: integer("expense_approved"),
    // MySQL equivalent: tinyint
    expenseApprovedBy: text("expense_approved_by"),
    expenseApprovedAt: text("expense_approved_at"),
    expensePaid: integer("expense_paid"),
    // MySQL equivalent: tinyint
    expensePaidBy: text("expense_paid_by"),
    expensePaidAt: text("expense_paid_at"),
    resultSummary: text("result_summary"),
    resultData: text("result_data", { mode: "json" }),
    version: integer("version").notNull().default(1),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    completedAt: text("completed_at"),
  },
  (table) => [
    uniqueIndex("uk_task_code").on(table.taskCode),
    index("idx_tasks_status").on(table.status),
    index("idx_tasks_priority").on(table.priority),
    index("idx_tasks_category").on(table.category),
    index("idx_tasks_assigned_role").on(table.assignedRoleId),
    index("idx_tasks_assigned_node").on(table.assignedNodeId),
    index("idx_tasks_deadline").on(table.deadline),
    index("idx_tasks_expense_approved").on(table.expenseApproved),
  ],
);

// ── Task Progress Log ────────────────────────────

export const taskProgressLogTable = sqliteTable(
  "task_progress_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    // MySQL equivalent: serial("id")
    taskId: text("task_id").notNull(),
    actor: text("actor").notNull(),
    action: text("action").notNull(),
    fromStatus: text("from_status"),
    toStatus: text("to_status"),
    details: text("details", { mode: "json" }),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index("idx_progress_task_id").on(table.taskId),
    index("idx_progress_created_at").on(table.createdAt),
  ],
);

// ── Task Comments ────────────────────────────────

export const taskCommentsTable = sqliteTable(
  "task_comments",
  {
    id: text("id").primaryKey().notNull(),
    taskId: text("task_id").notNull(),
    author: text("author").notNull(),
    content: text("content").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [index("idx_comments_task_id").on(table.taskId)],
);

// ═══════════════════════════════════════════════════════════════
// Community Module (src/modules/community/schema.ts)
// ═══════════════════════════════════════════════════════════════

// ── Community Channels ──────────────────────────

export const communityChannelsTable = sqliteTable(
  "community_channels",
  {
    id: text("id").primaryKey(),
    // MySQL equivalent: .default(sql`(UUID())`) — generate in app layer
    name: text("name").notNull(),
    displayName: text("display_name").notNull(),
    description: text("description"),
    creatorNodeId: text("creator_node_id"),
    isSystem: integer("is_system").notNull().default(0),
    // MySQL equivalent: tinyint
    subscriberCount: integer("subscriber_count").notNull().default(0),
    postCount: integer("post_count").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [uniqueIndex("uk_channel_name").on(table.name)],
);

// ── Community Topics (Posts) ────────────────────

export const communityTopicsTable = sqliteTable(
  "community_topics",
  {
    id: text("id").primaryKey(),
    authorId: text("author_id").notNull(),
    channelId: text("channel_id"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    postType: text("post_type").notNull().default("discussion"),
    category: text("category"),
    tags: text("tags", { mode: "json" }),
    contextData: text("context_data", { mode: "json" }),
    codeSnippets: text("code_snippets", { mode: "json" }),
    relatedAssets: text("related_assets", { mode: "json" }),
    viewCount: integer("view_count").notNull().default(0),
    replyCount: integer("reply_count").notNull().default(0),
    score: real("score").notNull().default(0),
    // MySQL equivalent: float
    upvotes: integer("upvotes").notNull().default(0),
    downvotes: integer("downvotes").notNull().default(0),
    isPinned: integer("is_pinned").notNull().default(0),
    // MySQL equivalent: tinyint
    isLocked: integer("is_locked").notNull().default(0),
    isDistilled: integer("is_distilled").notNull().default(0),
    lastReplyAt: text("last_reply_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index("idx_ct_author_id").on(table.authorId),
    index("idx_ct_category").on(table.category),
    index("idx_ct_channel_id").on(table.channelId),
    index("idx_ct_created_at").on(table.createdAt),
    index("idx_ct_last_reply_at").on(table.lastReplyAt),
  ],
);

// ── Community Replies ───────────────────────────

export const communityRepliesTable = sqliteTable(
  "community_replies",
  {
    id: text("id").primaryKey(),
    topicId: text("topic_id").notNull(),
    authorId: text("author_id").notNull(),
    body: text("body").notNull(),
    isSolution: integer("is_solution").notNull().default(0),
    // MySQL equivalent: tinyint
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index("replies_idx_topic_id").on(table.topicId),
    index("replies_idx_author_id").on(table.authorId),
    index("replies_idx_created_at").on(table.createdAt),
  ],
);

// ── Community Votes ─────────────────────────────

export const communityVotesTable = sqliteTable(
  "community_votes",
  {
    id: text("id").primaryKey(),
    nodeId: text("node_id").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    direction: integer("direction").notNull(),
    // MySQL equivalent: tinyint
    weight: real("weight").notNull().default(1.0),
    // MySQL equivalent: float
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex("uk_node_target").on(
      table.nodeId,
      table.targetType,
      table.targetId,
    ),
  ],
);

// ── Community Subscriptions ─────────────────────

export const communitySubscriptionsTable = sqliteTable(
  "community_subscriptions",
  {
    id: text("id").primaryKey(),
    nodeId: text("node_id").notNull(),
    channelId: text("channel_id").notNull(),
    subscribedAt: text("subscribed_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex("uk_node_channel").on(table.nodeId, table.channelId),
  ],
);

// ── Community Follows ───────────────────────────

export const communityFollowsTable = sqliteTable(
  "community_follows",
  {
    id: text("id").primaryKey(),
    followerNodeId: text("follower_node_id").notNull(),
    followingNodeId: text("following_node_id").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex("uk_follow_pair").on(
      table.followerNodeId,
      table.followingNodeId,
    ),
  ],
);

// ── Agent Direct Messages ───────────────────────

export const agentMessagesTable = sqliteTable(
  "agent_messages",
  {
    id: text("id").primaryKey(),
    fromNodeId: text("from_node_id").notNull(),
    toNodeId: text("to_node_id").notNull(),
    messageType: text("message_type").notNull(),
    subject: text("subject"),
    payload: text("payload", { mode: "json" }),
    read: integer("read").notNull().default(0),
    // MySQL equivalent: tinyint
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index("idx_agent_msg_to").on(table.toNodeId),
    index("idx_agent_msg_from").on(table.fromNodeId),
    index("idx_agent_msg_created").on(table.createdAt),
  ],
);

// ── Campaigns ─────────────────────────────────

export const campaignsTable = sqliteTable("campaigns", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  startDate: text("start_date").notNull(),
  // MySQL equivalent: datetime
  endDate: text("end_date"),
  status: text("campaign_status").default("draft"),
  // MySQL equivalent: mysqlEnum("campaign_status", ["draft","planned","active","completed","cancelled"])
  ownerId: text("owner_id"),
  ownerRole: text("owner_role"),
  channel: text("channel"),
  budget: real("budget"),
  // MySQL equivalent: decimal(12, 2)
  kpiTarget: text("kpi_target"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

// ── Sales Pipeline ────────────────────────────

export const salesPipelineTable = sqliteTable("sales_pipeline", {
  id: text("id").primaryKey(),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name"),
  dealTitle: text("deal_title").notNull(),
  stage: text("pipeline_stage").default("lead"),
  // MySQL equivalent: mysqlEnum("pipeline_stage", ["lead","qualified","proposal","negotiation","closed_won","closed_lost"])
  dealValue: real("deal_value"),
  // MySQL equivalent: decimal(14, 2)
  currency: text("currency").default("JPY"),
  probability: integer("probability").default(0),
  expectedCloseDate: text("expected_close_date"),
  // MySQL equivalent: datetime
  ownerId: text("owner_id"),
  ownerRole: text("owner_role"),
  notes: text("notes"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

// ── Roadmap Items ─────────────────────────────────

export const roadmapItemsTable = sqliteTable("roadmap_items", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  phase: text("roadmap_phase").default("later"),
  // MySQL equivalent: mysqlEnum("roadmap_phase", ["now","next","later","done"])
  priority: text("roadmap_priority").default("should"),
  // MySQL equivalent: mysqlEnum("roadmap_priority", ["must","should","could","wont"])
  category: text("category"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  progress: integer("progress").default(0),
  ownerId: text("owner_id"),
  ownerRole: text("owner_role"),
  linkedTaskIds: text("linked_task_ids"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

// ── KPI Definitions ───────────────────────────────

export const kpiDefinitionsTable = sqliteTable("kpi_definitions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"),
  unit: text("unit"),
  targetValue: real("target_value"),
  // MySQL equivalent: decimal(14, 2)
  targetPeriod: text("kpi_period").default("monthly"),
  // MySQL equivalent: mysqlEnum("kpi_period", ["daily","weekly","monthly","quarterly","yearly"])
  ownerRole: text("owner_role"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// ── KPI Records ───────────────────────────────────

export const kpiRecordsTable = sqliteTable("kpi_records", {
  id: text("id").primaryKey(),
  kpiId: text("kpi_id").notNull(),
  value: real("value").notNull(),
  // MySQL equivalent: decimal(14, 2)
  recordedAt: text("recorded_at").default(sql`(datetime('now'))`),
  recordedBy: text("recorded_by"),
  notes: text("notes"),
});

// ═══════════════════════════════════════════════════════════════
// Platform Module (src/modules/platform/schema.ts)
// ═══════════════════════════════════════════════════════════════

// ── Platform Values Table ────────────────────────

export const platformValues = sqliteTable("platform_values", {
  id: text("id").primaryKey(),
  // MySQL equivalent: .default(sql`(UUID())`) — generate in app layer
  content: text("content").notNull().default(""),
  // MySQL equivalent: mediumtext
  contentHash: text("content_hash").notNull().default(""),
  updatedBy: text("updated_by"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ═══════════════════════════════════════════════════════════════
// Messaging Module (src/modules/messaging/schema.ts)
// ═══════════════════════════════════════════════════════════════

// ── Message Queue ───────────────────────────────

export const messageQueueTable = sqliteTable(
  "message_queue",
  {
    id: text("id").primaryKey(),
    // MySQL equivalent: .default(sql`(UUID())`) — generate in app layer
    fromNodeId: text("from_node_id").notNull(),
    toNodeId: text("to_node_id"),
    toRoleId: text("to_role_id"),
    messageType: text("message_type").notNull(),
    subject: text("subject"),
    body: text("body"),
    priority: text("priority").notNull().default("normal"),
    // MySQL equivalent: mysqlEnum("priority", ["critical","high","normal","low"])
    status: text("status").notNull().default("pending"),
    // MySQL equivalent: mysqlEnum("status", ["pending","delivered","read","failed","expired"])
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    deliveredAt: text("delivered_at"),
    readAt: text("read_at"),
  },
  (table) => [
    index("idx_mq_to_node_status").on(table.toNodeId, table.status),
    index("idx_mq_to_role_status").on(table.toRoleId, table.status),
    index("idx_mq_from_node").on(table.fromNodeId),
    index("idx_mq_status").on(table.status),
    index("idx_mq_priority").on(table.priority),
    index("idx_mq_created_at").on(table.createdAt),
  ],
);

// ═══════════════════════════════════════════════════════════════
// Relay Module (src/modules/relay/schema.ts)
// ═══════════════════════════════════════════════════════════════

// ── A2A Relay Queue ─────────────────────────────

export const a2aRelayQueueTable = sqliteTable(
  "a2a_relay_queue",
  {
    id: text("id").primaryKey().notNull(),
    fromNodeId: text("from_node_id").notNull(),
    toNodeId: text("to_node_id").notNull(),
    messageType: text("message_type").notNull().default("text"),
    subject: text("subject"),
    payload: text("payload", { mode: "json" }).notNull(),
    priority: text("priority").notNull().default("normal"),
    // MySQL equivalent: mysqlEnum("priority", ["critical","high","normal","low"])
    status: text("status").notNull().default("queued"),
    // MySQL equivalent: mysqlEnum("status", ["queued","delivered","acknowledged","expired","failed"])
    deliveredAt: text("delivered_at"),
    acknowledgedAt: text("acknowledged_at"),
    expiresAt: text("expires_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index("idx_relay_to_node_status").on(table.toNodeId, table.status),
    index("idx_relay_from_node").on(table.fromNodeId),
    index("idx_relay_status").on(table.status),
    index("idx_relay_priority").on(table.priority),
    index("idx_relay_created_at").on(table.createdAt),
    index("idx_relay_expires_at").on(table.expiresAt),
  ],
);

// ═══════════════════════════════════════════════════════════════
// Meetings Module (src/modules/meetings/schema.ts)
// ═══════════════════════════════════════════════════════════════

// ── Meeting Sessions ────────────────────────────

export const meetingSessionsTable = sqliteTable(
  "meeting_sessions",
  {
    id: text("id").primaryKey().notNull(),
    title: text("title").notNull(),
    type: text("type").notNull().default("discussion"),
    // MySQL equivalent: mysqlEnum("type", ["discussion","review","brainstorm","decision"])
    status: text("status").notNull().default("scheduled"),
    // MySQL equivalent: mysqlEnum("status", ["scheduled","active","paused","concluded","cancelled"])
    initiatorType: text("initiator_type").notNull().default("human"),
    // MySQL equivalent: mysqlEnum("initiator_type", ["human","agent"])
    initiationReason: text("initiation_reason"),
    facilitatorNodeId: text("facilitator_node_id").notNull(),
    contextId: text("context_id").notNull(),
    sharedContext: text("shared_context"),
    turnPolicy: text("turn_policy").notNull().default("facilitator-directed"),
    maxDurationMinutes: integer("max_duration_minutes").notNull().default(60),
    agenda: text("agenda", { mode: "json" }),
    decisions: text("decisions", { mode: "json" }),
    actionItems: text("action_items", { mode: "json" }),
    summary: text("summary"),
    scheduledAt: text("scheduled_at"),
    startedAt: text("started_at"),
    endedAt: text("ended_at"),
    createdBy: text("created_by").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index("idx_ms_status").on(table.status),
    index("idx_ms_scheduled").on(table.scheduledAt),
    index("idx_ms_initiator").on(table.initiatorType),
    index("idx_ms_context").on(table.contextId),
    index("idx_ms_created").on(table.createdAt),
  ],
);

// ── Meeting Participants ────────────────────────

export const meetingParticipantsTable = sqliteTable(
  "meeting_participants",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    // MySQL equivalent: serial("id")
    sessionId: text("session_id").notNull(),
    nodeId: text("node_id").notNull(),
    roleId: text("role_id").notNull(),
    displayName: text("display_name").notNull(),
    status: text("status").notNull().default("invited"),
    // MySQL equivalent: mysqlEnum("status", ["invited","joined","speaking","left"])
    invitedAt: text("invited_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    joinedAt: text("joined_at"),
    leftAt: text("left_at"),
  },
  (table) => [
    uniqueIndex("uk_mp_session_node").on(table.sessionId, table.nodeId),
    index("idx_mp_session").on(table.sessionId),
    index("idx_mp_node").on(table.nodeId),
  ],
);

// ── Meeting Transcript ──────────────────────────

export const meetingTranscriptTable = sqliteTable(
  "meeting_transcript",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    // MySQL equivalent: serial("id")
    sessionId: text("session_id").notNull(),
    speakerNodeId: text("speaker_node_id").notNull(),
    speakerRole: text("speaker_role").notNull(),
    content: text("content").notNull(),
    type: text("type").notNull().default("statement"),
    // MySQL equivalent: mysqlEnum("type", ["statement","question","answer","proposal","objection","agreement","system"])
    replyToId: integer("reply_to_id"),
    // MySQL equivalent: bigint("reply_to_id", { mode: "number" })
    agendaItemIndex: integer("agenda_item_index"),
    metadata: text("metadata", { mode: "json" }),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index("idx_mt_session_time").on(table.sessionId, table.createdAt),
    index("idx_mt_speaker").on(table.speakerNodeId),
  ],
);

// ── Meeting Auto Triggers ───────────────────────

export const meetingAutoTriggersTable = sqliteTable(
  "meeting_auto_triggers",
  {
    id: text("id").primaryKey().notNull(),
    name: text("name").notNull(),
    description: text("description"),
    event: text("event").notNull(),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    // MySQL equivalent: boolean("enabled")
    facilitatorRole: text("facilitator_role").notNull(),
    meetingTemplate: text("meeting_template", { mode: "json" }).notNull(),
    lastTriggeredAt: text("last_triggered_at"),
    triggerCount: integer("trigger_count").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index("idx_mat_event").on(table.event),
    index("idx_mat_enabled").on(table.enabled),
  ],
);

// ═══════════════════════════════════════════════════════════════
// A2A Gateway Module (src/modules/a2a-gateway/schema.ts)
// ═══════════════════════════════════════════════════════════════

// ── Agent Cards Registry ────────────────────────

export const agentCardsTable = sqliteTable(
  "agent_cards",
  {
    nodeId: text("node_id").primaryKey().notNull(),
    agentCard: text("agent_card", { mode: "json" }).notNull(),
    skills: text("skills", { mode: "json" }),
    capabilities: text("capabilities", { mode: "json" }),
    lastSeenAt: text("last_seen_at"),
    status: text("status").notNull().default("offline"),
    // MySQL equivalent: mysqlEnum("status", ["online","offline","busy"])
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index("idx_agent_status").on(table.status),
    index("idx_agent_last_seen").on(table.lastSeenAt),
  ],
);

// ═══════════════════════════════════════════════════════════════
// ClawHub+ Module (src/modules/clawhub/schema.ts)
// ═══════════════════════════════════════════════════════════════

// ── Skills Table ────────────────────────────────

export const skillsTable = sqliteTable(
  "skills",
  {
    id: text("id").primaryKey().notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    authorId: text("author_id"),
    category: text("category"),
    tags: text("tags", { mode: "json" }).$type<string[]>(),
    latestVersion: text("latest_version"),
    downloadCount: integer("download_count").notNull().default(0),
    ratingAvg: real("rating_avg").notNull().default(0),
    // MySQL equivalent: float
    ratingCount: integer("rating_count").notNull().default(0),
    isOfficial: integer("is_official").notNull().default(0),
    // MySQL equivalent: tinyint
    status: text("status").notNull().default("active"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex("uk_slug").on(table.slug),
    index("idx_skills_author").on(table.authorId),
    index("idx_download_count").on(table.downloadCount),
    index("idx_skills_status").on(table.status),
  ],
);

// ── Skill Versions Table ────────────────────────

export const skillVersionsTable = sqliteTable(
  "skill_versions",
  {
    id: text("id").primaryKey().notNull(),
    skillId: text("skill_id").notNull(),
    version: text("version").notNull(),
    changelog: text("changelog"),
    tarballUrl: text("tarball_url").notNull(),
    checksumSha256: text("checksum_sha256").notNull(),
    tarballSize: integer("tarball_size").notNull().default(0),
    minWinclawVersion: text("min_winclaw_version"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex("uk_skill_version").on(table.skillId, table.version),
  ],
);

// ── Skill Ratings Table ─────────────────────────

export const skillRatingsTable = sqliteTable(
  "skill_ratings",
  {
    id: text("id").primaryKey().notNull(),
    skillId: text("skill_id").notNull(),
    userId: text("user_id").notNull(),
    rating: integer("rating").notNull(),
    // MySQL equivalent: tinyint
    review: text("review"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex("uk_skill_user_rating").on(table.skillId, table.userId),
  ],
);

// ── Skill Downloads Table ───────────────────────

export const skillDownloadsTable = sqliteTable(
  "skill_downloads",
  {
    id: text("id").primaryKey().notNull(),
    skillId: text("skill_id").notNull(),
    version: text("version"),
    nodeId: text("node_id"),
    userId: text("user_id"),
    ipHash: text("ip_hash"),
    downloadedAt: text("downloaded_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index("idx_sd_skill_id").on(table.skillId),
    index("idx_downloaded_at").on(table.downloadedAt),
  ],
);

// ═══════════════════════════════════════════════════════════════
// Model Keys Module (src/modules/model-keys/schema.ts)
// ═══════════════════════════════════════════════════════════════

// ── AI Model Keys ──────────────────────────────

export const aiModelKeysTable = sqliteTable(
  "ai_model_keys",
  {
    id: text("id").primaryKey().notNull(),
    category: text("category").notNull(),
    // MySQL equivalent: mysqlEnum("category", ["primary","auxiliary"])
    name: text("name").notNull(),
    provider: text("provider").notNull(),
    modelName: text("model_name").notNull(),
    apiKeyEnc: text("api_key_enc").notNull(),
    baseUrl: text("base_url"),
    notes: text("notes"),
    isActive: integer("is_active").notNull().default(1),
    // MySQL equivalent: tinyint
    createdBy: text("created_by").notNull().default(""),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index("idx_mk_category").on(table.category),
    index("idx_mk_provider").on(table.provider),
    index("idx_mk_active").on(table.isActive),
  ],
);

// ═══════════════════════════════════════════════════════════════
// Strategy Module (src/modules/strategy/schema.ts)
// ═══════════════════════════════════════════════════════════════

// ── Company Strategy (single-row = current strategy) ─

export const companyStrategyTable = sqliteTable("company_strategy", {
  id: text("id").primaryKey().notNull(),
  companyName: text("company_name"),
  industry: text("industry"),
  employeeCount: integer("employee_count"),
  annualRevenueTarget: text("annual_revenue_target"),
  fiscalYearStart: text("fiscal_year_start"),
  fiscalYearEnd: text("fiscal_year_end"),
  currency: text("currency").default("JPY"),
  language: text("language").default("ja"),
  timezone: text("timezone").default("Asia/Tokyo"),
  companyMission: text("company_mission"),
  companyVision: text("company_vision"),
  companyValues: text("company_values"),
  shortTermObjectives: text("short_term_objectives", { mode: "json" }),
  midTermObjectives: text("mid_term_objectives", { mode: "json" }),
  longTermObjectives: text("long_term_objectives", { mode: "json" }),
  departmentBudgets: text("department_budgets", { mode: "json" }),
  departmentKpis: text("department_kpis", { mode: "json" }),
  strategicPriorities: text("strategic_priorities", { mode: "json" }),
  revision: integer("revision").notNull().default(1),
  updatedBy: text("updated_by"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ── Company Strategy History (append-only) ──────

export const companyStrategyHistoryTable = sqliteTable(
  "company_strategy_history",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    // MySQL equivalent: serial("id")
    strategyId: text("strategy_id").notNull(),
    revision: integer("revision").notNull(),
    snapshot: text("snapshot", { mode: "json" }).notNull(),
    changedBy: text("changed_by"),
    changeSummary: text("change_summary"),
    changedFields: text("changed_fields", { mode: "json" }),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index("idx_csh_strategy_id").on(table.strategyId),
    index("idx_csh_revision").on(table.revision),
    index("idx_csh_created_at").on(table.createdAt),
  ],
);

// ═══════════════════════════════════════════════════════════════
// Telemetry Module (src/modules/telemetry/schema.ts)
// ═══════════════════════════════════════════════════════════════

// ── Telemetry Reports Table ─────────────────────

export const telemetryReports = sqliteTable(
  "telemetry_reports",
  {
    id: text("id").primaryKey(),
    // MySQL equivalent: .default(sql`(UUID())`) — generate in app layer
    nodeId: text("node_id").notNull(),
    anonymousId: text("anonymous_id"),
    reportDate: text("report_date").notNull(),
    // MySQL equivalent: date
    skillCalls: text("skill_calls", { mode: "json" }),
    geneUsage: text("gene_usage", { mode: "json" }),
    capsuleUsage: text("capsule_usage", { mode: "json" }),
    platform: text("platform"),
    winclawVersion: text("winclaw_version"),
    sessionCount: integer("session_count").notNull().default(0),
    activeMinutes: integer("active_minutes").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex("uk_node_report_date").on(table.nodeId, table.reportDate),
    index("idx_report_date").on(table.reportDate),
  ],
);

// ═══════════════════════════════════════════════════════════════
// Update Module (src/modules/update/schema.ts)
// ═══════════════════════════════════════════════════════════════

// ── Client Releases Table ───────────────────────

export const clientReleases = sqliteTable(
  "client_releases",
  {
    id: text("id").primaryKey().notNull(),
    version: text("version").notNull(),
    channel: text("channel").notNull().default("stable"),
    platform: text("platform").notNull(),
    changelog: text("changelog"),
    downloadUrl: text("download_url").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    checksumSha256: text("checksum_sha256"),
    minUpgradeVersion: text("min_upgrade_version"),
    isCritical: integer("is_critical").notNull().default(0),
    // MySQL equivalent: tinyint
    publishedAt: text("published_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex("uk_version_platform_channel").on(
      table.version,
      table.platform,
      table.channel,
    ),
    index("idx_channel_platform").on(table.channel, table.platform),
  ],
);

// ── Update Reports Table ────────────────────────

export const updateReports = sqliteTable(
  "update_reports",
  {
    id: text("id").primaryKey().notNull(),
    nodeId: text("node_id"),
    fromVersion: text("from_version"),
    toVersion: text("to_version"),
    platform: text("platform"),
    status: text("status").notNull().default("success"),
    errorMessage: text("error_message"),
    durationMs: integer("duration_ms"),
    reportedAt: text("reported_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index("idx_ur_node_id").on(table.nodeId),
    index("idx_to_version").on(table.toVersion),
    index("idx_reported_at").on(table.reportedAt),
  ],
);
