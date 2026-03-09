/**
 * Model-Keys Module — Admin Routes
 *
 * Provides admin-only management endpoints for AI model API keys
 * and node key assignment.
 * All routes require JWT authentication + admin role.
 */

import { Router } from "express";
import type { Express, Request, Response } from "express";
import { z } from "zod";
import pino from "pino";
import type { GrcConfig } from "../../config.js";
import { createAuthMiddleware } from "../../shared/middleware/auth.js";
import { createAdminAuthMiddleware } from "../../shared/middleware/admin-auth.js";
import {
  asyncHandler,
} from "../../shared/middleware/error-handler.js";
import { paginationSchema } from "../../shared/utils/validators.js";
import { ModelKeysService } from "./service.js";

const logger = pino({ name: "admin:model-keys" });

// ── Zod Schemas ─────────────────────────────────

const keyListQuerySchema = paginationSchema.extend({
  category: z.enum(["primary", "auxiliary"]).optional(),
  provider: z.string().optional(),
});

const createKeySchema = z.object({
  category: z.enum(["primary", "auxiliary"]),
  name: z.string().min(1).max(100),
  provider: z.string().min(1).max(50),
  model_name: z.string().min(1).max(100),
  api_key: z.string().min(1),
  base_url: z.string().max(500).optional(),
  notes: z.string().optional(),
});

const updateKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  provider: z.string().min(1).max(50).optional(),
  model_name: z.string().min(1).max(100).optional(),
  api_key: z.string().min(1).optional(),
  base_url: z.string().max(500).nullable().optional(),
  notes: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
});

const assignKeysSchema = z.object({
  primary_key_id: z.string().nullable().optional(),
  auxiliary_key_id: z.string().nullable().optional(),
});

// ── Admin Module Registration ────────────────────

export async function registerAdmin(
  app: Express,
  config: GrcConfig,
): Promise<void> {
  const router = Router();
  const nodeRouter = Router();
  const service = new ModelKeysService();
  const authRequired = createAuthMiddleware(config, true);
  const adminRequired = createAdminAuthMiddleware(config);

  // ────────────────────────────────────────────
  // GET /api/v1/admin/model-keys — List model keys
  // ────────────────────────────────────────────
  router.get(
    "/",
    authRequired,
    adminRequired,
    asyncHandler(async (req: Request, res: Response) => {
      const query = keyListQuerySchema.parse(req.query);
      const result = await service.listKeys({
        category: query.category,
        provider: query.provider,
        page: query.page,
        limit: query.limit,
      });
      res.json(result);
    }),
  );

  // ────────────────────────────────────────────
  // POST /api/v1/admin/model-keys — Create model key
  // ────────────────────────────────────────────
  router.post(
    "/",
    authRequired,
    adminRequired,
    asyncHandler(async (req: Request, res: Response) => {
      const body = createKeySchema.parse(req.body);
      const user = (req as unknown as Record<string, unknown>).user as
        | { email?: string }
        | undefined;
      const key = await service.createKey({
        ...body,
        created_by: user?.email ?? "",
      });
      res.status(201).json({ key });
    }),
  );

  // ────────────────────────────────────────────
  // GET /api/v1/admin/model-keys/:id — Get key detail
  // ────────────────────────────────────────────
  router.get(
    "/:id",
    authRequired,
    adminRequired,
    asyncHandler(async (req: Request, res: Response) => {
      const key = await service.getKey(req.params.id as string);
      res.json({ key });
    }),
  );

  // ────────────────────────────────────────────
  // PUT /api/v1/admin/model-keys/:id — Update key
  // ────────────────────────────────────────────
  router.put(
    "/:id",
    authRequired,
    adminRequired,
    asyncHandler(async (req: Request, res: Response) => {
      const body = updateKeySchema.parse(req.body);
      const key = await service.updateKey(req.params.id as string, body);
      res.json({ key });
    }),
  );

  // ────────────────────────────────────────────
  // DELETE /api/v1/admin/model-keys/:id — Delete key
  // ────────────────────────────────────────────
  router.delete(
    "/:id",
    authRequired,
    adminRequired,
    asyncHandler(async (req: Request, res: Response) => {
      await service.deleteKey(req.params.id as string);
      res.json({ ok: true });
    }),
  );

  // ────────────────────────────────────────────
  // Node key assignment routes
  // ────────────────────────────────────────────

  // POST /api/v1/admin/nodes/:nodeId/assign-keys
  nodeRouter.post(
    "/:nodeId/assign-keys",
    authRequired,
    adminRequired,
    asyncHandler(async (req: Request, res: Response) => {
      const body = assignKeysSchema.parse(req.body);
      const result = await service.assignKeysToNode(
        req.params.nodeId as string,
        body.primary_key_id,
        body.auxiliary_key_id,
      );
      res.json({ ok: true, node: result });
    }),
  );

  // POST /api/v1/admin/nodes/:nodeId/unassign-keys
  nodeRouter.post(
    "/:nodeId/unassign-keys",
    authRequired,
    adminRequired,
    asyncHandler(async (req: Request, res: Response) => {
      const result = await service.unassignKeysFromNode(req.params.nodeId as string);
      res.json({ ok: true, node: result });
    }),
  );

  // GET /api/v1/admin/nodes/:nodeId/assigned-keys
  nodeRouter.get(
    "/:nodeId/assigned-keys",
    authRequired,
    adminRequired,
    asyncHandler(async (req: Request, res: Response) => {
      const result = await service.getNodeAssignedKeys(req.params.nodeId as string);
      res.json(result);
    }),
  );

  // ── Mount routers ──────────────────────────
  app.use("/api/v1/admin/model-keys", router);
  app.use("/api/v1/admin/nodes", nodeRouter);

  logger.info(
    "Model-keys admin routes registered — 5 key endpoints + 3 node assignment endpoints",
  );
}
