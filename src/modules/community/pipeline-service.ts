/**
 * Sales Pipeline Service — CRUD + summary aggregation.
 *
 * Provides list (with stage filter + pagination), create, update, delete,
 * and getSummary() returning stage-wise counts and total weighted pipeline value.
 */

import { v4 as uuidv4 } from "uuid";
import { eq, and, desc, sql } from "drizzle-orm";
import pino from "pino";
import { getDb } from "../../shared/db/connection.js";
import { salesPipelineTable } from "./schema.js";
import {
  NotFoundError,
} from "../../shared/middleware/error-handler.js";
import type { PaginatedResult } from "../../shared/utils/validators.js";
import type { SalesPipelineDeal } from "./schema.js";

const logger = pino({ name: "module:community:pipeline" });

// ── Types ───────────────────────────────────────

type PipelineStage = "lead" | "qualified" | "proposal" | "negotiation" | "closed_won" | "closed_lost";

export interface ListPipelineParams {
  page: number;
  limit: number;
  stage?: string;
  ownerId?: string;
}

export interface CreateDealParams {
  companyName: string;
  contactName?: string;
  dealTitle: string;
  stage?: PipelineStage;
  dealValue?: string;
  currency?: string;
  probability?: number;
  expectedCloseDate?: Date;
  ownerId?: string;
  ownerRole?: string;
  notes?: string;
}

export interface UpdateDealParams {
  companyName?: string;
  contactName?: string;
  dealTitle?: string;
  stage?: PipelineStage;
  dealValue?: string;
  currency?: string;
  probability?: number;
  expectedCloseDate?: Date | null;
  ownerId?: string;
  ownerRole?: string;
  notes?: string;
}

export interface PipelineStageSummary {
  stage: string;
  count: number;
  totalValue: number;
  weightedValue: number;
}

export interface PipelineSummary {
  stages: PipelineStageSummary[];
  totalDeals: number;
  totalPipelineValue: number;
  totalWeightedValue: number;
}

// ── Service ─────────────────────────────────────

export class PipelineService {
  /**
   * List deals with optional stage filter and pagination.
   */
  async list(params: ListPipelineParams): Promise<PaginatedResult<SalesPipelineDeal>> {
    const db = getDb();
    const { page, limit, stage, ownerId } = params;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (stage) {
      conditions.push(eq(salesPipelineTable.stage, stage as any));
    }
    if (ownerId) {
      conditions.push(eq(salesPipelineTable.ownerId, ownerId));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(salesPipelineTable)
        .where(where)
        .orderBy(desc(salesPipelineTable.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(salesPipelineTable)
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
   * Get a single deal by ID.
   */
  async getById(id: string): Promise<SalesPipelineDeal> {
    const db = getDb();
    const rows = await db
      .select()
      .from(salesPipelineTable)
      .where(eq(salesPipelineTable.id, id))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundError("Pipeline deal");
    }
    return rows[0];
  }

  /**
   * Create a new deal.
   */
  async create(params: CreateDealParams): Promise<SalesPipelineDeal> {
    const db = getDb();
    const id = uuidv4();

    await db.insert(salesPipelineTable).values({
      id,
      companyName: params.companyName,
      contactName: params.contactName ?? null,
      dealTitle: params.dealTitle,
      stage: params.stage ?? "lead",
      dealValue: params.dealValue ?? null,
      currency: params.currency ?? "JPY",
      probability: params.probability ?? 0,
      expectedCloseDate: params.expectedCloseDate ?? null,
      ownerId: params.ownerId ?? null,
      ownerRole: params.ownerRole ?? null,
      notes: params.notes ?? null,
    });

    logger.info({ dealId: id, dealTitle: params.dealTitle }, "Pipeline deal created");
    return this.getById(id);
  }

  /**
   * Update an existing deal.
   */
  async update(id: string, params: UpdateDealParams): Promise<SalesPipelineDeal> {
    const db = getDb();

    // Verify exists
    await this.getById(id);

    const updates: Record<string, unknown> = {};
    if (params.companyName !== undefined) updates.companyName = params.companyName;
    if (params.contactName !== undefined) updates.contactName = params.contactName;
    if (params.dealTitle !== undefined) updates.dealTitle = params.dealTitle;
    if (params.stage !== undefined) updates.stage = params.stage;
    if (params.dealValue !== undefined) updates.dealValue = params.dealValue;
    if (params.currency !== undefined) updates.currency = params.currency;
    if (params.probability !== undefined) updates.probability = params.probability;
    if (params.expectedCloseDate !== undefined) updates.expectedCloseDate = params.expectedCloseDate;
    if (params.ownerId !== undefined) updates.ownerId = params.ownerId;
    if (params.ownerRole !== undefined) updates.ownerRole = params.ownerRole;
    if (params.notes !== undefined) updates.notes = params.notes;
    updates.updatedAt = new Date();

    if (Object.keys(updates).length > 1) {
      await db
        .update(salesPipelineTable)
        .set(updates)
        .where(eq(salesPipelineTable.id, id));
    }

    logger.info({ dealId: id }, "Pipeline deal updated");
    return this.getById(id);
  }

  /**
   * Delete a deal.
   */
  async delete(id: string): Promise<void> {
    const db = getDb();

    // Verify exists
    await this.getById(id);

    await db.delete(salesPipelineTable).where(eq(salesPipelineTable.id, id));
    logger.info({ dealId: id }, "Pipeline deal deleted");
  }

  /**
   * Get pipeline summary: stage-wise counts and total weighted pipeline value.
   *
   * Weighted value = deal_value * (probability / 100)
   */
  async getSummary(): Promise<PipelineSummary> {
    const db = getDb();

    const rows = await db
      .select({
        stage: salesPipelineTable.stage,
        count: sql<number>`COUNT(*)`,
        totalValue: sql<number>`COALESCE(SUM(CAST(deal_value AS DECIMAL(14,2))), 0)`,
        weightedValue: sql<number>`COALESCE(SUM(CAST(deal_value AS DECIMAL(14,2)) * probability / 100), 0)`,
      })
      .from(salesPipelineTable)
      .groupBy(salesPipelineTable.stage);

    const stages: PipelineStageSummary[] = rows.map((r) => ({
      stage: r.stage ?? "lead",
      count: Number(r.count),
      totalValue: Number(r.totalValue),
      weightedValue: Number(r.weightedValue),
    }));

    const totalDeals = stages.reduce((sum, s) => sum + s.count, 0);
    const totalPipelineValue = stages.reduce((sum, s) => sum + s.totalValue, 0);
    const totalWeightedValue = stages.reduce((sum, s) => sum + s.weightedValue, 0);

    return {
      stages,
      totalDeals,
      totalPipelineValue,
      totalWeightedValue,
    };
  }
}
