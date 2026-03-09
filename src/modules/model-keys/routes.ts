/**
 * Model-Keys Module — Public Routes (none)
 *
 * This module is admin-only. No public/A2A routes needed.
 */

import type { Express } from "express";
import type { GrcConfig } from "../../config.js";
import pino from "pino";

const logger = pino({ name: "module:model-keys" });

export async function register(_app: Express, _config: GrcConfig): Promise<void> {
  logger.info("Model-keys module registered (admin-only — no public routes)");
}
