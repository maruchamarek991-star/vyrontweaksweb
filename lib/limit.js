// Tiny in-memory rate limiter for the API routes. No database, no environment variables, nothing to set up on Vercel.
// Best effort by design: every serverless instance keeps its own counters, so the real limit is "per IP, per instance".
// That is still plenty to stop a script from hammering /api/* (and, through it, CoinGecko / the Solana RPC / the Litecoin explorers).
// The limits are generous: a real visitor polls /api/verify every 5 s = 12 requests/min.
"use strict";

const buckets = new Map(); // "route|ip" -> { n, reset }

function clientIp(req) {
  const h = (req && req.headers) || {};
  // On Vercel x-forwarded-for / x-vercel-forwarded-for are set by the platform and cannot be spoofed by the visitor.
  let ip = String(h["x-vercel-forwarded-for"] || h["x-forwarded-for"] || h["x-real-ip"] || (req && req.socket && req.socket.remoteAddress) || "")
    .split(",")[0].trim();
  if (ip.includes(":") && !ip.includes(".")) ip = ip.split(":").slice(0, 4).join(":"); // IPv6: one household / ISP prefix = one visitor
  return ip || "unknown";
}

/* Counts one request. Returns 0 if allowed, otherwise the number of seconds to wait. */
function hit(name, ip, max, windowMs, now = Date.now()) {
  if (buckets.size > 5000) for (const [k, b] of buckets) if (b.reset <= now) buckets.delete(k);
  if (buckets.size > 20000) buckets.clear(); // hard cap on memory
  const key = name + "|" + ip;
  let b = buckets.get(key);
  if (!b || b.reset <= now) { b = { n: 0, reset: now + windowMs }; buckets.set(key, b); }
  b.n++;
  return b.n > max ? Math.max(1, Math.ceil((b.reset - now) / 1000)) : 0;
}

/* Wraps an API handler: at most `max` requests per `windowMs` per visitor. */
function limited(name, max, windowMs, handler) {
  return (req, res) => {
    const wait = hit(name, clientIp(req), max, windowMs);
    if (wait) {
      res.statusCode = 429;
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Retry-After", String(wait));
      return res.end(JSON.stringify({ error: "Too many requests. Please slow down and try again in a moment.", code: "rate_limited" }));
    }
    return handler(req, res);
  };
}

module.exports = { limited, hit, clientIp, _buckets: buckets };
