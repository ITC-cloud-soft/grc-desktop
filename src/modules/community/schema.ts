/**
 * Community Module — Drizzle ORM Schema (MySQL)
 *
 * Maps to the community tables defined in ADR-002:
 *   community_channels, community_topics, community_replies,
 *   community_votes, community_subscriptions, community_follows
 */

import {
  mysqlTable,
  mysqlEnum,
  char,
  varchar,
  int,
  float,
  tinyint,
  json,
  timestamp,
  datetime,
  text,
  decimal,
  uniqueIndex,
  index,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

// ── Community Channels ──────────────────────────

export const communityChannelsTable = mysqlTable(
  "community_channels",
  {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    name: varchar("name", { length: 100 }).notNull(),
    displayName: varchar("display_name", { length: 255 }).notNull(),
    description: text("description"),
    creatorNodeId: varchar("creator_node_id", { length: 255 }),
    isSystem: tinyint("is_system").notNull().default(0),
    subscriberCount: int("subscriber_count").notNull().default(0),
    postCount: int("post_count").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("uk_channel_name").on(table.name),
  ],
);

// ── Community Topics (Posts) ────────────────────

export const communityTopicsTable = mysqlTable(
  "community_topics",
  {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    authorId: char("author_id", { length: 36 }).notNull(),
    channelId: char("channel_id", { length: 36 }),
    title: varchar("title", { length: 500 }).notNull(),
    body: text("body").notNull(),
    postType: varchar("post_type", { length: 20 }).notNull().default("discussion"),
    category: varchar("category", { length: 50 }),
    tags: json("tags"),
    contextData: json("context_data"),
    codeSnippets: json("code_snippets"),
    relatedAssets: json("related_assets"),
    viewCount: int("view_count").notNull().default(0),
    replyCount: int("reply_count").notNull().default(0),
    score: float("score").notNull().default(0),
    upvotes: int("upvotes").notNull().default(0),
    downvotes: int("downvotes").notNull().default(0),
    isPinned: tinyint("is_pinned").notNull().default(0),
    isLocked: tinyint("is_locked").notNull().default(0),
    isDistilled: tinyint("is_distilled").notNull().default(0),
    lastReplyAt: timestamp("last_reply_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("idx_author_id").on(table.authorId),
    index("idx_category").on(table.category),
    index("idx_channel_id").on(table.channelId),
    index("idx_created_at").on(table.createdAt),
    index("idx_last_reply_at").on(table.lastReplyAt),
  ],
);

// ── Community Replies ───────────────────────────

export const communityRepliesTable = mysqlTable(
  "community_replies",
  {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    topicId: char("topic_id", { length: 36 }).notNull(),
    authorId: char("author_id", { length: 36 }).notNull(),
    body: text("body").notNull(),
    isSolution: tinyint("is_solution").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("replies_idx_topic_id").on(table.topicId),
    index("replies_idx_author_id").on(table.authorId),
    index("replies_idx_created_at").on(table.createdAt),
  ],
);

// ── Community Votes ─────────────────────────────

export const communityVotesTable = mysqlTable(
  "community_votes",
  {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    nodeId: varchar("node_id", { length: 255 }).notNull(),
    targetType: varchar("target_type", { length: 10 }).notNull(),
    targetId: char("target_id", { length: 36 }).notNull(),
    direction: tinyint("direction").notNull(),
    weight: float("weight").notNull().default(1.0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
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

export const communitySubscriptionsTable = mysqlTable(
  "community_subscriptions",
  {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    nodeId: varchar("node_id", { length: 255 }).notNull(),
    channelId: char("channel_id", { length: 36 }).notNull(),
    subscribedAt: timestamp("subscribed_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("uk_node_channel").on(table.nodeId, table.channelId),
  ],
);

// ── Community Follows ───────────────────────────

export const communityFollowsTable = mysqlTable(
  "community_follows",
  {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    followerNodeId: varchar("follower_node_id", { length: 255 }).notNull(),
    followingNodeId: varchar("following_node_id", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("uk_follow_pair").on(
      table.followerNodeId,
      table.followingNodeId,
    ),
  ],
);

// ── Agent Direct Messages ───────────────────────

export const agentMessagesTable = mysqlTable(
  "agent_messages",
  {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    fromNodeId: varchar("from_node_id", { length: 255 }).notNull(),
    toNodeId: varchar("to_node_id", { length: 255 }).notNull(),
    messageType: varchar("message_type", { length: 50 }).notNull(),
    subject: varchar("subject", { length: 500 }),
    payload: json("payload"),
    read: tinyint("read").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_agent_msg_to").on(table.toNodeId),
    index("idx_agent_msg_from").on(table.fromNodeId),
    index("idx_agent_msg_created").on(table.createdAt),
  ],
);

export type AgentMessage = typeof agentMessagesTable.$inferSelect;
export type NewAgentMessage = typeof agentMessagesTable.$inferInsert;

// ── Campaigns ─────────────────────────────────

export const campaignsTable = mysqlTable("campaigns", {
  id: char("id", { length: 36 }).primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  startDate: datetime("start_date").notNull(),
  endDate: datetime("end_date"),
  status: mysqlEnum("campaign_status", ["draft", "planned", "active", "completed", "cancelled"]).default("draft"),
  ownerId: varchar("owner_id", { length: 100 }),
  ownerRole: varchar("owner_role", { length: 50 }),
  channel: varchar("channel", { length: 50 }),
  budget: decimal("budget", { precision: 12, scale: 2 }),
  kpiTarget: varchar("kpi_target", { length: 200 }),
  createdAt: datetime("created_at").default(sql`NOW()`),
  updatedAt: datetime("updated_at").default(sql`NOW()`),
});

export type Campaign = typeof campaignsTable.$inferSelect;
export type NewCampaign = typeof campaignsTable.$inferInsert;

// ── Sales Pipeline ────────────────────────────

export const salesPipelineTable = mysqlTable("sales_pipeline", {
  id: char("id", { length: 36 }).primaryKey(),
  companyName: varchar("company_name", { length: 200 }).notNull(),
  contactName: varchar("contact_name", { length: 100 }),
  dealTitle: varchar("deal_title", { length: 200 }).notNull(),
  stage: mysqlEnum("pipeline_stage", ["lead", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"]).default("lead"),
  dealValue: decimal("deal_value", { precision: 14, scale: 2 }),
  currency: varchar("currency", { length: 3 }).default("JPY"),
  probability: int("probability").default(0),
  expectedCloseDate: datetime("expected_close_date"),
  ownerId: varchar("owner_id", { length: 100 }),
  ownerRole: varchar("owner_role", { length: 50 }),
  notes: text("notes"),
  createdAt: datetime("created_at").default(sql`NOW()`),
  updatedAt: datetime("updated_at").default(sql`NOW()`),
});

export type SalesPipelineDeal = typeof salesPipelineTable.$inferSelect;
export type NewSalesPipelineDeal = typeof salesPipelineTable.$inferInsert;

// ── Roadmap Items ─────────────────────────────────

export const roadmapItemsTable = mysqlTable("roadmap_items", {
  id: char("id", { length: 36 }).primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  phase: mysqlEnum("roadmap_phase", ["now", "next", "later", "done"]).default("later"),
  priority: mysqlEnum("roadmap_priority", ["must", "should", "could", "wont"]).default("should"),
  category: varchar("category", { length: 50 }),
  startDate: datetime("start_date"),
  endDate: datetime("end_date"),
  progress: int("progress").default(0),
  ownerId: varchar("owner_id", { length: 100 }),
  ownerRole: varchar("owner_role", { length: 50 }),
  linkedTaskIds: text("linked_task_ids"),
  createdAt: datetime("created_at").default(sql`NOW()`),
  updatedAt: datetime("updated_at").default(sql`NOW()`),
});

export type RoadmapItem = typeof roadmapItemsTable.$inferSelect;
export type NewRoadmapItem = typeof roadmapItemsTable.$inferInsert;

// ── KPI Definitions ───────────────────────────────

export const kpiDefinitionsTable = mysqlTable("kpi_definitions", {
  id: char("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }),
  unit: varchar("unit", { length: 20 }),
  targetValue: decimal("target_value", { precision: 14, scale: 2 }),
  targetPeriod: mysqlEnum("kpi_period", ["daily", "weekly", "monthly", "quarterly", "yearly"]).default("monthly"),
  ownerRole: varchar("owner_role", { length: 50 }),
  createdAt: datetime("created_at").default(sql`NOW()`),
});

export type KpiDefinition = typeof kpiDefinitionsTable.$inferSelect;
export type NewKpiDefinition = typeof kpiDefinitionsTable.$inferInsert;

// ── KPI Records ───────────────────────────────────

export const kpiRecordsTable = mysqlTable("kpi_records", {
  id: char("id", { length: 36 }).primaryKey(),
  kpiId: char("kpi_id", { length: 36 }).notNull(),
  value: decimal("value", { precision: 14, scale: 2 }).notNull(),
  recordedAt: datetime("recorded_at").default(sql`NOW()`),
  recordedBy: varchar("recorded_by", { length: 100 }),
  notes: text("notes"),
});

export type KpiRecord = typeof kpiRecordsTable.$inferSelect;
export type NewKpiRecord = typeof kpiRecordsTable.$inferInsert;
