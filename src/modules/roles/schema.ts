/**
 * Drizzle ORM Schema — Roles Module (MySQL)
 *
 * Maps to the SQL tables:
 *   role_templates
 *
 * Also re-exports nodesTable from evolution/schema for role assignment operations.
 */

import {
  mysqlTable,
  varchar,
  tinyint,
  mediumtext,
  text,
  timestamp,
  mysqlEnum,
  index,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

// Re-export nodesTable — needed for role assignment (update nodes for role fields)
export { nodesTable } from "../evolution/schema.js";

// ── Role Templates ──────────────────────────────

export const roleTemplatesTable = mysqlTable(
  "role_templates",
  {
    id: varchar("id", { length: 50 }).primaryKey().notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    emoji: varchar("emoji", { length: 10 }),
    description: text("description"),
    department: varchar("department", { length: 100 }),
    industry: varchar("industry", { length: 100 }),
    mode: mysqlEnum("mode", ["autonomous", "copilot"]).notNull().default("autonomous"),
    isBuiltin: tinyint("is_builtin").notNull().default(0),
    agentsMd: mediumtext("agents_md").notNull(),
    soulMd: mediumtext("soul_md").notNull(),
    identityMd: mediumtext("identity_md").notNull(),
    userMd: mediumtext("user_md").notNull(),
    toolsMd: mediumtext("tools_md").notNull(),
    heartbeatMd: mediumtext("heartbeat_md").notNull(),
    bootstrapMd: mediumtext("bootstrap_md").notNull(),
    tasksMd: mediumtext("tasks_md").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("idx_department").on(table.department),
    index("idx_industry").on(table.industry),
    index("idx_mode").on(table.mode),
    index("idx_is_builtin").on(table.isBuiltin),
  ],
);
