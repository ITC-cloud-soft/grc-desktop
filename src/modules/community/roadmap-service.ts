/**
 * Roadmap Service — CRUD for roadmap items.
 *
 * Supports listing with phase/priority filters and pagination,
 * plus create, update, and delete operations.
 */

import { v4 as uuidv4 } from "uuid";
import { eq, desc, sql, and } from "drizzle-orm";
import pino from "pino";
import { getDb } from "../../shared/db/connection.js";
import { roadmapItemsTable } from "./schema.js";
import { NotFoundError } from "../../shared/middleware/error-handler.js";

const logger = pino({ name: "service:roadmap" });

// ── Types ──────────────────────────────────────────

export interface RoadmapListParams {
  page: number;
  limit: number;
  phase?: string;
  priority?: string;
  category?: string;
}

export interface CreateRoadmapParams {
  title: string;
  description?: string | null;
  phase?: "now" | "next" | "later" | "done";
  priority?: "must" | "should" | "could" | "wont";
  category?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  progress?: number;
  ownerId?: string | null;
  ownerRole?: string | null;
  linkedTaskIds?: string | null;
}

export interface UpdateRoadmapParams {
  title?: string;
  description?: string | null;
  phase?: "now" | "next" | "later" | "done";
  priority?: "must" | "should" | "could" | "wont";
  category?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  progress?: number;
  ownerId?: string | null;
  ownerRole?: string | null;
  linkedTaskIds?: string | null;
}

// ── Service ────────────────────────────────────────

export class RoadmapService {
  /**
   * List roadmap items with optional phase/priority/category filters.
   */
  async list(params: RoadmapListParams) {
    const db = getDb();
    const { page, limit, phase, priority, category } = params;
    const offset = (page - 1) * limit;

    const conditions: ReturnType<typeof eq>[] = [];
    if (phase) {
      conditions.push(eq(roadmapItemsTable.phase, phase as any));
    }
    if (priority) {
      conditions.push(eq(roadmapItemsTable.priority, priority as any));
    }
    if (category) {
      conditions.push(eq(roadmapItemsTable.category, category));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, countResult] = await Promise.all([
      db
        .select()
        .from(roadmapItemsTable)
        .where(where)
        .orderBy(desc(roadmapItemsTable.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(roadmapItemsTable)
        .where(where),
    ]);

    const total = Number(countResult[0]?.count ?? 0);

    return {
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create a new roadmap item.
   */
  async create(params: CreateRoadmapParams) {
    const db = getDb();
    const id = uuidv4();

    const record: Record<string, unknown> = {
      id,
      title: params.title,
    };

    if (params.description !== undefined) record.description = params.description;
    if (params.phase) record.phase = params.phase;
    if (params.priority) record.priority = params.priority;
    if (params.category !== undefined) record.category = params.category;
    if (params.startDate !== undefined) record.startDate = params.startDate;
    if (params.endDate !== undefined) record.endDate = params.endDate;
    if (params.progress !== undefined) record.progress = params.progress;
    if (params.ownerId !== undefined) record.ownerId = params.ownerId;
    if (params.ownerRole !== undefined) record.ownerRole = params.ownerRole;
    if (params.linkedTaskIds !== undefined) record.linkedTaskIds = params.linkedTaskIds;

    await db.insert(roadmapItemsTable).values(record as any);

    const rows = await db
      .select()
      .from(roadmapItemsTable)
      .where(eq(roadmapItemsTable.id, id))
      .limit(1);

    logger.info({ id, title: params.title }, "Roadmap item created");
    return rows[0];
  }

  /**
   * Update an existing roadmap item.
   */
  async update(id: string, params: UpdateRoadmapParams) {
    const db = getDb();

    const existing = await db
      .select()
      .from(roadmapItemsTable)
      .where(eq(roadmapItemsTable.id, id))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundError("Roadmap item");
    }

    const updates: Record<string, unknown> = {};
    if (params.title !== undefined) updates.title = params.title;
    if (params.description !== undefined) updates.description = params.description;
    if (params.phase !== undefined) updates.phase = params.phase;
    if (params.priority !== undefined) updates.priority = params.priority;
    if (params.category !== undefined) updates.category = params.category;
    if (params.startDate !== undefined) updates.startDate = params.startDate;
    if (params.endDate !== undefined) updates.endDate = params.endDate;
    if (params.progress !== undefined) updates.progress = params.progress;
    if (params.ownerId !== undefined) updates.ownerId = params.ownerId;
    if (params.ownerRole !== undefined) updates.ownerRole = params.ownerRole;
    if (params.linkedTaskIds !== undefined) updates.linkedTaskIds = params.linkedTaskIds;
    updates.updatedAt = new Date();

    if (Object.keys(updates).length > 1) {
      await db
        .update(roadmapItemsTable)
        .set(updates as any)
        .where(eq(roadmapItemsTable.id, id));
    }

    const rows = await db
      .select()
      .from(roadmapItemsTable)
      .where(eq(roadmapItemsTable.id, id))
      .limit(1);

    logger.info({ id }, "Roadmap item updated");
    return rows[0];
  }

  /**
   * Delete a roadmap item by ID.
   */
  async delete(id: string) {
    const db = getDb();

    const existing = await db
      .select()
      .from(roadmapItemsTable)
      .where(eq(roadmapItemsTable.id, id))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundError("Roadmap item");
    }

    await db.delete(roadmapItemsTable).where(eq(roadmapItemsTable.id, id));
    logger.info({ id }, "Roadmap item deleted");
    return { ok: true, deleted: id };
  }
}
