const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

/**
 * Custom error class that preserves HTTP status code for conditional handling.
 * E.g. the dashboard overview can silently ignore 404s from disabled modules.
 */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// ── Token Storage ──────────────────────────────────────────────────────────

const TOKEN_KEY = 'grc_admin_token';
const REFRESH_TOKEN_KEY = 'grc_admin_refresh_token';

function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

function getAuthHeader(): Record<string, string> {
  const token = getAccessToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

// ── JWT Expiry Helpers ─────────────────────────────────────────────────────

/**
 * Decode the JWT payload without verifying the signature.
 * Safe to use on the frontend for reading expiry time only.
 */
function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    // Pad base64url to standard base64
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), '='));
    return JSON.parse(decoded) as { exp?: number };
  } catch {
    return null;
  }
}

/**
 * Returns true if the access token will expire within the given threshold (seconds).
 * Used for proactive refresh before an API call fails with 401.
 */
function isTokenExpiringSoon(thresholdSeconds = 300): boolean {
  const token = getAccessToken();
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return payload.exp - nowSeconds < thresholdSeconds;
}

// ── Refresh Lock (prevent concurrent refresh storms) ──────────────────────

/**
 * Singleton promise that resolves/rejects for the in-flight refresh call.
 * All concurrent 401 failures queue behind this single refresh attempt.
 */
let refreshPromise: Promise<boolean> | null = null;

/**
 * Attempt to refresh the access token using the stored refresh token.
 * Returns true on success, false if the refresh token is missing or invalid.
 * Multiple callers sharing the same event loop tick will share one refresh call.
 */
async function attemptTokenRefresh(): Promise<boolean> {
  // If a refresh is already in flight, queue behind it
  if (refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return false;
  }

  refreshPromise = (async (): Promise<boolean> => {
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!res.ok) {
        return false;
      }

      const data = (await res.json()) as {
        access_token: string;
        refresh_token: string;
      };

      setTokens(data.access_token, data.refresh_token);
      return true;
    } catch {
      return false;
    } finally {
      // Release the lock so future calls can attempt a new refresh
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ── Force Logout ───────────────────────────────────────────────────────────

/**
 * Force-logout: clear stored tokens and reload to show login screen.
 * Called only when refresh has already failed (token truly invalid/expired).
 */
export function forceLogout() {
  clearTokens();
  window.location.reload();
}

// ── Response Handler ───────────────────────────────────────────────────────

/**
 * Parse a successful response body. Returns undefined for empty bodies (e.g. 204).
 */
async function parseResponseBody<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return undefined as unknown as T;
  return JSON.parse(text) as T;
}

/**
 * Build an ApiError from a non-ok, non-401 response.
 */
async function buildApiError(res: Response): Promise<ApiError> {
  let message = `HTTP ${res.status}: ${res.statusText}`;
  try {
    const body = await res.json();
    message = body.detail ?? body.message ?? message;
  } catch {
    // ignore JSON parse error
  }
  return new ApiError(res.status, message);
}

// ── Core Fetch with Auto-Refresh ───────────────────────────────────────────

interface FetchOptions {
  method: string;
  headers: Record<string, string>;
  body?: string | FormData;
}

/**
 * Perform a fetch with transparent token refresh on 401.
 *
 * Flow:
 *  1. If the access token is expiring within 5 minutes, proactively refresh
 *     before sending the request (avoids a guaranteed 401 round-trip).
 *  2. Send the request with the current access token.
 *  3. On 401, attempt one token refresh and retry the original request.
 *  4. If the refresh fails, call forceLogout() and throw.
 */
async function fetchWithAuth<T>(url: string, options: FetchOptions): Promise<T> {
  // Proactive refresh: if token is about to expire, refresh before the request
  if (isTokenExpiringSoon(300)) {
    // Fire-and-forget — if this fails we still proceed; the 401 path will catch it
    await attemptTokenRefresh();
  }

  // Merge current auth header (may have been updated by proactive refresh above)
  const requestOptions = {
    ...options,
    headers: { ...options.headers, ...getAuthHeader() },
  };

  const res = await fetch(url, requestOptions);

  // Happy path
  if (res.ok) {
    return parseResponseBody<T>(res);
  }

  // ── 401 Handling: try refresh then retry ──────────────────────────────
  if (res.status === 401) {
    const refreshed = await attemptTokenRefresh();

    if (!refreshed) {
      // Refresh failed — session is truly over
      forceLogout();
      throw new ApiError(401, 'Session expired');
    }

    // Retry the original request with the new access token
    const retryOptions = {
      ...options,
      headers: { ...options.headers, ...getAuthHeader() },
    };
    const retryRes = await fetch(url, retryOptions);

    if (retryRes.ok) {
      return parseResponseBody<T>(retryRes);
    }

    if (retryRes.status === 401) {
      // Still 401 after a successful refresh — force logout
      forceLogout();
      throw new ApiError(401, 'Session expired');
    }

    throw await buildApiError(retryRes);
  }

  // All other non-ok statuses
  throw await buildApiError(res);
}

// ── URL Builder ────────────────────────────────────────────────────────────

function buildUrl(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): string {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString().replace(window.location.origin, '');
}

// ── Public API Methods ─────────────────────────────────────────────────────

export async function get<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  const url = buildUrl(path, params);
  return fetchWithAuth<T>(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function post<T>(path: string, body?: unknown): Promise<T> {
  return fetchWithAuth<T>(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function patch<T>(path: string, body?: unknown): Promise<T> {
  return fetchWithAuth<T>(`${BASE_URL}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function put<T>(path: string, body?: unknown): Promise<T> {
  return fetchWithAuth<T>(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function del<T>(path: string): Promise<T> {
  return fetchWithAuth<T>(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * POST with FormData (multipart/form-data).
 * Used for file uploads — do NOT set Content-Type header
 * (the browser sets it automatically with the boundary).
 */
export async function postFormData<T>(path: string, formData: FormData): Promise<T> {
  return fetchWithAuth<T>(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {},
    body: formData,
  });
}

export const apiClient = { get, post, put, patch, del, postFormData };
