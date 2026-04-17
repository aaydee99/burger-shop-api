import type { CorsOptions } from "cors";

function splitOrigins(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Canonical form for comparison: scheme + host + port, no path or trailing slash. */
export function normalizeBrowserOrigin(origin: string): string {
  const trimmed = origin.trim();
  if (!trimmed) return trimmed;
  try {
    const u = new URL(trimmed);
    return u.origin;
  } catch {
    return trimmed.replace(/\/+$/, "");
  }
}

function mergeExplicitOrigins(): Set<string> {
  const set = new Set<string>();
  for (const raw of [
    ...splitOrigins(process.env.CORS_ORIGIN),
    ...splitOrigins(process.env.CORS_ORIGINS),
  ]) {
    set.add(normalizeBrowserOrigin(raw));
  }
  const front = process.env.FRONTEND_URL?.trim();
  if (front) set.add(normalizeBrowserOrigin(front));
  return set;
}

function isLocalhostOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  } catch {
    return false;
  }
}

function isVercelDeploymentOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return hostname === "vercel.app" || hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

function isRenderDeploymentOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return hostname === "onrender.com" || hostname.endsWith(".onrender.com");
  } catch {
    return false;
  }
}

/**
 * Builds `cors` middleware options:
 * - Reflects allowed `Origin` (required with `credentials: true`).
 * - Merges `CORS_ORIGIN`, `CORS_ORIGINS`, and `FRONTEND_URL` (comma-separated where applicable).
 * - Optional `*.vercel.app` (on by default; set `CORS_ALLOW_VERCEL_PREVIEWS=0` to disable).
 * - Optional `*.onrender.com` (on by default; set `CORS_ALLOW_RENDER_HOSTS=0` to disable).
 * - Allows `http://localhost:*` / `127.0.0.1:*` / `[::1]:*` (any port) for local dev against a remote API.
 * - Preflight: explicit methods/headers and cache via `maxAge`.
 */
export function buildCorsOptions(): CorsOptions {
  const explicit = mergeExplicitOrigins();
  const allowVercelHosts =
    process.env.CORS_ALLOW_VERCEL_PREVIEWS !== "0" &&
    process.env.CORS_ALLOW_VERCEL_PREVIEWS !== "false";
  const allowRenderHosts =
    process.env.CORS_ALLOW_RENDER_HOSTS !== "0" && process.env.CORS_ALLOW_RENDER_HOSTS !== "false";
  const isProd = process.env.NODE_ENV === "production";
  const corsDebug = process.env.CORS_DEBUG === "1" || process.env.CORS_DEBUG === "true";

  return {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalized = normalizeBrowserOrigin(origin);

      if (explicit.has(origin) || explicit.has(normalized)) {
        callback(null, true);
        return;
      }

      /** Local Vite / preview against a remote API (e.g. Render) without extra env. */
      if (isLocalhostOrigin(origin)) {
        callback(null, true);
        return;
      }

      if (allowVercelHosts && isVercelDeploymentOrigin(origin)) {
        callback(null, true);
        return;
      }

      if (allowRenderHosts && isRenderDeploymentOrigin(origin)) {
        callback(null, true);
        return;
      }

      if (!isProd || corsDebug) {
        console.warn(`[cors] blocked origin: ${origin}`);
      }
      callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "Origin",
      "X-Requested-With",
      "Access-Control-Request-Method",
      "Access-Control-Request-Headers",
    ],
    exposedHeaders: [],
    maxAge: 86_400,
    optionsSuccessStatus: 204,
  };
}
