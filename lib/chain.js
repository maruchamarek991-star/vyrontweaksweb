// Automatic crypto payment verification (SOL / LTC). Stateless: nothing is stored on the server.
//
// /api/verify receives the signed order token created at checkout, reads the public blockchain and looks for an
// incoming transfer to our address whose amount is EXACTLY the amount locked in the token (the amount contains a small
// unique "dust" part, so every open order has its own amount). Results are cached so polling visitors can never
// overload the public APIs: one address lookup per few seconds, and every transaction is fetched only once.
"use strict";
const { parseOrder, fetchJson, PAYMENT, QUOTE_TTL, QUOTE_GRACE, HOUR, fmtUnits } = require("./shop");

/* Endpoints. Override in the environment (e.g. a private Solana RPC such as Helius/QuickNode is much more reliable than the free public one). */
const SOL_RPC = () => process.env.SOL_RPC_URL || "https://api.mainnet-beta.solana.com";
const LTC_API = () => (process.env.LTC_API_URL || "https://litecoinspace.org/api").replace(/\/+$/, ""); // Esplora-compatible
const LTC_MIN_CONF = () => Math.max(1, Number(process.env.LTC_MIN_CONF) || 1);

/* ---------- tiny TTL cache with in-flight de-duplication ---------- */
const cache = new Map();
function memo(key, ttl, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.p;
  if (cache.size > 800) for (const k of cache.keys()) { cache.delete(k); if (cache.size < 400) break; }
  const p = Promise.resolve().then(fn);
  cache.set(key, { at: Date.now(), p });
  p.catch(() => { if (cache.get(key) && cache.get(key).p === p) cache.delete(key); });
  return p;
}
const drop = key => cache.delete(key);

/* ---------- Solana ---------- */
let rpcId = 0;
async function rpc(method, params) {
  const d = await fetchJson(SOL_RPC(), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: ++rpcId, method, params }) });
  if (d.error) throw new Error("RPC " + (d.error.message || d.error.code));
  return d.result;
}
/* Lamports our address received in this transaction (post balance - pre balance). */
async function solReceived(addr, sig) {
  const key = "sol:tx:" + sig;
  const tx = await memo(key, 6 * HOUR, () => rpc("getTransaction", [sig, { encoding: "json", maxSupportedTransactionVersion: 0, commitment: "confirmed" }]));
  if (!tx || !tx.meta || tx.meta.err) { drop(key); return 0; }
  const la = tx.meta.loadedAddresses || {};
  const keys = [...tx.transaction.message.accountKeys, ...(la.writable || []), ...(la.readonly || [])];
  const i = keys.indexOf(addr);
  return i < 0 ? 0 : tx.meta.postBalances[i] - tx.meta.preBalances[i];
}
async function solFind(o, addr) {
  const lamports = o.u * 10; // 1 unit = 1e-8 SOL = 10 lamports
  const sigs = await memo("sol:sigs:" + addr, 4000, () => rpc("getSignaturesForAddress", [addr, { limit: 40, commitment: "confirmed" }]));
  for (const s of sigs || []) {
    if (s.err) continue;
    const t = s.blockTime ? s.blockTime * 1000 : null;
    if (t && (t < o.c - 2 * HOUR || t > o.c + QUOTE_TTL + HOUR)) continue; // outside this order's window
    if ((await solReceived(addr, s.signature)) === lamports) {
      const fin = s.confirmationStatus === "finalized";
      return { txid: s.signature, confirmed: fin, confirmations: fin ? 1 : 0, required: 1 };
    }
  }
  return null;
}

/* ---------- Litecoin ---------- */
/* Both providers are normalised to [{ txid, received (litoshi to our address), conf, time (ms | null) }] */
async function ltcEsplora(addr) {
  const base = LTC_API();
  const [txs, tip] = await Promise.all([
    memo("ltc:es:" + addr, 4000, () => fetchJson(`${base}/address/${addr}/txs`)),
    memo("ltc:tip", 20000, async () => {
      const r = await fetch(`${base}/blocks/tip/height`, { signal: AbortSignal.timeout(4000) });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return Number(await r.text());
    }),
  ]);
  if (!Array.isArray(txs)) throw new Error("bad response");
  return txs.map(t => {
    const st = t.status || {}, conf = st.confirmed && tip > 0 ? Math.max(1, tip - st.block_height + 1) : 0;
    return { txid: t.txid, received: (t.vout || []).filter(v => v.scriptpubkey_address === addr).reduce((a, v) => a + v.value, 0), conf, time: st.confirmed && st.block_time ? st.block_time * 1000 : null };
  });
}
async function ltcBlockcypher(addr) {
  const d = await memo("ltc:bc:" + addr, 8000, () => fetchJson(`https://api.blockcypher.com/v1/ltc/main/addrs/${addr}/full?limit=25`));
  if (!d || !Array.isArray(d.txs)) throw new Error("bad response");
  return d.txs.map(t => ({
    txid: t.hash,
    received: (t.outputs || []).filter(v => (v.addresses || []).includes(addr)).reduce((a, v) => a + v.value, 0),
    conf: t.confirmations || 0,
    time: t.confirmed ? Date.parse(t.confirmed) : null,
  }));
}
async function ltcFind(o, addr) {
  let list;
  try { list = await ltcEsplora(addr); } catch { list = await ltcBlockcypher(addr); }
  for (const t of list) {
    if (t.received !== o.u) continue;
    if (t.time && (t.time < o.c - 2 * HOUR || t.time > o.c + QUOTE_TTL + HOUR)) continue;
    const need = LTC_MIN_CONF();
    return { txid: t.txid, confirmed: t.conf >= need, confirmations: t.conf, required: need };
  }
  return null;
}

/* ---------- Discord notification (optional: set DISCORD_WEBHOOK_URL) ---------- */
const notified = new Set(); // best effort: de-duplicates within one server instance
async function notify(o, f) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url || notified.has(o.id) || !/^https:\/\/(?:[a-z]+\.)?discord(?:app)?\.com\/api\/webhooks\//.test(url)) return;
  notified.add(o.id);
  const pm = PAYMENT[o.m], explorer = o.m === "sol" ? "https://solscan.io/tx/" : "https://litecoinspace.org/tx/";
  try {
    await fetch(url, {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(4000),
      body: JSON.stringify({ allowed_mentions: { parse: [] }, embeds: [{
        title: "✅ Crypto payment confirmed", color: 0x57f287, timestamp: new Date().toISOString(),
        fields: [
          { name: "Order", value: "#" + o.id, inline: true },
          { name: "Amount", value: `${fmtUnits(o.u)} ${pm.coin} ($${(o.t / 100).toFixed(2)}${o.p ? `, −${o.p}% coupon` : ""})`, inline: true },
          { name: "Transaction", value: explorer + f.txid },
        ],
      }] }),
    });
  } catch { notified.delete(o.id); }
}

/* ---------- main entry ---------- */
async function checkOrder(token) {
  const o = parseOrder(token);
  if (!o) return { code: 400, body: { error: "Invalid order token", code: "bad_token" } };
  const addr = PAYMENT[o.m].address, now = Date.now();
  const expires = o.c + QUOTE_TTL, dead = expires + QUOTE_GRACE;
  const base = { orderId: o.id, expires };
  let found = null, degraded = false;
  try { found = await (o.m === "sol" ? solFind(o, addr) : ltcFind(o, addr)); }
  catch { degraded = true; }
  if (found) {
    if (found.confirmed) notify(o, found);
    return { code: 200, body: { ...base, status: found.confirmed ? "confirmed" : "detected", txid: found.txid, confirmations: found.confirmations, required: found.required } };
  }
  if (now > dead) return { code: 200, body: { ...base, status: "expired", degraded } };
  return { code: 200, body: { ...base, status: "waiting", degraded } };
}

module.exports = { checkOrder, _cache: cache };
