/**
 * Swagger / OpenAPI Documentation Route
 *
 * Serves Swagger UI at the configured path (default: /docs).
 * Controlled by SWAGGER_ENABLED env var (default: true in non-production).
 *
 * Dependencies (must be installed):
 *   npm install swagger-ui-express
 *   npm install -D @types/swagger-ui-express
 */

import type { Express } from "express";
import pino from "pino";
import { buildOpenApiSpec } from "../docs/swagger.js";

const logger = pino({ name: "docs" });

/**
 * Register Swagger UI documentation route.
 *
 * @param app - Express application instance
 * @param options - Configuration overrides
 */
export async function registerDocsRoute(
  app: Express,
  options?: {
    /** Override the env-based enable flag. */
    enabled?: boolean;
    /** URL path to serve the docs at. Default: /docs */
    path?: string;
  },
): Promise<void> {
  const nodeEnv = process.env.NODE_ENV ?? "development";

  // Determine if Swagger should be enabled.
  // Explicit SWAGGER_ENABLED env var takes priority, then the options arg,
  // then defaults to true in non-production environments.
  const envEnabled = process.env.SWAGGER_ENABLED;
  let enabled: boolean;
  if (envEnabled !== undefined && envEnabled !== "") {
    enabled = envEnabled.toLowerCase() !== "false" && envEnabled !== "0";
  } else if (options?.enabled !== undefined) {
    enabled = options.enabled;
  } else {
    enabled = nodeEnv !== "production";
  }

  if (!enabled) {
    logger.info("Swagger UI disabled (SWAGGER_ENABLED=false or production mode)");
    return;
  }

  const docsPath = process.env.SWAGGER_PATH ?? options?.path ?? "/docs";

  try {
    // Dynamic import so the dependency is optional at runtime.
    // If swagger-ui-express is not installed, the server still starts.
    const swaggerUi = await import("swagger-ui-express");

    const spec = buildOpenApiSpec();

    // Serve the raw OpenAPI JSON at /docs/json for programmatic access
    app.get(`${docsPath}/json`, (_req, res) => {
      res.json(spec);
    });

    // Serve Swagger UI
    app.use(
      docsPath,
      swaggerUi.serve,
      swaggerUi.setup(spec, {
        customSiteTitle: "GRC API Documentation",
        customCss: ".swagger-ui .topbar { display: none }",
        swaggerOptions: {
          persistAuthorization: true,
          docExpansion: "list",
          filter: true,
          tagsSorter: "alpha",
        },
      }),
    );

    logger.info(`Swagger UI available at ${docsPath}`);
    logger.info(`OpenAPI JSON available at ${docsPath}/json`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Cannot find") || msg.includes("MODULE_NOT_FOUND")) {
      logger.warn(
        "swagger-ui-express is not installed -- Swagger UI will not be available. " +
        "Run: npm install swagger-ui-express @types/swagger-ui-express",
      );
    } else {
      logger.error({ err }, "Failed to initialize Swagger UI");
    }
  }
}
