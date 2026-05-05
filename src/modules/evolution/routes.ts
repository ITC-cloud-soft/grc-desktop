/**
 * Evolution Pool Module — A2A Protocol Routes
 *
 * Endpoints for Gene/Capsule sharing via the Agent-to-Agent protocol.
 * Compatible with the existing WinClaw A2A client (hubSearch.js).
 */

import { Router } from "express";
import type { Express, Request, Response } from "express";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import pino from "pino";
import type { GrcConfig } from "../../config.js";
import { createAuthMiddleware, requireScopes } from "../../shared/middleware/auth.js";
import { createAdminAuthMiddleware } from "../../shared/middleware/admin-auth.js";
import {
  asyncHandler,
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../shared/middleware/error-handler.js";
import { rateLimitMiddleware } from "../../shared/middleware/rate-limit.js";
import {
  a2aHelloSchema,
  a2aPublishSchema,
  a2aSearchSchema,
  nodeIdSchema,
} from "../../shared/utils/validators.js";
import { eq, and, sql } from "drizzle-orm";
import { getDb } from "../../shared/db/connection.js";
import { EvolutionService, upsertNode } from "./service.js";
import { nodesTable, assetVotesTable } from "./schema.js";
import { a2aRelayQueueTable } from "../relay/schema.js";
import { nodeConfigSSE } from "./node-config-sse.js";
import { RolesService } from "../roles/service.js";
import { AuthService } from "../auth/service.js";
import { unifiedDelivery } from "../../shared/services/unified-delivery.js";
import { getCurrentDialect } from "../../shared/db/dialect.js";
import { signToken, type JwtPayload } from "../../shared/utils/jwt.js";

const logger = pino({ name: "module:evolution" });

// ── Request Validation Schemas ──────────────────

const a2aFetchSchema = z.object({
  asset_id: z.string().min(1).optional(),
  content_hash: z.string().min(1).optional(),
}).refine(
  (data) => data.asset_id || data.content_hash,
  { message: "Either asset_id or content_hash must be provided" },
);

const a2aReportSchema = z.object({
  asset_id: z.string().min(1),
  reporter_node_id: nodeIdSchema,
  success: z.boolean(),
  report_data: z.record(z.unknown()).optional(),
});

const a2aDecisionSchema = z.object({
  asset_id: z.string().min(1),
  decision: z.enum(["approved", "quarantined"]),
  reason: z.string().optional(),
});

const a2aRevokeSchema = z.object({
  asset_id: z.string().min(1),
  node_id: nodeIdSchema,
});

const a2aVoteSchema = z.object({
  asset_id: z.string().min(1),
  voter_node_id: nodeIdSchema,
  vote: z.enum(["upvote", "downvote"]),
  reason: z.string().optional(),
});

const trendingQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

// ── Module Registration ─────────────────────────

export async function register(app: Express, config: GrcConfig): Promise<void> {
  const router = Router();
  const service = new EvolutionService();
  const rolesService = new RolesService();
  const authService = new AuthService(config);
  const authOptional = createAuthMiddleware(config, false);
  const authRequired = createAuthMiddleware(config, true);
  const adminAuth = createAdminAuthMiddleware(config);

  // ────────────────────────────────────────────
  // POST /a2a/hello — Node registration/heartbeat
  // ────────────────────────────────────────────
  router.post(
    "/hello",
    authOptional,
    asyncHandler(async (req: Request, res: Response) => {
      const body = a2aHelloSchema.parse(req.body);

      const node = await upsertNode({
        nodeId: body.node_id,
        capabilities: body.capabilities as Record<string, unknown> | undefined,
        geneCount: body.gene_count,
        envFingerprint: body.env_fingerprint,
        platform: body.platform,
        winclawVersion: body.winclaw_version,
        employeeId: body.employee_id,
        employeeName: body.employee_name,
        employeeEmail: body.employee_email,
        workspacePath: body.workspace_path,
      });

      // Auto-link node to a user record
      const nodeUser = await authService.upsertNodeUser({
        nodeId: body.node_id,
        displayName: body.employee_name,
        email: body.employee_email,
      });

      // Build update set: always link userId, optionally set roleId from employee_role
      const nodeUpdateSet: Record<string, unknown> = { userId: nodeUser.id };
      if (body.employee_role) {
        nodeUpdateSet.roleId = body.employee_role;
      }
      // Update gateway info from reconnecting containers or npm-installed nodes
      if (body.gateway_port || body.gateway_token) {
        const port = body.gateway_port ?? (node as Record<string, unknown>)?.gatewayPort ?? 18789;
        if (body.gateway_port) nodeUpdateSet.gatewayPort = body.gateway_port;
        const gwToken = body.gateway_token ?? "";
        const gwUrl = gwToken
          ? `http://localhost:${port}/chat?token=${gwToken}`
          : `http://localhost:${port}/chat`;
        nodeUpdateSet.gatewayUrl = gwUrl;
      }
      if (body.container_id) {
        nodeUpdateSet.containerId = body.container_id.slice(0, 64);
        // If container_id is present, this is a Docker node
        nodeUpdateSet.provisioningMode = "local_docker";
      }
      await getDb()
        .update(nodesTable)
        .set(nodeUpdateSet)
        .where(eq(nodesTable.nodeId, body.node_id));

      logger.debug({ nodeId: body.node_id, role: body.employee_role, gatewayPort: body.gateway_port, containerId: body.container_id }, "Hello received");

      // Note: company context propagation moved to role_assignment only.
      // Running it on every hello caused an infinite SSE loop:
      // hello → propagate → config_update SSE → node re-syncs → hello → loop

      // ── API Key handling ──────────────────────────
      // A案改良版 (2026-04-22): detect orphaned / mismatched apiKeyId state
      // and auto-reissue so nodes self-heal after winclaw.json loss, offline
      // 剔除/授権 cycles, or DB drift.
      //
      // Decision matrix (nodeRecord.apiKeyId present case):
      //   DB row missing (orphan)          → reissue (status=reissued_orphan)
      //   client header matches DB hash    → active (no rotation)
      //   client header missing / mismatch → reissue (status=rotated)
      //
      // IMPORTANT: do NOT call nodeConfigSSE.pushToNode(...) during reissue.
      //   Past incident (routes.ts:150 comment) — SSE push during hello
      //   caused infinite loop: hello → push → node re-syncs → hello.
      //   The rawKey travels back to the client in this hello response only.
      const nodeRecord = node as Record<string, unknown>;
      const clientApiKey = typeof req.headers["x-api-key"] === "string"
        ? req.headers["x-api-key"] as string
        : undefined;
      let apiKeyResponse: Record<string, unknown> = {};

      if (nodeRecord.apiKeyId) {
        const keyId = nodeRecord.apiKeyId as string;
        try {
          const inspection = await authService.inspectNodeApiKey(keyId, clientApiKey);

          if (!inspection.exists) {
            // Orphan: nodes.api_key_id references a row that no longer exists
            // in api_keys (e.g. admin deleted key directly, or DB restore).
            const { rawKey, keyId: newKeyId } = await authService.reissueApiKeyForNode(
              nodeUser.id,
              body.node_id,
            );
            await getDb()
              .update(nodesTable)
              .set({ apiKeyId: newKeyId, apiKeyAuthorized: 1 as unknown as boolean })
              .where(eq(nodesTable.nodeId, body.node_id));
            apiKeyResponse = {
              api_key: rawKey,
              api_key_status: "reissued_orphan",
              api_key_id: newKeyId,
            };
            logger.warn(
              { nodeId: body.node_id, orphanKeyId: keyId, newKeyId },
              "API key orphaned (DB row missing) — reissued via hello",
            );
          } else if (inspection.matches) {
            // Healthy: client and DB agree. No rotation.
            apiKeyResponse = {
              api_key_status: "active",
              api_key_id: keyId,
            };
          } else {
            // Mismatch: client either has no apiKey in winclaw.json (lost it)
            // or holds a key that doesn't match the current DB hash (stale
            // after 剔除/授権 cycle while offline). Rotate + return fresh rawKey.
            const { rawKey, keyId: newKeyId } = await authService.reissueApiKeyForNode(
              nodeUser.id,
              body.node_id,
            );
            await getDb()
              .update(nodesTable)
              .set({ apiKeyId: newKeyId, apiKeyAuthorized: 1 as unknown as boolean })
              .where(eq(nodesTable.nodeId, body.node_id));
            apiKeyResponse = {
              api_key: rawKey,
              api_key_status: "rotated",
              api_key_id: newKeyId,
            };
            logger.info(
              {
                nodeId: body.node_id,
                oldKeyId: keyId,
                newKeyId,
                reason: clientApiKey ? "client_key_mismatch" : "client_key_missing",
              },
              "API key rotated via hello — client state diverged from DB",
            );
          }
        } catch (err) {
          logger.warn(
            { nodeId: body.node_id, keyId, err },
            "Failed to inspect/reissue API key during hello (keeping existing state)",
          );
          // Fall back to treating it as active so we don't break the hello
          apiKeyResponse = {
            api_key_status: "active",
            api_key_id: keyId,
          };
        }
      } else if (nodeRecord.provisioningMode) {
        // Docker/Daytona node without API Key yet — auto-issue on first hello
        try {
          const { rawKey, keyId } = await authService.issueApiKeyForNode(nodeUser.id, body.node_id);
          await getDb()
            .update(nodesTable)
            .set({ apiKeyId: keyId, apiKeyAuthorized: 1 as unknown as boolean })
            .where(eq(nodesTable.nodeId, body.node_id));
          apiKeyResponse = {
            api_key: rawKey,        // Only time rawKey is sent
            api_key_status: "new",
            api_key_id: keyId,
          };
          logger.info({ nodeId: body.node_id, keyId }, "API key auto-issued for node on first hello");
        } catch (err) {
          logger.warn({ nodeId: body.node_id, err }, "Failed to auto-issue API key for node");
        }
      }

      // Desktop mode (SQLite): issue a JWT with full write scopes so the
      // connecting node can immediately perform write operations without
      // requiring manual tier upgrade or email pairing.
      const dialect = getCurrentDialect();
      if (dialect === "sqlite") {
        const upgradedPayload: JwtPayload = {
          sub: nodeUser.id,
          node_id: body.node_id,
          tier: "free",
          role: "user",
          scopes: ["read", "write", "publish"],
          email: nodeUser.email ?? undefined,
        };
        const upgradedToken = signToken(upgradedPayload, config.jwt);
        const refreshToken = await authService.issueRefreshToken(nodeUser.id);

        logger.info({ nodeId: body.node_id }, "Desktop mode: upgraded token issued via hello");

        return res.json({
          ok: true,
          node_id: body.node_id,
          registered: true,
          node,
          token: upgradedToken,
          refreshToken,
          upgraded: true,
          ...apiKeyResponse,
        });
      }

      res.json({
        ok: true,
        node_id: body.node_id,
        registered: true,
        node,
        ...apiKeyResponse,
      });
    }),
  );

  // ────────────────────────────────────────────
  // POST /a2a/heartbeat — Alias for hello
  // Now includes pending config if revision mismatch detected
  // ────────────────────────────────────────────
  router.post(
    "/heartbeat",
    authOptional,
    asyncHandler(async (req: Request, res: Response) => {
      const body = a2aHelloSchema.parse(req.body);

      const node = await upsertNode({
        nodeId: body.node_id,
        capabilities: body.capabilities as Record<string, unknown> | undefined,
        geneCount: body.gene_count,
        envFingerprint: body.env_fingerprint,
        platform: body.platform,
        winclawVersion: body.winclaw_version,
        employeeId: body.employee_id,
        employeeName: body.employee_name,
        employeeEmail: body.employee_email,
        workspacePath: body.workspace_path,
      });

      // Auto-link node to a user record
      const nodeUser = await authService.upsertNodeUser({
        nodeId: body.node_id,
        displayName: body.employee_name,
        email: body.employee_email,
      });

      const heartbeatUpdateSet: Record<string, unknown> = { userId: nodeUser.id };
      if (body.employee_role) {
        heartbeatUpdateSet.roleId = body.employee_role;
      }
      await getDb()
        .update(nodesTable)
        .set(heartbeatUpdateSet)
        .where(eq(nodesTable.nodeId, body.node_id));

      // Check if there's a pending config update — push it inline
      let pendingConfig = null;
      try {
        const nodeConfig = await rolesService.getNodeConfig(body.node_id);
        const clientRevision = (body as Record<string, unknown>).current_revision as number | undefined;
        if (clientRevision !== undefined && nodeConfig.revision > clientRevision) {
          pendingConfig = {
            revision: nodeConfig.revision,
            role_id: nodeConfig.roleId,
            role_mode: nodeConfig.roleMode,
            files: nodeConfig.files,
            key_config: nodeConfig.key_config,
          };
        }
      } catch {
        // Node may not exist yet in config context; ignore
      }

      // Count pending relay messages for this node
      let pendingMessages = { total: 0, critical: 0 };
      try {
        const db = getDb();
        const pendingRows = await db
          .select({
            priority: a2aRelayQueueTable.priority,
            count: sql<number>`COUNT(*)`,
          })
          .from(a2aRelayQueueTable)
          .where(
            and(
              eq(a2aRelayQueueTable.toNodeId, body.node_id),
              eq(a2aRelayQueueTable.status, "queued"),
            ),
          )
          .groupBy(a2aRelayQueueTable.priority);

        let total = 0;
        let critical = 0;
        for (const row of pendingRows) {
          const count = Number(row.count);
          total += count;
          if (row.priority === "critical") {
            critical = count;
          }
        }
        pendingMessages = { total, critical };
      } catch {
        // Non-critical — don't fail the heartbeat
      }

      res.json({
        ok: true,
        node_id: body.node_id,
        heartbeat: true,
        node,
        pending_messages: pendingMessages,
        ...(pendingConfig ? { config_update: pendingConfig } : {}),
      });
    }),
  );

  // ────────────────────────────────────────────
  // POST /a2a/publish — Publish Gene or Capsule
  // ────────────────────────────────────────────
  router.post(
    "/publish",
    authRequired,
    rateLimitMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const body = a2aPublishSchema.parse(req.body);

      const asset = await service.publishAsset({
        nodeId: body.node_id,
        assetType: body.asset_type,
        assetId: body.asset_id,
        contentHash: body.content_hash,
        payload: body.payload,
        signature: body.signature,
        category: body.category,
      });

      res.status(201).json({
        ok: true,
        asset,
      });
    }),
  );

  // ────────────────────────────────────────────
  // POST /a2a/fetch — Fetch asset by ID or hash
  // ────────────────────────────────────────────
  router.post(
    "/fetch",
    authOptional,
    asyncHandler(async (req: Request, res: Response) => {
      const body = a2aFetchSchema.parse(req.body);

      const key = body.asset_id ?? body.content_hash!;
      const asset = await service.fetchAsset(key);

      if (!asset) {
        throw new NotFoundError("Asset");
      }

      // Record the fetch (increment use_count) only from the A2A endpoint
      await service.recordAssetFetch(key);

      res.json({
        ok: true,
        asset,
      });
    }),
  );

  // ────────────────────────────────────────────
  // POST /a2a/report — Receive usage report
  // ────────────────────────────────────────────
  router.post(
    "/report",
    authRequired,
    rateLimitMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const body = a2aReportSchema.parse(req.body);

      const result = await service.reportUsageFull({
        assetId: body.asset_id,
        reporterNodeId: body.reporter_node_id,
        success: body.success,
        reportData: body.report_data,
      });

      res.json({
        ok: true,
        asset_id: body.asset_id,
        use_count: result.asset.useCount,
        success_rate: result.asset.successRate,
        status: result.asset.status,
        promotion_check: result.promotionResult,
      });
    }),
  );

  // ────────────────────────────────────────────
  // POST /a2a/vote — Vote on an asset (gene/capsule)
  // ────────────────────────────────────────────
  router.post(
    "/vote",
    authRequired,
    rateLimitMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const body = a2aVoteSchema.parse(req.body);
      const db = getDb();

      // Look up the asset to determine type and owner
      const asset = await service.fetchAsset(body.asset_id);
      if (!asset) {
        throw new NotFoundError("Asset");
      }

      // Cannot vote on your own asset
      if (asset.nodeId === body.voter_node_id) {
        throw new BadRequestError("Cannot vote on your own asset");
      }

      // Check unique constraint — one vote per asset per voter
      const existing = await db
        .select({ id: assetVotesTable.id })
        .from(assetVotesTable)
        .where(
          and(
            eq(assetVotesTable.assetId, body.asset_id),
            eq(assetVotesTable.voterNodeId, body.voter_node_id),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        throw new ConflictError("Already voted on this asset");
      }

      const voteId = uuidv4();
      await db.insert(assetVotesTable).values({
        id: voteId,
        assetId: body.asset_id,
        assetType: asset.type as "gene" | "capsule",
        voterNodeId: body.voter_node_id,
        vote: body.vote,
        reason: body.reason ?? null,
      });

      logger.info(
        { assetId: body.asset_id, voterNodeId: body.voter_node_id, vote: body.vote },
        "Asset vote recorded",
      );

      res.status(201).json({
        ok: true,
        vote_id: voteId,
      });
    }),
  );

  // ────────────────────────────────────────────
  // POST /a2a/decision — Admin decision on asset
  // ────────────────────────────────────────────
  router.post(
    "/decision",
    authRequired,
    adminAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const body = a2aDecisionSchema.parse(req.body);

      await service.updateStatus(
        body.asset_id,
        body.decision,
        body.reason,
      );

      res.json({
        ok: true,
        asset_id: body.asset_id,
        decision: body.decision,
        reason: body.reason ?? null,
      });
    }),
  );

  // ────────────────────────────────────────────
  // POST /a2a/revoke — Revoke a published asset
  // ────────────────────────────────────────────
  router.post(
    "/revoke",
    authRequired,
    asyncHandler(async (req: Request, res: Response) => {
      const body = a2aRevokeSchema.parse(req.body);

      await service.revokeAsset(body.asset_id, body.node_id);

      res.json({
        ok: true,
        asset_id: body.asset_id,
        revoked: true,
      });
    }),
  );

  // ────────────────────────────────────────────
  // GET /a2a/assets/search — Search assets
  // Compatible with: ?signals=error,timeout&status=promoted&limit=20
  // ────────────────────────────────────────────
  router.get(
    "/assets/search",
    authOptional,
    asyncHandler(async (req: Request, res: Response) => {
      // Parse signals from comma-separated string (hubSearch.js client format)
      const rawSignals = req.query.signals as string | undefined;
      const signals = rawSignals
        ? rawSignals.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined;

      const parsed = a2aSearchSchema.parse({
        signals,
        status: req.query.status,
        type: req.query.type,
        gene_asset_id: req.query.gene_asset_id,
        limit: req.query.limit,
        offset: req.query.offset,
      });

      const result = await service.searchAssets({
        signals: parsed.signals,
        status: parsed.status,
        type: parsed.type,
        geneAssetId: parsed.gene_asset_id,
        limit: parsed.limit,
        offset: parsed.offset,
      });

      res.json({
        ok: true,
        assets: result.assets,
        total: result.total,
        limit: parsed.limit,
        offset: parsed.offset,
      });
    }),
  );

  // ────────────────────────────────────────────
  // GET /a2a/assets/trending — Top assets by use_count
  // ────────────────────────────────────────────
  router.get(
    "/assets/trending",
    authOptional,
    asyncHandler(async (req: Request, res: Response) => {
      const { limit } = trendingQuerySchema.parse(req.query);
      const assets = await service.getTrending(limit);

      res.json({
        ok: true,
        assets,
        limit,
      });
    }),
  );

  // ────────────────────────────────────────────
  // GET /a2a/assets/stats — Statistics overview
  // ────────────────────────────────────────────
  router.get(
    "/assets/stats",
    authOptional,
    asyncHandler(async (_req: Request, res: Response) => {
      const stats = await service.getStats();

      res.json({
        ok: true,
        stats,
      });
    }),
  );

  // ────────────────────────────────────────────
  // GET /a2a/config/stream — SSE stream for real-time config push
  // Node connects once; server pushes config_update events.
  // ────────────────────────────────────────────
  router.get(
    "/config/stream",
    authOptional,
    asyncHandler(async (req: Request, res: Response) => {
      const nodeId = req.query.node_id as string;
      if (!nodeId || nodeId.length < 10) {
        res.status(400).json({ ok: false, error: "node_id query parameter required" });
        return;
      }

      // API Key query parameter authentication for SSE
      // (EventSource cannot set custom headers, so api_key is passed as query param)
      // NOTE: If the API key is invalid/revoked, we still allow the SSE connection
      // so that the node can receive api_key_authorized events when admin authorizes it.
      const apiKeyParam = req.query.api_key as string | undefined;
      if (apiKeyParam && !req.auth?.sub) {
        const resolved = await authService.resolveApiKey(apiKeyParam);
        if (resolved) {
          // Attach resolved auth to request so downstream logic can use it
          (req as any).auth = { sub: resolved.userId, tier: resolved.tier, scopes: resolved.scopes };
        }
        // If key is invalid, continue without auth — SSE is authOptional
      }

      // Set SSE headers
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // Nginx: disable proxy buffering
      });

      // Send initial connected event
      res.write(`event: connected\ndata: ${JSON.stringify({ node_id: nodeId })}\n\n`);

      // If there's a pending config, push it immediately on connect
      try {
        const nodeConfig = await rolesService.getNodeConfig(nodeId);
        // Always send current config on SSE connect so node gets latest state
        const initEvent = {
          revision: nodeConfig.revision,
          reason: "sse_connect",
          config: {
            role_id: nodeConfig.roleId,
            role_mode: nodeConfig.roleMode,
            files: nodeConfig.files,
            key_config: nodeConfig.key_config,
          },
        };
        res.write(`event: config_update\ndata: ${JSON.stringify(initEvent)}\n\n`);
      } catch {
        // Node not found in DB — that's okay, it may register later
      }

      // Register SSE connection
      nodeConfigSSE.addConnection(nodeId, res);

      // Replay pending relay messages on reconnect
      try {
        const replayed = await unifiedDelivery.replayPendingMessages(nodeId);
        if (replayed > 0) {
          logger.info({ nodeId, replayed }, "Replayed pending relay messages on SSE reconnect");
        }
      } catch (replayErr) {
        logger.warn({ nodeId, err: replayErr }, "Failed to replay pending messages");
      }

      // Clean up on disconnect
      req.on("close", () => {
        nodeConfigSSE.removeConnection(nodeId, res);
      });
    }),
  );

  // ────────────────────────────────────────────
  // GET /a2a/config/stream/stats — SSE connection stats (admin)
  // ────────────────────────────────────────────
  router.get(
    "/config/stream/stats",
    authRequired,
    adminAuth,
    asyncHandler(async (_req: Request, res: Response) => {
      const stats = nodeConfigSSE.getStats();
      res.json({
        ok: true,
        ...stats,
        connected_nodes: nodeConfigSSE.getConnectedNodeIds(),
      });
    }),
  );

  // ── Mount router under /a2a prefix ────────
  app.use("/a2a", router);

  logger.info("Evolution Pool module registered — 12 A2A endpoints active (incl. SSE)");
}
