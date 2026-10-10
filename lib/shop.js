// Shared shop logic used by both server.js (local) and api/* (Vercel serverless). Stateless: no database.
"use strict";
const crypto = require("node:crypto");

const DISCORD = "https://discord.gg/vyron";
const MINUTE = 60000, HOUR = 3600000, DAY = 86400000;
/* Prices live on the server so they can't be tampered with from the browser. */
const CATALOG = [{ name: "Premium Tweaks", price: 5, opts: ["Lifetime"] }];
const PAYMENT = {
  sol:      { type: "crypto", label: "Solana",   coin: "SOL", cg: "solana",   address: "GMjFESghmNJDk17YUecARhZbBftnCDDUdx72CJDdvKk4" },
  ltc:      { type: "crypto", label: "Litecoin", coin: "LTC", cg: "litecoin", address: "LeGJQcZ9bpBB4sYWAr3myLAHX3oqpKJmWN" },
  paypal:   { type: "ticket", label: "PayPal" },
  blik:     { type: "ticket", label: "BLIK" },
  giftcard: { type: "ticket", label: "Gift cards" },
};

const RATE_TTL = 15000;
let rateCache = { at: 0, rates: {} };
async function fetchJson(url, init) {
  const r = await fetch(url, { signal: AbortSignal.timeout(4000), ...init, headers: { Accept: "application/json", ...((init && init.headers) || {}) } });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}
async function loadRates() {
  const coins = Object.entries(PAYMENT).filter(([, p]) => p.type === "crypto");
  const out = {};
  try {
    const d = await fetchJson("https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&ids=" + coins.map(([, p]) => p.cg).join(","));
    for (const [id, p] of coins) { const v = d[p.cg] && d[p.cg].usd; if (v > 0) out[id] = v; }
  } catch {}
  for (const [id, p] of coins) {
    if (out[id]) continue;
    try { const d = await fetchJson(`https://api.coinbase.com/v2/prices/${p.coin}-USD/spot`); const v = Number(d.data.amount); if (v > 0) out[id] = v; } catch {}
    if (out[id]) continue;
    try { const d = await fetchJson(`https://api.binance.com/api/v3/ticker/price?symbol=${p.coin}USDT`); const v = Number(d.price); if (v > 0) out[id] = v; } catch {}
  }
  return out;
}
async function getRates() {
  if (Date.now() - rateCache.at < RATE_TTL && Object.keys(rateCache.rates).length) return rateCache;
  const fresh = await loadRates();
  if (Object.keys(fresh).length) rateCache = { at: Date.now(), rates: { ...rateCache.rates, ...fresh } };
  return rateCache;
}

/* ---------- Discord community counter ----------
   Reads the public member/online counts of our invite (no bot or token needed) and caches them for 5 minutes,
   so visitors never hit Discord directly. Returns null if Discord is unreachable and nothing is cached yet. */
const DISCORD_CODE = DISCORD.split("/").pop();
const DISCORD_TTL = 5 * 60000;
let dcCache = { at: 0, data: null };
async function getDiscordStats() {
  if (dcCache.data && Date.now() - dcCache.at < DISCORD_TTL) return dcCache.data;
  try {
    const d = await fetchJson(`https://discord.com/api/v10/invites/${encodeURIComponent(DISCORD_CODE)}?with_counts=true`);
    const members = Number(d.approximate_member_count), online = Number(d.approximate_presence_count);
    if (members > 0) dcCache = { at: Date.now(), data: { members, online: online > 0 ? online : 0 } };
  } catch {}
  return dcCache.data; // last known value if the refresh failed
}

/* ---------- Scratch-card coupons (stateless: no database) ----------
   A code looks like  VYRON15-HKXZ4A1B2C-5B7E0A44D1
                      ^pct   ^expiry+nonce  ^HMAC signature
   The percentage and expiry are baked into the code and signed with COUPON_SECRET, so the
   server can verify any code later without storing anything. The browser can't forge or edit one.

   Rules:
   - a code is valid for exactly COUPON_TTL_H hours (24 h) from the moment it is issued;
   - when it expires the visitor gets a NEW random code (the site shows a new scratch card);
   - re-rolling for a better discount does not work: the percentage is derived (HMAC) from the visitor's
     fingerprint (IP + browser) and the current UTC day, so asking again on the same day returns the same
     percentage. A different percentage can only come on a different day (i.e. after the old code expired). */
const COUPON_SECRET = process.env.COUPON_SECRET || "vyron-dev-secret-CHANGE-ME";
const ORDER_SECRET = process.env.ORDER_SECRET || COUPON_SECRET;
if (!process.env.COUPON_SECRET && (process.env.VERCEL || process.env.NODE_ENV === "production"))
  console.warn("[vyron] COUPON_SECRET is not set - coupon codes and order tokens can be forged. Set it in your environment variables.");
const COUPON_MIN = 5, COUPON_MAX = 20, COUPON_TTL_H = 24;
const couponSig = (pct, tok) => crypto.createHmac("sha256", COUPON_SECRET).update(pct + "." + tok).digest("hex").slice(0, 10).toUpperCase();

/* A stable, privacy-friendly identifier of the visitor: IP (IPv6 reduced to its /64) + User-Agent. Never stored or sent anywhere. */
function fingerprint(req) {
  const h = (req && req.headers) || {};
  let ip = String(h["x-forwarded-for"] || h["x-real-ip"] || (req && req.socket && req.socket.remoteAddress) || "").split(",")[0].trim();
  if (ip.includes(":") && !ip.includes(".")) ip = ip.split(":").slice(0, 4).join(":");
  return ip + "|" + String(h["user-agent"] || "").slice(0, 200);
}
/* Percentage for this visitor on this UTC day: pseudo-random (HMAC) but identical for repeated requests. */
function couponPct(fp, now) {
  const h = crypto.createHmac("sha256", COUPON_SECRET).update("pct|" + fp + "|" + Math.floor(now / DAY)).digest();
  return COUPON_MIN + (h.readUInt32BE(0) % (COUPON_MAX - COUPON_MIN + 1));
}

/* Issues a signed code that expires COUPON_TTL_H hours from now. */
function issueCoupon(fp, now) {
  now = now || Date.now();
  const pct = couponPct(fp || "", now);
  const expMin = Math.floor((now + COUPON_TTL_H * HOUR) / MINUTE);
  const tok = expMin.toString(36).toUpperCase() + crypto.randomBytes(2).toString("hex").toUpperCase();
  return { code: `VYRON${pct}-${tok}-${couponSig(pct, tok)}`, pct, exp: expMin * MINUTE };
}

/* Returns { code, pct, exp } for a valid, unexpired code - otherwise null. */
function verifyCoupon(raw, now) {
  const code = String(raw || "").trim().toUpperCase();
  const m = /^VYRON(\d{1,2})-([0-9A-Z]{8,12})-([0-9A-F]{10})$/.exec(code);
  if (!m) return null;
  const pct = Number(m[1]), tok = m[2];
  if (pct < COUPON_MIN || pct > COUPON_MAX) return null;
  const a = Buffer.from(couponSig(pct, tok)), b = Buffer.from(m[3]);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const exp = parseInt(tok.slice(0, -4), 36) * MINUTE;
  if (!(exp > (now || Date.now()))) return null;
  return { code, pct, exp };
}

/* ---------- Crypto orders (stateless, signed) ----------
   At checkout the server locks the coin amount for QUOTE_TTL_MIN minutes: USD total / exchange rate, plus a tiny
   unique "dust" (1-9999 units of 1e-8 coin, i.e. at most ~0.0001 coin) so every open order has its own exact amount.
   The order is returned as a signed token {id, method, units, created, totalCents, pct}; /api/verify reads the
   blockchain and looks for a transfer of exactly that amount to our address. Nothing is stored on the server. */
const QUOTE_TTL = 30 * MINUTE;          // how long the locked amount is offered to the customer
const QUOTE_GRACE = 15 * MINUTE;        // a payment sent in time is still detected for this long afterwards
const DUST_MAX = 9999;
const b64u = b => Buffer.from(b).toString("base64url");
const orderSig = body => crypto.createHmac("sha256", ORDER_SECRET).update("order:" + body).digest("base64url").slice(0, 27);
function signOrder(payload) { const body = b64u(JSON.stringify(payload)); return body + "." + orderSig(body); }
function parseOrder(token) {
  if (typeof token !== "string" || token.length > 600) return null;
  const [body, sig, extra] = token.split(".");
  if (!body || !sig || extra !== undefined) return null;
  const want = Buffer.from(orderSig(body)), got = Buffer.from(sig);
  if (want.length !== got.length || !crypto.timingSafeEqual(want, got)) return null;
  try {
    const o = JSON.parse(Buffer.from(body, "base64url").toString());
    if (!o || o.v !== 1 || !Object.hasOwn(PAYMENT, o.m) || PAYMENT[o.m].type !== "crypto" || !Number.isSafeInteger(o.u) || !Number.isSafeInteger(o.c)) return null;
    return o;
  } catch { return null; }
}
/* 1e-8 units -> "0.03334512" (string maths, no floating point) */
const fmtUnits = u => Math.floor(u / 1e8) + "." + String(u % 1e8).padStart(8, "0");

function send(res, code, body) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

/* Prices are recomputed here from the catalog; the browser only sends product ids, quantities and (optionally) a coupon code.
   Money is handled in integer cents so a discount never produces fractions of a cent.
   Error bodies carry a machine-readable `code` so the website can show them in the visitor's language. */
async function checkout(b) {
  b = b || {};
  const method = String(b.method || "");
  const pm = Object.hasOwn(PAYMENT, method) ? PAYMENT[method] : null;
  if (!pm) return { code: 400, body: { error: "Please choose a payment method", code: "choose_method" } };
  const items = (Array.isArray(b.items) ? b.items : []).slice(0, 10)
    .filter(i => i && Number.isInteger(i.productId) && CATALOG[i.productId] && Number.isInteger(i.qty) && i.qty >= 1 && i.qty <= 99);
  if (!items.length) return { code: 400, body: { error: "Invalid order", code: "invalid_order" } };
  let coupon = null;
  if (b.coupon) {
    coupon = verifyCoupon(b.coupon);
    if (!coupon) return { code: 400, body: { error: "This discount code is invalid or has expired", code: "coupon_invalid", couponInvalid: true } };
  }
  const subCents = items.reduce((a, i) => a + Math.round(CATALOG[i.productId].price * 100) * i.qty, 0);
  const totalCents = coupon ? Math.round(subCents * (100 - coupon.pct) / 100) : subCents;
  const orderId = crypto.randomBytes(3).toString("hex").toUpperCase();
  const body = {
    orderId,
    total: totalCents / 100,
    subtotal: subCents / 100,
    discount: (subCents - totalCents) / 100,
    coupon: coupon ? { code: coupon.code, pct: coupon.pct } : null,
    pay: { method, ...pm, discord: DISCORD },
  };
  if (pm.type === "crypto") {
    const cache = await getRates(), rate = cache.rates[method];
    if (!(rate > 0) || Date.now() - cache.at > 2 * MINUTE)
      return { code: 503, body: { error: "Exchange rates are unavailable right now. Please try again in a moment.", code: "rate_unavailable" } };
    const now = Date.now();
    const dust = 1 + crypto.createHmac("sha256", ORDER_SECRET).update("dust:" + orderId).digest().readUInt32BE(0) % DUST_MAX;
    const units = Math.ceil((totalCents / 100) / rate * 1e8) + dust;
    body.crypto = {
      amount: fmtUnits(units), rate, created: now, expires: now + QUOTE_TTL,
      token: signOrder({ v: 1, id: orderId, m: method, u: units, c: now, t: totalCents, p: coupon ? coupon.pct : 0 }),
    };
  }
  return { code: 201, body };
}

module.exports = {
  send, getRates, getDiscordStats, checkout, issueCoupon, verifyCoupon, fingerprint, signOrder, parseOrder, fmtUnits, fetchJson,
  CATALOG, PAYMENT, DISCORD, RATE_TTL, QUOTE_TTL, QUOTE_GRACE, MINUTE, HOUR, DAY, COUPON_TTL_H,
};
