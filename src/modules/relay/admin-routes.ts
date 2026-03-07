/**
 * Relay Module — Admin Routes
 *
 * Provides admin-only management endpoints for the A2A relay queue.
 * All routes require JWT authentication + admin role.
 */

import { Router } from "express";
import type { Express, Request, Response } from "express";
import { z } from "zod";
import { eq, desc, sql, and, lte } from "drizzle-orm";
import pino from "pino";
import type { GrcConfig } from "../../config.js";
import { createAuthMiddleware } from "../../shared/middleware/auth.js";
import { createAdminAuthMiddleware } from "../../shared/middleware/admin-auth.js";
import { asyncHandler, NotFoundError } from "../../shared/middleware/error-handler.js";
import { getDb } from "../../shared/db/connection.js";
import { uuidSchema, paginationSchema } from "../../shared/utils/validators.js";
import { a2aRelayQueueTable } from "./schema.js";

const logger = pino({ name: "admin:relay" });

// ── Zod Schemas ─────────────────────────────────

const relayListQuerySchema = paginationSchema.extend({
  status: z.enum(["queued", "delivered", "acknowledged", "expired", "failed"]).optional(),
  from_node: z.string().optional(),
  to_node: z.string().optional(),
});

// ── Route Registration ──────────────────────────

export async function registerAdmin(app: Express, config: GrcConfig) {
  const router = Router();
  const requireAuth = createAuthMiddleware(config);
  const requireAdmin = createAdminAuthMiddleware(config);

  // ── GET /relay — List all relay messages (paginated, filterable) ──

  router.get(
    "/relay",
    requireAuth, requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const query = relayListQuerySchema.parse(req.query);
      const db = getDb();
      const offset = (query.page - 1) * query.limit;

      const conditions = [];
      if (query.status) conditions.push(eq(a2aRelayQueueTable.status, query.status));
      if (query.from_node) conditions.push(eq(a2aRelayQueueTable.fromNodeId, query.from_node));
      if (query.to_node) conditions.push(eq(a2aRelayQueueTable.toNodeId, query.to_node));
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, totalResult] = await Promise.all([
        db
          .select()
          .from(a2aRelayQueueTable)
          .where(whereClause)
          .orderBy(desc(a2aRelayQueueTable.createdAt))
          .limit(query.limit)
          .offset(offset),
        db
          .select({ count: sql<number>`COUNT(*)` })
          .from(a2aRelayQueueTable)
          .where(whereClause),
      ]);

      const total = totalResult[0]?.count ?? 0;

      res.json({
        data: rows,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      });
    }),
  );

  // ── GET /relay/stats — Message statistics ──

  router.get(
    "/relay/stats",
    requireAuth, requireAdmin,
    asyncHandler(async (_req: Request, res: Response) => {
      const db = getDb();

      const [
        totalResult,
        byStatusResult,
        byTypeResult,
      ] = await Promise.all([
        db
          .select({ count: sql<number>`COUNT(*)` })
          .from(a2aRelayQueueTable),
        db
          .select({
            status: a2aRelayQueueTable.status,
            count: sql<number>`COUNT(*)`,
          })
          .from(a2aRelayQueueTable)
          .groupBy(a2aRelayQueueTable.status),
        db
          .select({
            messageType: a2aRelayQueueTable.messageType,
            count: sql<number>`COUNT(*)`,
          })
          .from(a2aRelayQueueTable)
          .groupBy(a2aRelayQueueTable.messageType),
      ]);

      const total = totalResult[0]?.count ?? 0;

      const byStatus = byStatusResult.reduce(
        (acc, row) => {
          acc[row.status] = row.count;
          return acc;
        },
        {} as Record<string, number>,
      );

      const byType = byTypeResult.reduce(
        (acc, row) => {
          acc[row.messageType] = row.count;
          return acc;
        },
        {} as Record<string, number>,
      );

      res.json({
        stats: {
          total,
          byStatus,
          byType,
        },
      });
    }),
  );

  // ── GET /relay/:id — Get single message detail ──

  router.get(
    "/relay/:id",
    requireAuth, requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const db = getDb();
      const id = uuidSchema.parse(req.params.id);

      const rows = await db
        .select()
        .from(a2aRelayQueueTable)
        .where(eq(a2aRelayQueueTable.id, id))
        .limit(1);

      if (rows.length === 0) {
        throw new NotFoundError("Message");
      }

      res.json({ data: rows[0] });
    }),
  );

  // ── DELETE /relay/:id — Delete message ──

  router.delete(
    "/relay/:id",
    requireAuth, requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const db = getDb();
      const id = uuidSchema.parse(req.params.id);

      const rows = await db
        .select({ id: a2aRelayQueueTable.id })
        .from(a2aRelayQueueTable)
        .where(eq(a2aRelayQueueTable.id, id))
        .limit(1);

      if (rows.length === 0) {
        throw new NotFoundError("Message");
      }

      await db
        .delete(a2aRelayQueueTable)
        .where(eq(a2aRelayQueueTable.id, id));

      logger.info({ messageId: id, admin: req.auth?.sub }, "Relay message deleted by admin");

      res.json({ ok: true, deleted: id });
    }),
  );

  // ── POST /relay/cleanup — Cleanup expired messages ──

  router.post(
    "/relay/cleanup",
    requireAuth, requireAdmin,
    asyncHandler(async (_req: Request, res: Response) => {
      const db = getDb();
      const now = new Date();

      // Mark expired messages
      const expiredResult = await db
        .update(a2aRelayQueueTable)
        .set({ status: "expired" })
        .where(
          and(
            lte(a2aRelayQueueTable.expiresAt, now),
            eq(a2aRelayQueueTable.status, "queued"),
          ),
        );

      // Delete all expired and failed messages older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      await db
        .delete(a2aRelayQueueTable)
        .where(
          and(
            sql`${a2aRelayQueueTable.status} IN ('expired', 'failed')`,
            lte(a2aRelayQueueTable.createdAt, thirtyDaysAgo),
          ),
        );

      logger.info("Relay queue cleanup completed");

      res.json({
        ok: true,
        cleaned: true,
      });
    }),
  );

  // ── Mount ─────────────────────────────────────

  app.use("/api/v1/admin", router);
  logger.info("Relay admin routes registered");
}
