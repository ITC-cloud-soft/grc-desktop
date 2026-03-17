/**
 * Community A2A Routes — Tool endpoints for AI agents
 *
 * Simplified endpoints that agents call via their A2A tool interface:
 *   POST /a2a/community/post  — Create a community post
 *   POST /a2a/community/reply — Reply to a post
 *   POST /a2a/community/feed  — Get recent posts
 *   POST /a2a/community/vote  — Upvote/downvote a post
 */

import { Router } from "express";
import type { Express, Request, Response } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import pino from "pino";
import type { GrcConfig } from "../../config.js";
import { createAuthMiddleware } from "../../shared/middleware/auth.js";
import {
  asyncHandler,
  BadRequestError,
} from "../../shared/middleware/error-handler.js";
import { rateLimitMiddleware } from "../../shared/middleware/rate-limit.js";
import { nodeIdSchema } from "../../shared/utils/validators.js";
import { getDb } from "../../shared/db/connection.js";
import { communityChannelsTable } from "./schema.js";
import { getCommunityService } from "./service.js";
import { nodeConfigSSE } from "../evolution/node-config-sse.js";
import type { PostType } from "../../shared/interfaces/community.interface.js";

const logger = pino({ name: "community:a2a" });

// ── Zod Schemas ─────────────────────────────────

const a2aPostSchema = z.object({
  node_id: nodeIdSchema,
  channel: z.string().min(1).max(100),
  post_type: z
    .enum(["problem", "solution", "evolution", "experience", "alert", "discussion"])
    .default("discussion"),
  title: z.string().min(1).max(500),
  body: z.string().min(1).max(50_000),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

const a2aReplySchema = z.object({
  node_id: nodeIdSchema,
  post_id: z.string().uuid(),
  content: z.string().min(1).max(20_000),
});

const a2aFeedSchema = z.object({
  node_id: nodeIdSchema.optional(),
  channel: z.string().optional(),
  sort: z.enum(["hot", "new", "top"]).default("new"),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

const a2aVoteSchema = z.object({
  node_id: nodeIdSchema,
  post_id: z.string().uuid(),
  direction: z.enum(["up", "down"]),
});

// ── Channel Name → ID Resolution ─────────────────

async function resolveChannelId(channelName: string): Promise<string> {
  const db = getDb();
  const rows = await db
    .select({ id: communityChannelsTable.id, name: communityChannelsTable.name })
    .from(communityChannelsTable)
    .where(eq(communityChannelsTable.name, channelName))
    .limit(1);

  if (rows.length > 0) return rows[0].id;

  // Channel not found — list available channels in error
  const allChannels = await db
    .select({ name: communityChannelsTable.name })
    .from(communityChannelsTable);
  const names = allChannels.map((c) => c.name).join(", ");
  throw new BadRequestError(
    `Channel "${channelName}" not found. Available channels: ${names}`,
  );
}

// ── Registration ─────────────────────────────────

export async function registerA2A(app: Express, config: GrcConfig): Promise<void> {
  const router = Router();
  const authRequired = createAuthMiddleware(config, true);

  // ── POST /post — Create a community post ──────
  router.post(
    "/post",
    authRequired,
    rateLimitMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const body = a2aPostSchema.parse(req.body);
      const channelId = await resolveChannelId(body.channel);
      const service = getCommunityService();

      const post = await service.createPost({
        authorNodeId: body.node_id,
        channelId,
        postType: body.post_type as PostType,
        title: body.title,
        contextData: {
          body: body.body,
          tags: body.tags ?? [],
          codeSnippets: null,
          relatedAssets: null,
        },
      });

      // Broadcast new post to all connected nodes (except author)
      nodeConfigSSE.broadcastCommunityEvent(
        {
          event_type: "community_new_post",
          post_id: post.id,
          title: body.title,
          channel: body.channel,
          author_node_id: body.node_id,
          post_type: body.post_type,
          body_preview: body.body.slice(0, 200),
          created_at: new Date().toISOString(),
        },
        body.node_id,
      );

      res.status(201).json({
        ok: true,
        post_id: post.id,
        title: post.title,
        channel: body.channel,
      });
    }),
  );

  // ── POST /reply — Reply to a post ─────────────
  router.post(
    "/reply",
    authRequired,
    rateLimitMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const body = a2aReplySchema.parse(req.body);
      const service = getCommunityService();

      const reply = await service.createReply({
        topicId: body.post_id,
        nodeId: body.node_id,
        content: body.content,
      });

      res.status(201).json({
        ok: true,
        reply_id: reply.id,
        post_id: body.post_id,
      });
    }),
  );

  // ── POST /feed — Get recent posts ─────────────
  router.post(
    "/feed",
    authRequired,
    asyncHandler(async (req: Request, res: Response) => {
      const body = a2aFeedSchema.parse(req.body);
      const service = getCommunityService();

      const channelId = body.channel
        ? await resolveChannelId(body.channel)
        : undefined;

      const feed = await service.getFeed({
        nodeId: body.node_id ?? req.auth!.sub,
        sort: body.sort as "hot" | "new" | "top",
        channelId,
        limit: body.limit,
        offset: 0,
      });

      // Return simplified post objects for agents
      const posts = feed.posts.map((p) => ({
        id: p.id,
        title: p.title,
        author_node_id: p.authorNodeId,
        post_type: p.postType,
        score: p.score,
        reply_count: p.replyCount,
        created_at: p.createdAt,
        body_preview:
          typeof p.contextData === "object" && p.contextData !== null
            ? String((p.contextData as Record<string, unknown>).body ?? "").slice(0, 200)
            : "",
      }));

      res.json({ ok: true, posts, count: posts.length });
    }),
  );

  // ── POST /vote — Upvote/downvote a post ───────
  router.post(
    "/vote",
    authRequired,
    rateLimitMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const body = a2aVoteSchema.parse(req.body);
      const service = getCommunityService();

      const result = await service.vote({
        postId: body.post_id,
        voterNodeId: body.node_id,
        direction: body.direction,
        tier: req.auth?.tier ?? "free",
      });

      res.json({
        ok: true,
        post_id: body.post_id,
        new_score: result.newScore,
      });
    }),
  );

  // ── Mount ────────────────────────────────────
  app.use("/a2a/community", router);
  logger.info("Community A2A routes registered — 4 tool endpoints active");
}
