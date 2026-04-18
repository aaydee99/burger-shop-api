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

function corsHeaders(request: LambdaFunctionURLEvent): Record<string, string> {
  const allow =
    process.env.CORS_ALLOW_ORIGIN?.trim() ||
    request.headers?.origin ||
    request.headers?.Origin ||
    "*";
  return {
    "access-control-allow-origin": allow,
    "access-control-allow-methods": "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type,authorization",
    "access-control-max-age": "86400",
  };
}

export const handler = async (event: LambdaFunctionURLEvent): Promise<LambdaFunctionURLResult> => {
  const upstreamBase = process.env.API_UPSTREAM?.trim().replace(/\/$/, "") ?? "";
  if (!upstreamBase) {
    return {
      statusCode: 500,
      headers: { "content-type": "application/json", ...corsHeaders(event) },
      body: JSON.stringify({ error: "API_UPSTREAM is not set on this function." }),
    };
  }

  const staticClient =
    process.env.PROXY_CLIENT_IP?.trim() || process.env.STATIC_EGRESS_CLIENT_IP?.trim() || "203.0.113.1";

  if (event.requestContext.http.method === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders(event),
      body: "",
    };
  }

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
  headers.set("x-forwarded-for", staticClient);
  headers.set("x-real-ip", staticClient);

  const method = event.requestContext.http.method;
  let body: Buffer | undefined;
  if (method !== "GET" && method !== "HEAD" && event.body) {
    body = Buffer.from(event.body, event.isBase64Encoded ? "base64" : "utf8");
  }

  const upstreamRes = await fetch(dest, { method, headers, body });

  const outHeaders: Record<string, string> = {};
  upstreamRes.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === "transfer-encoding") return;
    if (HOP_BY_HOP.has(lower)) return;
    if (lower.startsWith("access-control-")) return;
    outHeaders[key] = value;
  });

  const buf = Buffer.from(await upstreamRes.arrayBuffer());
  const bodyText = new TextDecoder("utf-8", { fatal: false }).decode(buf);

  return {
    statusCode: upstreamRes.status,
    headers: { ...outHeaders, ...corsHeaders(event) },
    body: bodyText,
    isBase64Encoded: false,
  };
};
