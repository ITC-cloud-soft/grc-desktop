/**
 * KPI Service — Definitions, recording, history, and dashboard.
 *
 * - listDefinitions / createDefinition / updateDefinition
 * - recordValue — append a KPI measurement
 * - getHistory — time-series records for a single KPI
 * - getDashboard — all KPIs with latest value + achievement rate
 */

import { v4 as uuidv4 } from "uuid";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";
import pino from "pino";
import { getDb } from "../../shared/db/connection.js";
import { kpiDefinitionsTable, kpiRecordsTable } from "./schema.js";
import { NotFoundError } from "../../shared/middleware/error-handler.js";

const logger = pino({ name: "service:kpi" });

// ── Types ──────────────────────────────────────────

export interface CreateKpiDefinitionParams {
  name: string;
  description?: string | null;
  category?: string | null;
  unit?: string | null;
  targetValue?: string | null;
  targetPeriod?: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  ownerRole?: string | null;
}

export interface UpdateKpiDefinitionParams {
  name?: string;
  description?: string | null;
  category?: string | null;
  unit?: string | null;
  targetValue?: string | null;
  targetPeriod?: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  ownerRole?: string | null;
}

// ── Service ────────────────────────────────────────

export class KpiService {
  /**
   * List all KPI definitions.
   */
  async listDefinitions() {
    const db = getDb();
    const rows = await db
      .select()
      .from(kpiDefinitionsTable)
      .orderBy(desc(kpiDefinitionsTable.createdAt));

    return rows;
  }

  /**
   * Create a new KPI definition.
   */
  async createDefinition(params: CreateKpiDefinitionParams) {
    const db = getDb();
    const id = uuidv4();

    const record: Record<string, unknown> = {
      id,
      name: params.name,
    };

    if (params.description !== undefined) record.description = params.description;
    if (params.category !== undefined) record.category = params.category;
    if (params.unit !== undefined) record.unit = params.unit;
    if (params.targetValue !== undefined) record.targetValue = params.targetValue;
    if (params.targetPeriod) record.targetPeriod = params.targetPeriod;
    if (params.ownerRole !== undefined) record.ownerRole = params.ownerRole;

    await db.insert(kpiDefinitionsTable).values(record as any);

    const rows = await db
      .select()
      .from(kpiDefinitionsTable)
      .where(eq(kpiDefinitionsTable.id, id))
      .limit(1);

    logger.info({ id, name: params.name }, "KPI definition created");
    return rows[0];
  }

  /**
   * Update a KPI definition.
   */
  async updateDefinition(id: string, params: UpdateKpiDefinitionParams) {
    const db = getDb();

    const existing = await db
      .select()
      .from(kpiDefinitionsTable)
      .where(eq(kpiDefinitionsTable.id, id))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundError("KPI definition");
    }

    const updates: Record<string, unknown> = {};
    if (params.name !== undefined) updates.name = params.name;
    if (params.description !== undefined) updates.description = params.description;
    if (params.category !== undefined) updates.category = params.category;
    if (params.unit !== undefined) updates.unit = params.unit;
    if (params.targetValue !== undefined) updates.targetValue = params.targetValue;
    if (params.targetPeriod !== undefined) updates.targetPeriod = params.targetPeriod;
    if (params.ownerRole !== undefined) updates.ownerRole = params.ownerRole;

    if (Object.keys(updates).length > 0) {
      await db
        .update(kpiDefinitionsTable)
        .set(updates as any)
        .where(eq(kpiDefinitionsTable.id, id));
    }

    const rows = await db
      .select()
      .from(kpiDefinitionsTable)
      .where(eq(kpiDefinitionsTable.id, id))
      .limit(1);

    logger.info({ id }, "KPI definition updated");
    return rows[0];
  }

  /**
   * Record a new KPI value measurement.
   */
  async recordValue(
    kpiId: string,
    value: string,
    recordedBy?: string,
    notes?: string,
  ) {
    const db = getDb();

    // Verify KPI exists
    const existing = await db
      .select()
      .from(kpiDefinitionsTable)
      .where(eq(kpiDefinitionsTable.id, kpiId))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundError("KPI definition");
    }

    const id = uuidv4();

    await db.insert(kpiRecordsTable).values({
      id,
      kpiId,
      value,
      recordedBy: recordedBy ?? null,
      notes: notes ?? null,
    } as any);

    const rows = await db
      .select()
      .from(kpiRecordsTable)
      .where(eq(kpiRecordsTable.id, id))
      .limit(1);

    logger.info({ id, kpiId, value }, "KPI value recorded");
    return rows[0];
  }

  /**
   * Get historical records for a KPI, optionally filtered by date range.
   */
  async getHistory(kpiId: string, from?: Date, to?: Date) {
    const db = getDb();

    // Verify KPI exists
    const existing = await db
      .select()
      .from(kpiDefinitionsTable)
      .where(eq(kpiDefinitionsTable.id, kpiId))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundError("KPI definition");
    }

    const conditions: ReturnType<typeof eq>[] = [
      eq(kpiRecordsTable.kpiId, kpiId),
    ];

    if (from) {
      conditions.push(gte(kpiRecordsTable.recordedAt, from) as any);
    }
    if (to) {
      conditions.push(lte(kpiRecordsTable.recordedAt, to) as any);
    }

    const records = await db
      .select()
      .from(kpiRecordsTable)
      .where(and(...conditions))
      .orderBy(desc(kpiRecordsTable.recordedAt));

    return {
      kpi: existing[0],
      records,
    };
  }

  /**
   * Dashboard: all KPIs with latest value + achievement rate.
   *
   * achievement = (latestValue / targetValue) * 100
   */
  async getDashboard() {
    const db = getDb();

    const definitions = await db
      .select()
      .from(kpiDefinitionsTable)
      .orderBy(desc(kpiDefinitionsTable.createdAt));

    // For each KPI, get the latest record
    const dashboard = await Promise.all(
      definitions.map(async (kpi) => {
        const latestRows = await db
          .select()
          .from(kpiRecordsTable)
          .where(eq(kpiRecordsTable.kpiId, kpi.id))
          .orderBy(desc(kpiRecordsTable.recordedAt))
          .limit(1);

        const latestRecord = latestRows[0] ?? null;
        const latestValue = latestRecord ? Number(latestRecord.value) : null;
        const target = kpi.targetValue ? Number(kpi.targetValue) : null;

        let achievementRate: number | null = null;
        if (latestValue !== null && target !== null && target !== 0) {
          achievementRate = Math.round((latestValue / target) * 10000) / 100;
        }

        return {
          ...kpi,
          latestValue,
          latestRecordedAt: latestRecord?.recordedAt ?? null,
          achievementRate,
        };
      }),
    );

    return dashboard;
  }
}
