import type { LambdaFunctionURLEvent, LambdaFunctionURLResult } from "aws-lambda";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
]);

const STRIP_FROM_RESPONSE = new Set(["content-length", "content-encoding"]);

/** Maximum-permissive CORS for a public BFF (browser + Cloudflare). */
const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS",
  "access-control-allow-headers": "*",
  "access-control-max-age": "86400",
};

/** Lambda Function URL responses: use lowercase header names (AWS convention). */
function withCors(extra: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = { ...CORS_HEADERS };
  for (const [k, v] of Object.entries(extra)) {
    const lk = k.toLowerCase();
    if (lk.startsWith("access-control-")) continue;
    out[lk] = v;
  }
  return out;
}

function stripCorsFromUpstream(upstream: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(upstream)) {
    const lk = k.toLowerCase();
    if (lk.startsWith("access-control-")) continue;
    out[lk] = v;
  }
  return out;
}

export const handler = async (event: LambdaFunctionURLEvent): Promise<LambdaFunctionURLResult> => {
  try {
    const upstreamBase = process.env.API_UPSTREAM?.trim().replace(/\/$/, "") ?? "";
    if (!upstreamBase) {
      return {
        statusCode: 500,
        headers: withCors({ "content-type": "application/json" }),
        body: JSON.stringify({ error: "API_UPSTREAM is not set on this function." }),
      };
    }

    if (event.requestContext.http.method === "OPTIONS") {
      return {
        statusCode: 204,
        headers: { ...CORS_HEADERS },
        body: "",
      };
    }

    const staticClient =
      process.env.PROXY_CLIENT_IP?.trim() || process.env.STATIC_EGRESS_CLIENT_IP?.trim() || "203.0.113.1";

    const rawPath = event.rawPath || "/";
    const qs = event.rawQueryString ? `?${event.rawQueryString}` : "";
    const dest = new URL(rawPath + qs, upstreamBase + "/");

    const headers = new Headers();
    const incoming = event.headers ?? {};
    for (const [key, value] of Object.entries(incoming)) {
      if (value === undefined) continue;
      const lower = key.toLowerCase();
      if (HOP_BY_HOP.has(lower)) continue;
      headers.set(key, value);
    }
    headers.delete("x-forwarded-for");
    headers.delete("x-real-ip");
    headers.delete("forwarded");
    // Do not forward browser Origin/Referer: Express uses cors({ credentials: true }) and would
    // 403 disallowed origins even though this hop is server-side (Lambda -> API).
    headers.delete("origin");
    headers.delete("referer");
    headers.set("x-forwarded-for", staticClient);
    headers.set("x-real-ip", staticClient);

    const method = event.requestContext.http.method;
    let body: Buffer | undefined;
    if (method !== "GET" && method !== "HEAD" && event.body) {
      body = Buffer.from(event.body, event.isBase64Encoded ? "base64" : "utf8");
    }

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 25_000);
    let upstreamRes: Response;
    try {
      upstreamRes = await fetch(dest, { method, headers, body, signal: controller.signal });
    } finally {
      clearTimeout(t);
    }

    const outHeaders: Record<string, string> = {};
    upstreamRes.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (lower === "transfer-encoding") return;
      if (HOP_BY_HOP.has(lower)) return;
      if (STRIP_FROM_RESPONSE.has(lower)) return;
      if (lower.startsWith("access-control-")) return;
      outHeaders[lower] = value;
    });

    const buf = Buffer.from(await upstreamRes.arrayBuffer());
    const bodyText = new TextDecoder("utf-8", { fatal: false }).decode(buf);

    return {
      statusCode: upstreamRes.status,
      headers: { ...CORS_HEADERS, ...stripCorsFromUpstream(outHeaders) },
      body: bodyText,
      isBase64Encoded: false,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      statusCode: 502,
      headers: withCors({ "content-type": "application/json" }),
      body: JSON.stringify({
        error: "Lambda proxy failed",
        message: msg,
      }),
    };
  }
};
