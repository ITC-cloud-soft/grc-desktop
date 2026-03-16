/**
 * Tasks Module — A2A Protocol Routes (Agent-Facing)
 *
 * Endpoints for agents to query and update their assigned tasks.
 * All routes are under /a2a/tasks/*.
 */

import { Router } from "express";
import type { Express, Request, Response } from "express";
import { z } from "zod";
import pino from "pino";
import type { GrcConfig } from "../../config.js";
import { createAuthMiddleware } from "../../shared/middleware/auth.js";
import { asyncHandler, BadRequestError } from "../../shared/middleware/error-handler.js";
import { rateLimitMiddleware } from "../../shared/middleware/rate-limit.js";
import { TasksService } from "./service.js";

const logger = pino({ name: "module:tasks" });

// ── Request Validation Schemas ──────────────────

const nudgeTaskSchema = z.object({
  task_code: z.string().min(1).max(50),
  nudger_node_id: z.string().min(1).max(255),
  nudger_role_id: z.string().min(1).max(50),
  message: z.string().max(1000).optional(),
  escalation_level: z.enum(["gentle", "urgent", "escalate"]).default("gentle"),
});

const taskUpdateSchema = z.object({
  task_id: z.string().uuid(),
  node_id: z.string().min(1),
  status: z.string().optional(),
  result_summary: z.string().optional(),
  result_data: z.record(z.unknown()).optional(),
});

const taskCommentSchema = z.object({
  task_id: z.string().uuid(),
  node_id: z.string().min(1),
  content: z.string().min(1),
});

const agentCreateTaskSchema = z.object({
  creator_role_id: z.string().min(1).max(50),
  creator_node_id: z.string().min(1).max(255),
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  category: z.enum(["strategic", "operational", "administrative", "expense"]).optional(),
  priority: z.enum(["critical", "high", "medium", "low"]).optional(),
  target_role_id: z.string().max(50).optional(),
  target_node_id: z.string().max(255).optional(),
  trigger_type: z.enum(["heartbeat", "task_chain", "strategy", "meeting", "escalation"]),
  trigger_source: z.string().optional(),
  expense_amount: z.string().max(30).optional(),
  expense_currency: z.string().max(10).optional(),
  deadline: z.string().datetime().optional(),
  deliverables: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

// ── Module Registration ─────────────────────────

export async function register(app: Express, config: GrcConfig): Promise<void> {
  const router = Router();
  const service = new TasksService();
  const authRequired = createAuthMiddleware(config, true);

  // ────────────────────────────────────────────
  // GET /a2a/tasks/mine?node_id=xxx — Get tasks for this node
  // ────────────────────────────────────────────
  router.get(
    "/mine",
    authRequired,
    asyncHandler(async (req: Request, res: Response) => {
      const nodeId = z.string().min(1).parse(req.query.node_id);
      const tasks = await service.getTasksForNode(nodeId);

      res.json({
        ok: true,
        tasks,
        count: tasks.length,
      });
    }),
  );

  // ────────────────────────────────────────────
  // GET /a2a/tasks/pending?node_id=xxx&role_id=yyy — Get actionable tasks for this node
  // ────────────────────────────────────────────
  router.get(
    "/pending",
    authRequired,
    asyncHandler(async (req: Request, res: Response) => {
      const nodeId = z.string().min(1).parse(req.query.node_id);
      const roleId = req.query.role_id
        ? z.string().min(1).parse(req.query.role_id)
        : undefined;

      const tasks = await service.getPendingTasksForNode(nodeId, roleId);

      res.json({
        ok: true,
        tasks,
        count: tasks.length,
      });
    }),
  );

  // ────────────────────────────────────────────
  // POST /a2a/tasks/update — Update task status/result from agent
  // ────────────────────────────────────────────
  router.post(
    "/update",
    authRequired,
    asyncHandler(async (req: Request, res: Response) => {
      const body = taskUpdateSchema.parse(req.body);

      // Verify the requesting node is either the assignee or the creator
      const task = await service.getTask(body.task_id);
      let isAssignee = task.assignedNodeId === body.node_id;
      const isCreator = task.creatorNodeId === body.node_id;

      // Role-based assignment: if no specific node assigned, check if node's role matches
      if (!isAssignee && !task.assignedNodeId && task.assignedRoleId) {
        const nodeRole = await service.getNodeRoleId(body.node_id);
        if (nodeRole && nodeRole === task.assignedRoleId) {
          isAssignee = true;
        }
      }

      if (!isAssignee && !isCreator) {
        throw new BadRequestError(
          "Task is not assigned to or created by this node",
        );
      }

      // Scope check: creator can only accept/reject (review phase operations)
      // assignee can update status and results (execution phase operations)
      if (!isAssignee && isCreator && body.status) {
        const creatorAllowedStatuses = ["approved", "completed", "in_progress"];
        if (!creatorAllowedStatuses.includes(body.status)) {
          throw new BadRequestError(
            `Creator node can only set status to: ${creatorAllowedStatuses.join(", ")}`,
          );
        }
      }

      // Self-review prevention: if the same node is both creator and assignee,
      // it cannot approve its own work — must be reviewed by a superior (e.g., CEO).
      // Exception: if the node is the assignee due to review handoff (creator assigned
      // the task to another role/node, and it was reassigned back to creator for review),
      // then approval is allowed — the creator is acting as reviewer, not self-reviewing.
      if (isAssignee && isCreator && body.status === "approved" && task.status === "review") {
        // Check if this is a review handoff (task was assigned to a different role originally)
        const isReviewHandoff = task.assignedRoleId && task.assignedRoleId !== await service.getNodeRoleId(body.node_id);
        if (!isReviewHandoff) {
          throw new BadRequestError(
            "Self-review not allowed: you cannot approve a task you created and executed. " +
            "A superior (e.g., CEO) must review and approve this task.",
          );
        }
      }

      // Change status if provided
      if (body.status) {
        await service.changeStatus(body.task_id, body.status, body.node_id);
      }

      // Update result data if provided
      if (body.result_summary !== undefined || body.result_data !== undefined) {
        // Re-fetch task to get current version after potential status change
        const current = body.status ? await service.getTask(body.task_id) : task;
        await service.updateTask(
          body.task_id,
          {
            resultSummary: body.result_summary,
            resultData: body.result_data,
            version: current.version,
          },
          body.node_id,
        );
      }

      // Fetch the final state
      const updated = await service.getTask(body.task_id);

      res.json({
        ok: true,
        task: updated,
      });
    }),
  );

  // ────────────────────────────────────────────
  // POST /a2a/tasks/comment — Add comment from agent
  // ────────────────────────────────────────────
  router.post(
    "/comment",
    authRequired,
    asyncHandler(async (req: Request, res: Response) => {
      const body = taskCommentSchema.parse(req.body);

      const comment = await service.addComment(
        body.task_id,
        body.node_id,
        body.content,
      );

      res.json({
        ok: true,
        comment,
      });
    }),
  );

  // ────────────────────────────────────────────
  // POST /a2a/tasks/create — Agent autonomous task creation
  // ────────────────────────────────────────────
  router.post(
    "/create",
    authRequired,
    asyncHandler(async (req: Request, res: Response) => {
      const body = agentCreateTaskSchema.parse(req.body);

      const result = await service.createAgentTask({
        creatorRoleId: body.creator_role_id,
        creatorNodeId: body.creator_node_id,
        title: body.title,
        description: body.description,
        category: body.category,
        priority: body.priority,
        targetRoleId: body.target_role_id,
        targetNodeId: body.target_node_id,
        triggerType: body.trigger_type,
        triggerSource: body.trigger_source,
        expenseAmount: body.expense_amount,
        expenseCurrency: body.expense_currency,
        deadline: body.deadline,
        deliverables: body.deliverables,
        notes: body.notes,
      });

      res.status(201).json({
        ok: true,
        task: result.task,
        policy_applied: result.policy_applied,
      });
    }),
  );

  // ────────────────────────────────────────────
  // POST /a2a/tasks/batch — Batch create multiple tasks
  // ────────────────────────────────────────────
  const batchCreateTaskSchema = z.object({
    creator_role_id: z.string().min(1).max(50),
    creator_node_id: z.string().min(1).max(255),
    trigger_type: z.enum([
      "heartbeat",
      "task_chain",
      "strategy",
      "meeting",
      "escalation",
    ]),
    trigger_source: z.string().optional(),
    tasks: z
      .array(
        z.object({
          title: z.string().min(1).max(500),
          description: z.string().optional(),
          category: z
            .enum(["strategic", "operational", "administrative", "expense"])
            .optional(),
          priority: z.enum(["critical", "high", "medium", "low"]).optional(),
          target_role_id: z.string().max(50).optional(),
          target_node_id: z.string().max(255).optional(),
          expense_amount: z.string().max(30).optional(),
          expense_currency: z.string().max(10).optional(),
          deadline: z.string().datetime().optional(),
          deliverables: z.array(z.string()).optional(),
          notes: z.string().optional(),
        }),
      )
      .min(1)
      .max(20),
  });

  router.post(
    "/batch",
    authRequired,
    rateLimitMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const body = batchCreateTaskSchema.parse(req.body);

      const result = await service.createAgentTaskBatch({
        creatorRoleId: body.creator_role_id,
        creatorNodeId: body.creator_node_id,
        triggerType: body.trigger_type,
        triggerSource: body.trigger_source,
        tasks: body.tasks.map((t) => ({
          title: t.title,
          description: t.description,
          category: t.category,
          priority: t.priority,
          targetRoleId: t.target_role_id,
          targetNodeId: t.target_node_id,
          expenseAmount: t.expense_amount,
          expenseCurrency: t.expense_currency,
          deadline: t.deadline,
          deliverables: t.deliverables,
          notes: t.notes,
        })),
      });

      const status = result.summary.failed === result.summary.total ? 400 : 201;
      res.status(status).json({ ok: result.summary.created > 0, ...result });
    }),
  );

  // ────────────────────────────────────────────
  // POST /a2a/tasks/nudge — Send a reminder/nudge about a pending task
  // ────────────────────────────────────────────
  router.post(
    "/nudge",
    authRequired,
    rateLimitMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const body = nudgeTaskSchema.parse(req.body);

      const result = await service.nudgeTask({
        taskCode: body.task_code,
        nudgerNodeId: body.nudger_node_id,
        nudgerRoleId: body.nudger_role_id,
        message: body.message,
        escalationLevel: body.escalation_level,
      });

      res.json({ ok: true, ...result });
    }),
  );

  // ── Mount router under /a2a/tasks prefix ───
  app.use("/a2a/tasks", router);

  logger.info("Tasks module registered — 7 A2A endpoints active");
}
