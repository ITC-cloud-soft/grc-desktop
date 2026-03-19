/**
 * Minimal type declarations for swagger-ui-express.
 *
 * The actual @types/swagger-ui-express package should be installed for
 * full type safety.  This stub allows the project to compile even when
 * the optional dependency is not yet installed.
 */
declare module "swagger-ui-express" {
  import type { RequestHandler } from "express";

  export const serve: RequestHandler[];
  export function setup(
    swaggerDoc: Record<string, unknown>,
    opts?: Record<string, unknown>,
  ): RequestHandler;
}
