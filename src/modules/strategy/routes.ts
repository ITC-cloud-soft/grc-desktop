/**
 * Strategy Module — A2A Protocol Routes
 *
 * Agent-facing endpoints for querying company strategy.
 * Nodes can retrieve role-appropriate strategy summaries and department details.
 */

import { Router } from "express";
import type { Express, Request, Response } from "express";
import { z } from "zod";
import pino from "pino";
import type { GrcConfig } from "../../config.js";
import { createAuthMiddleware } from "../../shared/middleware/auth.js";
import {
  asyncHandler,
  NotFoundError,
} from "../../shared/middleware/error-handler.js";
import { nodeIdSchema } from "../../shared/utils/validators.js";
import { getDb } from "../../shared/db/connection.js";
import { nodesTable } from "../evolution/schema.js";
import { eq } from "drizzle-orm";
import { StrategyService } from "./service.js";

const logger = pino({ name: "module:strategy" });

// ── Request Validation Schemas ──────────────────

const strategySummaryQuerySchema = z.object({
  node_id: nodeIdSchema,
});

const departmentParamSchema = z.object({
  dept: z.string().min(1).max(100),
});

// ── Module Registration ─────────────────────────

export async function register(app: Express, config: GrcConfig): Promise<void> {
  const router = Router();
  const service = new StrategyService();
  const authOptional = createAuthMiddleware(config, false);

  // ────────────────────────────────────────────
  // GET /a2a/strategy/summary — Get strategy summary (role-appropriate)
  // ────────────────────────────────────────────
  router.get(
    "/strategy/summary",
    authOptional,
    asyncHandler(async (req: Request, res: Response) => {
      const query = strategySummaryQuerySchema.parse(req.query);
      const db = getDb();

      // Look up the node to determine its role
      const nodeRows = await db
        .select()
        .from(nodesTable)
        .where(eq(nodesTable.nodeId, query.node_id))
        .limit(1);

      if (nodeRows.length === 0) {
        throw new NotFoundError("Node");
      }

      const node = nodeRows[0];
      const caps = (node.capabilities as Record<string, unknown>) ?? {};
      const roleId = (caps.role_id as string) ?? "unknown";

      // Get current strategy
      const strategy = await service.getStrategy();

      // Build role-appropriate response
      const isCeo =
        roleId.toLowerCase() === "ceo" || roleId.toLowerCase() === "executive";

      if (isCeo) {
        // CEO gets full strategy
        res.json({
          ok: true,
          node_id: query.node_id,
          role_id: roleId,
          scope: "full",
          strategy: {
            mission: strategy.companyMission,
            vision: strategy.companyVision,
            values: strategy.companyValues,
            short_term_objectives: strategy.shortTermObjectives,
            mid_term_objectives: strategy.midTermObjectives,
            long_term_objectives: strategy.longTermObjectives,
            department_budgets: strategy.departmentBudgets,
            department_kpis: strategy.departmentKpis,
            strategic_priorities: strategy.strategicPriorities,
            revision: strategy.revision,
          },
        });
      } else {
        // Departments get summary
        const budgets = (strategy.departmentBudgets as Record<string, unknown>) ?? {};
        const kpis = (strategy.departmentKpis as Record<string, unknown>) ?? {};

        res.json({
          ok: true,
          node_id: query.node_id,
          role_id: roleId,
          scope: "department",
          strategy: {
            mission: strategy.companyMission,
            vision: strategy.companyVision,
            strategic_priorities: strategy.strategicPriorities,
            department_budget: budgets[roleId] ?? null,
            department_kpis: kpis[roleId] ?? null,
            revision: strategy.revision,
          },
        });
      }

      logger.debug(
        { nodeId: query.node_id, roleId, scope: isCeo ? "full" : "department" },
        "Strategy summary served",
      );
    }),
  );

  // ────────────────────────────────────────────
  // GET /a2a/strategy/department/:dept — Get department budget + KPIs
  // ────────────────────────────────────────────
  router.get(
    "/strategy/department/:dept",
    authOptional,
    asyncHandler(async (req: Request, res: Response) => {
      const { dept } = departmentParamSchema.parse(req.params);

      const strategy = await service.getStrategy();
      const budgets = (strategy.departmentBudgets as Record<string, unknown>) ?? {};
      const kpis = (strategy.departmentKpis as Record<string, unknown>) ?? {};

      res.json({
        ok: true,
        department: dept,
        budget: budgets[dept] ?? null,
        kpis: kpis[dept] ?? null,
        revision: strategy.revision,
      });
    }),
  );

  // ── Mount router under /a2a prefix ────────
  app.use("/a2a", router);

  logger.info("Strategy module registered — 2 A2A endpoints active");
}
