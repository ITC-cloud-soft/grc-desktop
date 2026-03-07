/**
 * Drizzle ORM Schema — Relay Module (MySQL)
 *
 * Maps to the SQL table:
 *   a2a_relay_queue
 *
 * Provides inter-node messaging via the A2A protocol relay queue.
 */

import {
  mysqlTable,
  char,
  varchar,
  json,
  timestamp,
  mysqlEnum,
  index,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

// ── A2A Relay Queue ─────────────────────────────

export const a2aRelayQueueTable = mysqlTable(
  "a2a_relay_queue",
  {
    id: char("id", { length: 36 }).primaryKey().notNull(),
    fromNodeId: varchar("from_node_id", { length: 255 }).notNull(),
    toNodeId: varchar("to_node_id", { length: 255 }).notNull(),
    messageType: varchar("message_type", { length: 50 }).notNull().default("text"),
    subject: varchar("subject", { length: 500 }),
    payload: json("payload").notNull(),
    priority: mysqlEnum("priority", ["critical", "high", "normal", "low"])
      .notNull()
      .default("normal"),
    status: mysqlEnum("status", ["queued", "delivered", "acknowledged", "expired", "failed"])
      .notNull()
      .default("queued"),
    deliveredAt: timestamp("delivered_at"),
    acknowledgedAt: timestamp("acknowledged_at"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_to_node_status").on(table.toNodeId, table.status),
    index("idx_from_node").on(table.fromNodeId),
    index("idx_status").on(table.status),
    index("idx_priority").on(table.priority),
    index("idx_created_at").on(table.createdAt),
    index("idx_expires_at").on(table.expiresAt),
  ],
);
