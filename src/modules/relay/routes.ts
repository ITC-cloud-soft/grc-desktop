/**
 * Relay Module — A2A Protocol Routes
 *
 * Endpoints for inter-node messaging via the Agent-to-Agent relay queue.
 * Nodes send messages, poll their inbox, and acknowledge receipt.
 */

import { Router } from "express";
import type { Express, Request, Response } from "express";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { eq, and, sql } from "drizzle-orm";
import pino from "pino";
import type { GrcConfig } from "../../config.js";
import { createAuthMiddleware } from "../../shared/middleware/auth.js";
import {
  asyncHandler,
  BadRequestError,
  NotFoundError,
} from "../../shared/middleware/error-handler.js";
import { rateLimitMiddleware } from "../../shared/middleware/rate-limit.js";
import { nodeIdSchema } from "../../shared/utils/validators.js";
import { getDb } from "../../shared/db/connection.js";
import { a2aRelayQueueTable } from "./schema.js";

const logger = pino({ name: "module:relay" });

// ── Request Validation Schemas ──────────────────

const relaySendSchema = z.object({
  from_node_id: nodeIdSchema,
  to_node_id: nodeIdSchema,
  message_type: z
    .enum(["text", "task_assignment", "directive", "report", "query"])
    .default("text"),
  subject: z.string().max(500).optional(),
  payload: z.record(z.unknown()),
  priority: z.enum(["critical", "high", "normal", "low"]).default("normal"),
  expires_at: z.string().datetime().optional(),
});

const relayInboxQuerySchema = z.object({
  node_id: nodeIdSchema,
  status: z.enum(["queued", "delivered", "acknowledged", "expired", "failed"]).default("queued"),
});

const relayAckSchema = z.object({
  message_id: z.string().uuid(),
  node_id: nodeIdSchema,
});

// ── Module Registration ─────────────────────────

export async function register(app: Express, config: GrcConfig): Promise<void> {
  const router = Router();
  const authOptional = createAuthMiddleware(config, false);
  const authRequired = createAuthMiddleware(config, true);

  // ────────────────────────────────────────────
  // POST /a2a/relay/send — Send message to another node
  // ────────────────────────────────────────────
  router.post(
    "/relay/send",
    authRequired,
    rateLimitMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const body = relaySendSchema.parse(req.body);
      const db = getDb();

      const id = uuidv4();

      await db.insert(a2aRelayQueueTable).values({
        id,
        fromNodeId: body.from_node_id,
        toNodeId: body.to_node_id,
        messageType: body.message_type,
        subject: body.subject ?? null,
        payload: body.payload,
        priority: body.priority,
        status: "queued",
        expiresAt: body.expires_at ? new Date(body.expires_at) : null,
      });

      logger.debug(
        { id, from: body.from_node_id, to: body.to_node_id, type: body.message_type },
        "Relay message queued",
      );

      res.status(201).json({
        ok: true,
        message_id: id,
        status: "queued",
      });
    }),
  );

  // ────────────────────────────────────────────
  // GET /a2a/relay/inbox — Get pending messages for node
  // Also marks queued messages as 'delivered'
  // ────────────────────────────────────────────
  router.get(
    "/relay/inbox",
    authOptional,
    asyncHandler(async (req: Request, res: Response) => {
      const query = relayInboxQuerySchema.parse(req.query);
      const db = getDb();

      // Fetch messages matching status for this node
      const messages = await db
        .select()
        .from(a2aRelayQueueTable)
        .where(
          and(
            eq(a2aRelayQueueTable.toNodeId, query.node_id),
            eq(a2aRelayQueueTable.status, query.status),
          ),
        )
        .orderBy(
          sql`FIELD(${a2aRelayQueueTable.priority}, 'critical', 'high', 'normal', 'low')`,
          a2aRelayQueueTable.createdAt,
        );

      // If fetching queued messages, mark them as delivered
      if (query.status === "queued" && messages.length > 0) {
        const messageIds = messages.map((m) => m.id);
        await db
          .update(a2aRelayQueueTable)
          .set({
            status: "delivered",
            deliveredAt: new Date(),
          })
          .where(
            and(
              eq(a2aRelayQueueTable.toNodeId, query.node_id),
              eq(a2aRelayQueueTable.status, "queued"),
            ),
          );
      }

      logger.debug(
        { nodeId: query.node_id, count: messages.length },
        "Inbox polled",
      );

      res.json({
        ok: true,
        node_id: query.node_id,
        messages,
        count: messages.length,
      });
    }),
  );

  // ────────────────────────────────────────────
  // POST /a2a/relay/ack — Acknowledge message receipt
  // ────────────────────────────────────────────
  router.post(
    "/relay/ack",
    authRequired,
    asyncHandler(async (req: Request, res: Response) => {
      const body = relayAckSchema.parse(req.body);
      const db = getDb();

      // Verify message exists and belongs to this node
      const rows = await db
        .select()
        .from(a2aRelayQueueTable)
        .where(
          and(
            eq(a2aRelayQueueTable.id, body.message_id),
            eq(a2aRelayQueueTable.toNodeId, body.node_id),
          ),
        )
        .limit(1);

      if (rows.length === 0) {
        throw new NotFoundError("Message");
      }

      const message = rows[0];

      if (message.status === "acknowledged") {
        return res.json({
          ok: true,
          message_id: body.message_id,
          status: "acknowledged",
          already_acknowledged: true,
        });
      }

      await db
        .update(a2aRelayQueueTable)
        .set({
          status: "acknowledged",
          acknowledgedAt: new Date(),
        })
        .where(eq(a2aRelayQueueTable.id, body.message_id));

      logger.debug(
        { messageId: body.message_id, nodeId: body.node_id },
        "Message acknowledged",
      );

      res.json({
        ok: true,
        message_id: body.message_id,
        status: "acknowledged",
      });
    }),
  );

  // ── Mount router under /a2a prefix ────────
  app.use("/a2a", router);

  logger.info("Relay module registered — 3 A2A endpoints active");
}
