/**
 * Shared logger factory.
 * Centralizes pino configuration for consistent logging across modules.
 */
import pino from "pino";

const LOG_LEVEL = process.env.LOG_LEVEL || "info";

/**
 * Create a named logger instance with consistent configuration.
 */
export function createLogger(name: string) {
  return pino({ name, level: LOG_LEVEL });
}
