/**
 * Messaging Module — Drizzle ORM Schema (MySQL)
 *
 * Async message queue for persistent inter-node messaging.
 * Replaces synchronous sessions_send with a durable queue
 * that survives timeouts and supports priority-based delivery.
 *
 * Table: message_queue
 */

import {
  mysqlTable,
  char,
  varchar,
  text,
  timestamp,
  mysqlEnum,
  index,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

// ── Message Queue ───────────────────────────────

export const messageQueueTable = mysqlTable(
  "message_queue",
  {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    fromNodeId: varchar("from_node_id", { length: 128 }).notNull(),
    toNodeId: varchar("to_node_id", { length: 128 }),
    toRoleId: varchar("to_role_id", { length: 50 }),
    messageType: varchar("message_type", { length: 20 }).notNull(),
    subject: varchar("subject", { length: 255 }),
    body: text("body"),
    priority: mysqlEnum("priority", ["critical", "high", "normal", "low"])
      .notNull()
      .default("normal"),
    status: mysqlEnum("status", ["pending", "delivered", "read", "failed", "expired"])
      .notNull()
      .default("pending"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    deliveredAt: timestamp("delivered_at"),
    readAt: timestamp("read_at"),
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

export type MessageQueueRow = typeof messageQueueTable.$inferSelect;
export type NewMessageQueueRow = typeof messageQueueTable.$inferInsert;
