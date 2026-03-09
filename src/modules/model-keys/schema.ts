/**
 * Drizzle ORM Schema — AI Model Keys table (MySQL)
 *
 * Maps to the SQL table defined in 010_ai_model_keys.sql: ai_model_keys
 */

import {
  mysqlTable,
  mysqlEnum,
  char,
  varchar,
  tinyint,
  timestamp,
  text,
  index,
} from "drizzle-orm/mysql-core";

// ── AI Model Keys ──────────────────────────────

export const aiModelKeysTable = mysqlTable(
  "ai_model_keys",
  {
    id: char("id", { length: 36 }).primaryKey().notNull(),
    category: mysqlEnum("category", ["primary", "auxiliary"]).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    provider: varchar("provider", { length: 50 }).notNull(),
    modelName: varchar("model_name", { length: 100 }).notNull(),
    apiKeyEnc: text("api_key_enc").notNull(),
    baseUrl: varchar("base_url", { length: 500 }),
    notes: text("notes"),
    isActive: tinyint("is_active").notNull().default(1),
    createdBy: varchar("created_by", { length: 255 }).notNull().default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("idx_mk_category").on(table.category),
    index("idx_mk_provider").on(table.provider),
    index("idx_mk_active").on(table.isActive),
  ],
);
