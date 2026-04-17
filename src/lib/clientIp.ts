import type { Request } from "express";

function headerString(req: Request, name: string): string | undefined {
  const v = req.headers[name.toLowerCase()];
  if (typeof v === "string" && v.trim()) return v.trim();
  if (Array.isArray(v) && v[0]?.trim()) return v[0].trim();
  return undefined;
}

/**
 * IP string used in access logs (`morgan` :client-ip).
 *
 * - `STATIC_LOG_IP`: always log this value (matches a fixed egress / partner allowlist story on *your* logs).
 * - `TRUST_CLOUDFLARE`: when the request is proxied by Cloudflare (orange cloud), log
 *   `CF-Connecting-IP` so **origin** logs align with the visitor IP Cloudflare attributes.
 *
 * Note: nothing in this file changes the **ClientIP** Cloudflare writes in **its own** HTTP request
 * logs — that comes from the TCP client that connected to Cloudflare’s edge.
 */
export function getLoggedClientIp(req: Request): string {
  const staticIp = process.env.STATIC_LOG_IP?.trim();
  if (staticIp) return staticIp;

  const cf = headerString(req, "cf-connecting-ip");
  if (cf && (process.env.TRUST_CLOUDFLARE === "1" || process.env.TRUST_CLOUDFLARE === "true")) {
    return cf.split(",")[0]!.trim();
  }

  if (process.env.VERCEL === "1") {
    const vercelClient = headerString(req, "x-vercel-forwarded-for");
    if (vercelClient) return vercelClient.split(",")[0]!.trim();
  }

  return req.ip || req.socket.remoteAddress || "-";
}
