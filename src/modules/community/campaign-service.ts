/**
 * Campaign Service — CRUD for marketing campaigns.
 *
 * Provides list (with date filters + pagination), create, update, delete.
 */

import { v4 as uuidv4 } from "uuid";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import pino from "pino";
import { getDb } from "../../shared/db/connection.js";
import { campaignsTable } from "./schema.js";
import {
  NotFoundError,
} from "../../shared/middleware/error-handler.js";
import type { PaginatedResult } from "../../shared/utils/validators.js";
import type { Campaign } from "./schema.js";

const logger = pino({ name: "module:community:campaigns" });

// ── Types ───────────────────────────────────────

export interface ListCampaignsParams {
  page: number;
  limit: number;
  status?: string;
  startFrom?: string; // ISO date string
  startTo?: string;   // ISO date string
}

export interface CreateCampaignParams {
  title: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  status?: "draft" | "planned" | "active" | "completed" | "cancelled";
  ownerId?: string;
  ownerRole?: string;
  channel?: string;
  budget?: string;
  kpiTarget?: string;
}

export interface UpdateCampaignParams {
  title?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date | null;
  status?: "draft" | "planned" | "active" | "completed" | "cancelled";
  ownerId?: string;
  ownerRole?: string;
  channel?: string;
  budget?: string;
  kpiTarget?: string;
}

// ── Service ─────────────────────────────────────

export class CampaignService {
  /**
   * List campaigns with optional date range and status filter.
   */
  async list(params: ListCampaignsParams): Promise<PaginatedResult<Campaign>> {
    const db = getDb();
    const { page, limit, status, startFrom, startTo } = params;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (status) {
      conditions.push(eq(campaignsTable.status, status as any));
    }
    if (startFrom) {
      conditions.push(gte(campaignsTable.startDate, new Date(startFrom)));
    }
    if (startTo) {
      conditions.push(lte(campaignsTable.startDate, new Date(startTo)));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(campaignsTable)
        .where(where)
        .orderBy(desc(campaignsTable.startDate))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(campaignsTable)
        .where(where),
    ]);

    const total = Number(countResult[0]?.count ?? 0);

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single campaign by ID.
   */
  async getById(id: string): Promise<Campaign> {
    const db = getDb();
    const rows = await db
      .select()
      .from(campaignsTable)
      .where(eq(campaignsTable.id, id))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundError("Campaign");
    }
    return rows[0];
  }

  /**
   * Create a new campaign.
   */
  async create(params: CreateCampaignParams): Promise<Campaign> {
    const db = getDb();
    const id = uuidv4();

    await db.insert(campaignsTable).values({
      id,
      title: params.title,
      description: params.description ?? null,
      startDate: params.startDate,
      endDate: params.endDate ?? null,
      status: params.status ?? "draft",
      ownerId: params.ownerId ?? null,
      ownerRole: params.ownerRole ?? null,
      channel: params.channel ?? null,
      budget: params.budget ?? null,
      kpiTarget: params.kpiTarget ?? null,
    });

    logger.info({ campaignId: id, title: params.title }, "Campaign created");
    return this.getById(id);
  }

  /**
   * Update an existing campaign.
   */
  async update(id: string, params: UpdateCampaignParams): Promise<Campaign> {
    const db = getDb();

    // Verify exists
    await this.getById(id);

    const updates: Record<string, unknown> = {};
    if (params.title !== undefined) updates.title = params.title;
    if (params.description !== undefined) updates.description = params.description;
    if (params.startDate !== undefined) updates.startDate = params.startDate;
    if (params.endDate !== undefined) updates.endDate = params.endDate;
    if (params.status !== undefined) updates.status = params.status;
    if (params.ownerId !== undefined) updates.ownerId = params.ownerId;
    if (params.ownerRole !== undefined) updates.ownerRole = params.ownerRole;
    if (params.channel !== undefined) updates.channel = params.channel;
    if (params.budget !== undefined) updates.budget = params.budget;
    if (params.kpiTarget !== undefined) updates.kpiTarget = params.kpiTarget;
    updates.updatedAt = new Date();

    if (Object.keys(updates).length > 1) {
      await db
        .update(campaignsTable)
        .set(updates)
        .where(eq(campaignsTable.id, id));
    }

    logger.info({ campaignId: id }, "Campaign updated");
    return this.getById(id);
  }

  /**
   * Delete a campaign.
   */
  async delete(id: string): Promise<void> {
    const db = getDb();

    // Verify exists
    await this.getById(id);

    await db.delete(campaignsTable).where(eq(campaignsTable.id, id));
    logger.info({ campaignId: id }, "Campaign deleted");
  }
}
