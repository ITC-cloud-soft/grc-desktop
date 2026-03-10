/**
 * LLM Client — Lightweight wrapper for calling LLM APIs
 *
 * Uses native fetch (Node 20+) to call LLM APIs.
 * Supports two wire formats:
 *   - OpenAI Chat Completions (default)
 *   - Anthropic Messages API (when baseUrl contains "anthropic")
 *
 * Resolves API keys from:
 *   1. Database (ai_model_keys table)
 *   2. Environment variables (GRC_LLM_API_KEY / GRC_LLM_MODEL)
 */

import pino from "pino";
import { eq } from "drizzle-orm";
import { getDb } from "../db/connection.js";

const logger = pino({ name: "llm-client" });

// ── Provider Base URLs ─────────────────────────────

const PROVIDER_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  deepseek: "https://api.deepseek.com",
  google: "https://generativelanguage.googleapis.com/v1beta/openai",
  qwen: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  glm: "https://api.z.ai/api/anthropic",
};

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_MAX_TOKENS = 16384;
const DEFAULT_TEMPERATURE = 0.7;

// ── Types ──────────────────────────────────────────

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmRequestOptions {
  messages: LlmMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: "json_object" | "text" };
}

interface ResolvedCredentials {
  apiKey: string;
  model: string;
  baseUrl: string;
  provider: string;
}

// ── Credential Resolution ──────────────────────────

async function resolveCredentials(): Promise<ResolvedCredentials> {
  // Try database first
  try {
    const db = getDb();
    const { aiModelKeysTable } = await import(
      "../../modules/model-keys/schema.js"
    );

    const rows = await db
      .select()
      .from(aiModelKeysTable)
      .where(eq(aiModelKeysTable.isActive, 1))
      .limit(5);

    const primary = rows.find((r) => r.category === "primary") ?? rows[0];

    if (primary) {
      const { createDecipheriv } = await import("node:crypto");
      const secret =
        process.env.MODEL_KEY_ENCRYPTION_SECRET ||
        "dev-model-key-secret-32-chars!!";
      const keyBuf = Buffer.alloc(32);
      Buffer.from(secret, "utf-8").copy(keyBuf);
      const buf = Buffer.from(primary.apiKeyEnc, "base64");
      const iv = buf.subarray(0, 12);
      const tag = buf.subarray(12, 28);
      const ciphertext = buf.subarray(28);
      const decipher = createDecipheriv("aes-256-gcm", keyBuf, iv);
      decipher.setAuthTag(tag);
      const apiKey = decipher.update(ciphertext) + decipher.final("utf-8");

      const baseUrl =
        primary.baseUrl ||
        PROVIDER_URLS[primary.provider] ||
        PROVIDER_URLS.openai!;

      logger.info(
        { provider: primary.provider, model: primary.modelName },
        "Using model key from database",
      );

      return { apiKey, model: primary.modelName, baseUrl, provider: primary.provider };
    }
  } catch (err) {
    logger.warn({ err }, "Failed to resolve model key from database, falling back to env");
  }

  // Fallback: environment variables
  const apiKey = process.env.GRC_LLM_API_KEY ?? "";
  const model = process.env.GRC_LLM_MODEL ?? DEFAULT_MODEL;
  const provider = process.env.GRC_LLM_PROVIDER ?? "openai";
  const baseUrl =
    process.env.GRC_LLM_BASE_URL ??
    PROVIDER_URLS[provider] ??
    PROVIDER_URLS.openai!;

  if (!apiKey) {
    throw new Error(
      "No LLM API key available. Either add a model key in the dashboard " +
      "or set GRC_LLM_API_KEY environment variable.",
    );
  }

  logger.info({ provider, model }, "Using LLM credentials from environment");
  return { apiKey, model, baseUrl, provider };
}

// ── Detect API Wire Format ─────────────────────────

function isAnthropicFormat(creds: ResolvedCredentials): boolean {
  return (
    creds.provider === "anthropic" ||
    creds.provider === "glm" ||
    creds.baseUrl.includes("anthropic")
  );
}

// ── Anthropic Messages API ─────────────────────────

async function callAnthropicApi(
  creds: ResolvedCredentials,
  opts: LlmRequestOptions,
): Promise<string> {
  const baseUrl = creds.baseUrl.replace(/\/+$/, "");
  const url = `${baseUrl}/v1/messages`;

  // Separate system message from user/assistant messages
  const systemMsg = opts.messages.find((m) => m.role === "system");
  const nonSystemMsgs = opts.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role, content: m.content }));

  const body: Record<string, unknown> = {
    model: creds.model,
    max_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
    temperature: opts.temperature ?? DEFAULT_TEMPERATURE,
    messages: nonSystemMsgs,
  };

  if (systemMsg) {
    body.system = systemMsg.content;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": creds.apiKey,
    "anthropic-version": "2023-06-01",
  };

  logger.info(
    { provider: creds.provider, model: creds.model, url, messageCount: opts.messages.length },
    "Calling Anthropic-format API",
  );

  const startMs = Date.now();
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    logger.error(
      { status: response.status, body: errText.substring(0, 500) },
      "Anthropic API call failed",
    );
    throw new Error(`LLM API error (${response.status}): ${errText.substring(0, 200)}`);
  }

  const result = (await response.json()) as {
    content?: { type: string; text: string }[];
  };

  const content =
    result.content
      ?.filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("") ?? "";

  const elapsed = Date.now() - startMs;
  logger.info(
    { provider: creds.provider, model: creds.model, elapsed, contentLen: content.length },
    "Anthropic API call completed",
  );

  return content;
}

// ── OpenAI Chat Completions API ────────────────────

async function callOpenAiApi(
  creds: ResolvedCredentials,
  opts: LlmRequestOptions,
): Promise<string> {
  const url = `${creds.baseUrl.replace(/\/+$/, "")}/chat/completions`;

  const body: Record<string, unknown> = {
    model: creds.model,
    messages: opts.messages,
    temperature: opts.temperature ?? DEFAULT_TEMPERATURE,
    max_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
  };

  if (opts.responseFormat) {
    body.response_format = opts.responseFormat;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${creds.apiKey}`,
  };

  logger.info(
    { provider: creds.provider, model: creds.model, url, messageCount: opts.messages.length },
    "Calling OpenAI-format API",
  );

  const startMs = Date.now();
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    logger.error(
      { status: response.status, body: errText.substring(0, 500) },
      "OpenAI API call failed",
    );
    throw new Error(`LLM API error (${response.status}): ${errText.substring(0, 200)}`);
  }

  const result = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  const content = result.choices?.[0]?.message?.content ?? "";
  const elapsed = Date.now() - startMs;

  logger.info(
    { provider: creds.provider, model: creds.model, elapsed, contentLen: content.length },
    "OpenAI API call completed",
  );

  return content;
}

// ── Public API ─────────────────────────────────────

/**
 * Call LLM chat completion. Automatically selects the right wire format
 * (OpenAI or Anthropic) based on provider/baseUrl.
 */
export async function chatCompletion(
  opts: LlmRequestOptions,
): Promise<string> {
  const creds = await resolveCredentials();

  if (isAnthropicFormat(creds)) {
    return callAnthropicApi(creds, opts);
  }
  return callOpenAiApi(creds, opts);
}

/**
 * Call LLM and parse response as JSON.
 * Strips markdown code fences if present.
 */
export async function chatCompletionJson<T = unknown>(
  opts: LlmRequestOptions,
): Promise<T> {
  // For Anthropic format, we cannot use response_format, so just use text
  const raw = await chatCompletion(opts);

  // Strip markdown code fences if the model wraps output
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    logger.warn({ raw: cleaned.substring(0, 500) }, "Failed to parse LLM JSON response");
    throw new Error("LLM returned invalid JSON. Please try again.");
  }
}
