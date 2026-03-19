/**
 * Messaging Module — API Routes
 *
 * Async message queue endpoints for inter-node communication.
 *
 *   POST /a2a/messages/enqueue        — Add message to queue
 *   GET  /a2a/messages/pending/:nodeId — Get pending messages for a node
 *   POST /a2a/messages/:id/deliver    — Mark as delivered
 *   POST /a2a/messages/:id/read       — Mark as read
 *   GET  /a2a/messages/stats          — Queue statistics
 */

import { Router } from "express";
import type { Express, Request, Response } from "express";
import { z } from "zod";
import pino from "pino";
import type { GrcConfig } from "../../config.js";
import { createAuthMiddleware } from "../../shared/middleware/auth.js";
import {
  asyncHandler,
  BadRequestError,
} from "../../shared/middleware/error-handler.js";
import { rateLimitMiddleware } from "../../shared/middleware/rate-limit.js";
import { nodeIdSchema } from "../../shared/utils/validators.js";
import { getMessagingService } from "./service.js";

const logger = pino({ name: "module:messaging" });

// ── Request Validation Schemas ──────────────────

const enqueueSchema = z.object({
  from_node_id: nodeIdSchema,
  to_node_id: nodeIdSchema.optional(),
  to_role_id: z.string().min(1).max(50).optional(),
  message_type: z
    .enum(["text", "task", "directive", "report", "query", "alert", "system"])
    .default("text"),
  subject: z.string().max(255).optional(),
  body: z.string().max(50_000).optional(),
  priority: z.enum(["critical", "high", "normal", "low"]).default("normal"),
}).refine(
  (data) => data.to_node_id || data.to_role_id,
  { message: "At least one of to_node_id or to_role_id must be provided" },
);

const pendingQuerySchema = z.object({
  role_ids: z.string().optional(), // comma-separated role IDs
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const messageIdParamSchema = z.object({
  id: z.string().uuid(),
});

// ── Registration ────────────────────────────────

export async function register(
  app: Express,
  config: GrcConfig,
): Promise<void> {
  const router = Router();
  const authRequired = createAuthMiddleware(config, true);

  // ── POST /enqueue — Add message to queue ──────
  router.post(
    "/enqueue",
    authRequired,
    rateLimitMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const body = enqueueSchema.parse(req.body);
      const service = getMessagingService();

      const message = await service.enqueue({
        fromNodeId: body.from_node_id,
        toNodeId: body.to_node_id,
        toRoleId: body.to_role_id,
        messageType: body.message_type,
        subject: body.subject,
        body: body.body,
        priority: body.priority,
      });

      res.status(201).json({
        ok: true,
        message_id: message.id,
        status: message.status,
        created_at: message.createdAt,
      });
    }),
  );

  // ── GET /pending/:nodeId — Get pending messages ──
  router.get(
    "/pending/:nodeId",
    authRequired,
    asyncHandler(async (req: Request, res: Response) => {
      const nodeId = nodeIdSchema.parse(req.params.nodeId);
      const callerNodeId = (req as any).nodeId ?? (req as any).user?.node_id;
      const callerRole = (req as any).user?.role;

      // Authorization: caller must own this nodeId or be admin
      if (callerNodeId !== nodeId && callerRole !== "admin") {
        throw new BadRequestError("Not authorized to read messages for this node");
      }

      const query = pendingQuerySchema.parse(req.query);
      const service = getMessagingService();

      const roleIds = query.role_ids
        ? query.role_ids.split(",").map((r) => r.trim()).filter(Boolean)
        : undefined;

      const messages = await service.getPending({
        nodeId,
        roleIds,
        limit: query.limit,
      });

      res.json({
        ok: true,
        messages: messages.map((m) => ({
          id: m.id,
          from_node_id: m.fromNodeId,
          to_node_id: m.toNodeId,
          to_role_id: m.toRoleId,
          message_type: m.messageType,
          subject: m.subject,
          body: m.body,
          priority: m.priority,
          status: m.status,
          created_at: m.createdAt,
        })),
        count: messages.length,
      });
    }),
  );

  // ── POST /:id/deliver — Mark as delivered ─────
  router.post(
    "/:id/deliver",
    authRequired,
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = messageIdParamSchema.parse(req.params);
      const service = getMessagingService();

      // Verify caller is the intended recipient
      const callerNodeId = (req as any).nodeId ?? (req as any).user?.node_id;
      const existing = await service.getById(id);
      if (existing && callerNodeId && existing.toNodeId !== callerNodeId && (req as any).user?.role !== "admin") {
        throw new BadRequestError("Not authorized to update this message");
      }

      const message = await service.markDelivered(id);

      res.json({
        ok: true,
        message_id: message.id,
        status: message.status,
        delivered_at: message.deliveredAt,
      });
    }),
  );

  // ── POST /:id/read — Mark as read ────────────
  router.post(
    "/:id/read",
    authRequired,
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = messageIdParamSchema.parse(req.params);
      const service = getMessagingService();

      // Verify caller is the intended recipient
      const callerNodeId = (req as any).nodeId ?? (req as any).user?.node_id;
      const existing = await service.getById(id);
      if (existing && callerNodeId && existing.toNodeId !== callerNodeId && (req as any).user?.role !== "admin") {
        throw new BadRequestError("Not authorized to update this message");
      }

      const message = await service.markRead(id);

      res.json({
        ok: true,
        message_id: message.id,
        status: message.status,
        read_at: message.readAt,
      });
    }),
  );

  // ── GET /stats — Queue statistics ─────────────
  router.get(
    "/stats",
    authRequired,
    asyncHandler(async (_req: Request, res: Response) => {
      const service = getMessagingService();
      const stats = await service.getStats();

      res.json({ ok: true, stats });
    }),
  );

  // ── Mount ─────────────────────────────────────
  app.use("/a2a/messages", router);
  logger.info("Messaging queue routes registered — 5 endpoints active");
}
