/**
 * GRC Server — Express Application Entry Point
 *
 * Modular Monolith: All modules share this Express instance.
 * Modules are loaded dynamically based on environment config.
 */

import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import pino from "pino";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadConfig } from "./config.js";
import { initDatabase, closeDatabase } from "./shared/db/connection.js";
import { loadModules } from "./module-loader.js";
import { requestLogger } from "./shared/middleware/request-logger.js";
import { errorHandler } from "./shared/middleware/error-handler.js";

const logger = pino({ name: "grc-server" });

async function main() {
  // ── Ensure .env exists (desktop mode) ────────────
  const __rootDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
  );
  const envFilePath = path.join(__rootDir, ".env");
  if (!fs.existsSync(envFilePath)) {
    fs.writeFileSync(envFilePath, [
      "# GRC Desktop Configuration",
      "# Created automatically on first launch",
      "",
      "# LLM API for AI generation features (role wizard, strategy generation)",
      "GRC_LLM_PROVIDER=",
      "GRC_LLM_BASE_URL=",
      "GRC_LLM_API_KEY=",
      "GRC_LLM_MODEL=",
      "",
    ].join("\n"), "utf-8");
    logger.info({ path: envFilePath }, ".env file created for desktop mode");
  }

  // ── Load Configuration ────────────────────────────
  const config = loadConfig();
  logger.info(
    { port: config.port, env: config.nodeEnv },
    "Starting GRC server",
  );

  // ── Initialize Database ───────────────────────────
  // In desktop/SQLite mode, call without args to trigger auto-detection
  if (config.database.url) {
    await initDatabase(config.database.url);
  } else {
    await initDatabase();
  }

  // ── Create Express App ────────────────────────────
  const app = express();

  // Global middleware
  app.use(helmet());
  app.use(
    cors({
      origin: config.nodeEnv === "production"
        ? ["https://grc.winclawhub.ai", "https://admin.winclawhub.ai"]
        : true,
      credentials: true,
    }),
  );
  app.use((req, res, next) => {
    express.json({ limit: "1mb" })(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          error: "bad_request",
          message: "Invalid JSON in request body",
        });
      }
      next();
    });
  });
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  // ── Health Check (before modules) ─────────────────
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "grc-server",
      version: process.env.npm_package_version ?? "0.1.0",
      timestamp: new Date().toISOString(),
    });
  });

  // ── Module Status API (before module loading) ────
  app.get("/api/v1/admin/modules/status", (_req, res) => {
    res.json({
      modules: config.modules,
    });
  });

  // ── Module Toggle API — update .env and respond ──
  const ENV_KEY_MAP: Record<string, string> = {
    auth: "GRC_MODULE_AUTH",
    clawhub: "GRC_MODULE_CLAWHUB",
    evolution: "GRC_MODULE_EVOLUTION",
    update: "GRC_MODULE_UPDATE",
    telemetry: "GRC_MODULE_TELEMETRY",
    community: "GRC_MODULE_COMMUNITY",
    platform: "GRC_MODULE_PLATFORM",
    roles: "GRC_MODULE_ROLES",
    tasks: "GRC_MODULE_TASKS",
    relay: "GRC_MODULE_RELAY",
    strategy: "GRC_MODULE_STRATEGY",
    "a2a-gateway": "GRC_MODULE_A2A_GATEWAY",
    meetings: "GRC_MODULE_MEETINGS",
    "model-keys": "GRC_MODULE_MODEL_KEYS",
    messaging: "GRC_MODULE_MESSAGING",
  };

  app.patch("/api/v1/admin/modules", (req, res) => {
    const updates = req.body as Record<string, boolean>;
    if (!updates || typeof updates !== "object") {
      return res.status(400).json({ error: "bad_request", message: "Body must be an object of module toggles" });
    }

    // Resolve .env path (project root)
    const envPath = path.resolve(
      path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1")),
      "..",
      ".env",
    );

    try {
      let envContent = "";
      try {
        envContent = fs.readFileSync(envPath, "utf-8");
      } catch {
        // .env doesn't exist yet — will create
      }

      for (const [moduleKey, enabled] of Object.entries(updates)) {
        const envKey = ENV_KEY_MAP[moduleKey];
        if (!envKey) continue;

        const val = enabled ? "true" : "false";
        const regex = new RegExp(`^${envKey}=.*$`, "m");
        if (regex.test(envContent)) {
          envContent = envContent.replace(regex, `${envKey}=${val}`);
        } else {
          // Append the new key
          envContent = envContent.trimEnd() + `\n${envKey}=${val}\n`;
        }
      }

      fs.writeFileSync(envPath, envContent, "utf-8");
      logger.info({ updates }, "Module toggles saved to .env");
      return res.json({ success: true, message: "Saved. Restart server to apply." });
    } catch (err) {
      logger.error({ err }, "Failed to update .env");
      return res.status(500).json({ error: "internal", message: "Failed to save configuration" });
    }
  });

  // ── LLM Settings API ────────────────────────────
  const LLM_ENV_KEYS = ["GRC_LLM_PROVIDER", "GRC_LLM_BASE_URL", "GRC_LLM_API_KEY", "GRC_LLM_MODEL"] as const;

  app.get("/api/v1/admin/llm-settings", (_req, res) => {
    res.json({
      provider: process.env.GRC_LLM_PROVIDER || "",
      baseUrl: process.env.GRC_LLM_BASE_URL || "",
      apiKey: process.env.GRC_LLM_API_KEY ? "••••" + process.env.GRC_LLM_API_KEY.slice(-4) : "",
      model: process.env.GRC_LLM_MODEL || "",
      hasApiKey: !!process.env.GRC_LLM_API_KEY,
    });
  });

  app.patch("/api/v1/admin/llm-settings", (req, res) => {
    const body = req.body as Record<string, string>;
    if (!body || typeof body !== "object") {
      return res.status(400).json({ error: "bad_request" });
    }

    const envPath = path.resolve(
      path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1")),
      "..",
      ".env",
    );

    try {
      let envContent = "";
      try { envContent = fs.readFileSync(envPath, "utf-8"); } catch { /* new file */ }

      const mapping: Record<string, string> = {
        provider: "GRC_LLM_PROVIDER",
        baseUrl: "GRC_LLM_BASE_URL",
        apiKey: "GRC_LLM_API_KEY",
        model: "GRC_LLM_MODEL",
      };

      for (const [field, envKey] of Object.entries(mapping)) {
        if (field in body) {
          const val = body[field] ?? "";
          // Skip masked apiKey (don't overwrite with mask)
          if (field === "apiKey" && val.startsWith("••••")) continue;

          const regex = new RegExp(`^${envKey}=.*$`, "m");
          if (regex.test(envContent)) {
            envContent = envContent.replace(regex, `${envKey}=${val}`);
          } else {
            envContent = envContent.trimEnd() + `\n${envKey}=${val}\n`;
          }
          // Also update process.env for immediate effect
          process.env[envKey] = val;
        }
      }

      fs.writeFileSync(envPath, envContent, "utf-8");
      logger.info("LLM settings saved to .env");
      return res.json({ ok: true });
    } catch (err) {
      logger.error({ err }, "Failed to save LLM settings");
      return res.status(500).json({ error: "internal" });
    }
  });

  // ── Swagger / OpenAPI Documentation ──────────────
  try {
    const { registerDocsRoute } = await import("./routes/docs.js");
    await registerDocsRoute(app);
  } catch (err) {
    logger.warn({ err }, "Failed to register Swagger docs route");
  }

  // ── Load Modules Dynamically ──────────────────────
  const loaded = await loadModules(app, config);
  logger.info({ modules: loaded }, "Modules loaded");

  // ── Serve Dashboard Static Files (desktop mode) ────
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const dashboardDir = path.join(__dirname, "dashboard-dist");

  if (fs.existsSync(dashboardDir)) {
    app.use(express.static(dashboardDir));

    // SPA fallback: all non-API routes return index.html
    // Express 5 requires named wildcard params (path-to-regexp v8)
    const apiPrefixes = ["/api", "/auth", "/a2a", "/health"];
    app.get("/{*splat}", (req, res, next) => {
      if (apiPrefixes.some((prefix) => req.path.startsWith(prefix))) {
        return next();
      }
      res.sendFile(path.join(dashboardDir, "index.html"));
    });

    logger.info({ dashboardDir }, "Dashboard static files enabled (desktop mode)");
  }

  // ── 404 Handler (before error handler) ─────────────
  app.use((_req, res) => {
    res.status(404).json({
      error: "not_found",
      message: "Endpoint not found",
    });
  });

  // ── Global Error Handler (must be last) ───────────
  app.use(errorHandler);

  // ── Weekly Digest Cron (Friday 18:00 JST = 09:00 UTC) ──
  try {
    const cron = await import("node-cron");
    const { generateWeeklyDigest } = await import("./modules/community/weekly-digest.js");
    cron.default.schedule("0 9 * * 5", () => {
      generateWeeklyDigest().catch((err) =>
        logger.warn({ err }, "Weekly digest cron failed"),
      );
    });
    logger.info("Weekly digest cron scheduled (Fridays 09:00 UTC / 18:00 JST)");
  } catch (err) {
    logger.warn({ err }, "Failed to register weekly digest cron — node-cron may not be installed");
  }

  // ── Start Server ──────────────────────────────────
  const server = app.listen(config.port, () => {
    logger.info(
      { port: config.port, modules: loaded },
      `GRC server listening on port ${config.port}`,
    );
  });

  // ── Graceful Shutdown ─────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down gracefully");
    server.close(async () => {
      await closeDatabase();
      logger.info("Server stopped");
      process.exit(0);
    });

    // Force exit after 10s
    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10_000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  logger.fatal({ err }, "Failed to start GRC server");
  process.exit(1);
});
