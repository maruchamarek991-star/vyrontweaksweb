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

function send(res, code, body) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

/* Prices are recomputed here from the catalog; the browser only sends product ids and quantities. */
function checkout(b) {
  b = b || {};
  const method = String(b.method || "");
  const pm = Object.hasOwn(PAYMENT, method) ? PAYMENT[method] : null;
  if (!pm) return { code: 400, body: { error: "Please choose a payment method" } };
  const items = (Array.isArray(b.items) ? b.items : []).slice(0, 10)
    .filter(i => i && Number.isInteger(i.productId) && CATALOG[i.productId] && Number.isInteger(i.qty) && i.qty >= 1 && i.qty <= 99);
  if (!items.length) return { code: 400, body: { error: "Your cart is empty" } };
  const total = items.reduce((a, i) => a + CATALOG[i.productId].price * i.qty, 0);
  const orderId = crypto.randomBytes(3).toString("hex").toUpperCase();
  return { code: 201, body: { orderId, total, pay: { method, ...pm, discord: DISCORD } } };
}

module.exports = { send, getRates, checkout, RATE_TTL };
