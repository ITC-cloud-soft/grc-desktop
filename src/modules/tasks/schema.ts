/**
 * Tasks Module — Drizzle ORM Schema (MySQL)
 *
 * Tables:
 *   tasks, task_progress_log, task_comments
 */

import {
  mysqlTable,
  mysqlEnum,
  char,
  varchar,
  int,
  tinyint,
  decimal,
  json,
  timestamp,
  text,
  serial,
  uniqueIndex,
  index,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

// ── Tasks ────────────────────────────────────────

export const tasksTable = mysqlTable(
  "tasks",
  {
    id: char("id", { length: 36 }).primaryKey().notNull(),
    taskCode: varchar("task_code", { length: 50 }).notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    category: varchar("category", { length: 50 }),
    priority: mysqlEnum("priority", [
      "critical",
      "high",
      "medium",
      "low",
    ])
      .notNull()
      .default("medium"),
    status: mysqlEnum("status", [
      "draft",
      "pending",
      "in_progress",
      "blocked",
      "review",
      "approved",
      "completed",
      "cancelled",
    ])
      .notNull()
      .default("pending"),
    assignedRoleId: varchar("assigned_role_id", { length: 50 }),
    assignedNodeId: varchar("assigned_node_id", { length: 255 }),
    assignedBy: varchar("assigned_by", { length: 255 }),
    deadline: timestamp("deadline"),
    dependsOn: json("depends_on"),
    collaborators: json("collaborators"),
    deliverables: json("deliverables"),
    notes: text("notes"),
    expenseAmount: decimal("expense_amount", { precision: 15, scale: 2 }),
    expenseCurrency: varchar("expense_currency", { length: 10 }),
    expenseApproved: tinyint("expense_approved"),
    expenseApprovedBy: varchar("expense_approved_by", { length: 255 }),
    expenseApprovedAt: timestamp("expense_approved_at"),
    resultSummary: text("result_summary"),
    resultData: json("result_data"),
    version: int("version").notNull().default(1),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
    completedAt: timestamp("completed_at"),
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

export const taskProgressLogTable = mysqlTable(
  "task_progress_log",
  {
    id: serial("id").primaryKey(),
    taskId: char("task_id", { length: 36 }).notNull(),
    actor: varchar("actor", { length: 255 }).notNull(),
    action: varchar("action", { length: 50 }).notNull(),
    fromStatus: varchar("from_status", { length: 30 }),
    toStatus: varchar("to_status", { length: 30 }),
    details: json("details"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_progress_task_id").on(table.taskId),
    index("idx_progress_created_at").on(table.createdAt),
  ],
);

// ── Task Comments ────────────────────────────────

export const taskCommentsTable = mysqlTable(
  "task_comments",
  {
    id: char("id", { length: 36 }).primaryKey().notNull(),
    taskId: char("task_id", { length: 36 }).notNull(),
    author: varchar("author", { length: 255 }).notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_comments_task_id").on(table.taskId),
  ],
);
