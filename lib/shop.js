// Shared shop logic used by both server.js (local) and api/* (Vercel serverless). Stateless: no database.
"use strict";
const crypto = require("node:crypto");

const DISCORD = "https://discord.gg/vyron";
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
async function fetchJson(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(4000), headers: { Accept: "application/json" } });
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
   A code looks like  VYRON15-AQ3K1F9C-5B7E0A44D1
                      ^pct   ^expiry+nonce  ^HMAC signature
   The percentage and expiry are baked into the code and signed with COUPON_SECRET, so the
   server can verify any code later without storing anything. The browser can't forge or edit one. */
const COUPON_SECRET = process.env.COUPON_SECRET || "vyron-dev-secret-CHANGE-ME";
if (!process.env.COUPON_SECRET && (process.env.VERCEL || process.env.NODE_ENV === "production"))
  console.warn("[vyron] COUPON_SECRET is not set - coupon codes can be forged. Set it in your environment variables.");
const COUPON_MIN = 5, COUPON_MAX = 20, COUPON_TTL_H = 48;
const HOUR = 3600000;
const couponSig = (pct, tok) => crypto.createHmac("sha256", COUPON_SECRET).update(pct + "." + tok).digest("hex").slice(0, 10).toUpperCase();

/* Rolls a random discount (5-20 %) and returns a signed, expiring code. */
function issueCoupon() {
  const pct = crypto.randomInt(COUPON_MIN, COUPON_MAX + 1);
  const exp36 = Math.floor((Date.now() + COUPON_TTL_H * HOUR) / HOUR).toString(36).toUpperCase();
  const tok = exp36 + crypto.randomBytes(2).toString("hex").toUpperCase();
  const code = `VYRON${pct}-${tok}-${couponSig(pct, tok)}`;
  return { code, pct, exp: parseInt(exp36, 36) * HOUR };
}

/* Returns { code, pct, exp } for a valid, unexpired code - otherwise null. */
function verifyCoupon(raw) {
  const code = String(raw || "").trim().toUpperCase();
  const m = /^VYRON(\d{1,2})-([0-9A-Z]{8,12})-([0-9A-F]{10})$/.exec(code);
  if (!m) return null;
  const pct = Number(m[1]), tok = m[2];
  if (pct < COUPON_MIN || pct > COUPON_MAX) return null;
  const a = Buffer.from(couponSig(pct, tok)), b = Buffer.from(m[3]);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const exp = parseInt(tok.slice(0, -4), 36) * HOUR;
  if (!(exp > Date.now())) return null;
  return { code, pct, exp };
}

function send(res, code, body) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

/* Prices are recomputed here from the catalog; the browser only sends product ids, quantities and (optionally) a coupon code.
   Money is handled in integer cents so a discount never produces fractions of a cent. */
function checkout(b) {
  b = b || {};
  const method = String(b.method || "");
  const pm = Object.hasOwn(PAYMENT, method) ? PAYMENT[method] : null;
  if (!pm) return { code: 400, body: { error: "Please choose a payment method" } };
  const items = (Array.isArray(b.items) ? b.items : []).slice(0, 10)
    .filter(i => i && Number.isInteger(i.productId) && CATALOG[i.productId] && Number.isInteger(i.qty) && i.qty >= 1 && i.qty <= 99);
  if (!items.length) return { code: 400, body: { error: "Invalid order" } };
  let coupon = null;
  if (b.coupon) {
    coupon = verifyCoupon(b.coupon);
    if (!coupon) return { code: 400, body: { error: "This discount code is invalid or has expired", couponInvalid: true } };
  }
  const subCents = items.reduce((a, i) => a + Math.round(CATALOG[i.productId].price * 100) * i.qty, 0);
  const totalCents = coupon ? Math.round(subCents * (100 - coupon.pct) / 100) : subCents;
  const orderId = crypto.randomBytes(3).toString("hex").toUpperCase();
  return { code: 201, body: {
    orderId,
    total: totalCents / 100,
    subtotal: subCents / 100,
    discount: (subCents - totalCents) / 100,
    coupon: coupon ? { code: coupon.code, pct: coupon.pct } : null,
    pay: { method, ...pm, discord: DISCORD },
  } };
}

module.exports = { send, getRates, getDiscordStats, checkout, issueCoupon, verifyCoupon, RATE_TTL };
