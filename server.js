// Vyron — zero-dependency Node.js server with SQLite (requires Node 22.13+)
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");

const PORT = process.env.PORT || 3000;
const db = new DatabaseSync(path.join(__dirname, "vyron.db"));
db.exec("PRAGMA foreign_keys = ON");
db.exec(`
CREATE TABLE IF NOT EXISTS records(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, email TEXT DEFAULT '', role TEXT DEFAULT '',
  status TEXT DEFAULT 'Active', created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS guests(
  token TEXT PRIMARY KEY,
  created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS cart_items(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guest TEXT NOT NULL REFERENCES guests(token) ON DELETE CASCADE,
  product_id INTEGER NOT NULL, color INTEGER NOT NULL, opt INTEGER NOT NULL,
  qty INTEGER NOT NULL,
  UNIQUE(guest, product_id, color, opt));
CREATE TABLE IF NOT EXISTS orders(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guest TEXT NOT NULL,
  total INTEGER NOT NULL, items TEXT NOT NULL, created TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT '');
`);
if (!db.prepare("PRAGMA table_info(orders)").all().some(c => c.name === "status")) db.exec("ALTER TABLE orders ADD COLUMN status TEXT NOT NULL DEFAULT 'awaiting'");

if (db.prepare("SELECT COUNT(*) c FROM records").get().c === 0) {
  const ins = db.prepare("INSERT INTO records(name,email,role,status,created) VALUES(?,?,?,?,?)");
  [["Ava Morgan","ava@example.com","Engineer","Active","2026-08-12"],
   ["Liam Carter","liam@example.com","Designer","Active","2026-08-30"],
   ["Noah Reed","noah@example.com","Product Manager","Pending","2026-09-04"],
   ["Mia Foster","mia@example.com","Analyst","Archived","2026-09-15"],
   ["Ethan Hayes","ethan@example.com","Support","Active","2026-09-28"]].forEach(r => ins.run(...r));
}

/* Product catalog lives on the server so prices can't be tampered with from the browser. */
const CATALOG = [
  { name: "Premium Tweaks", price: 5, colors: [["", "#d9dcff"]], opts: ["Lifetime"], add: [0] },
];

/* Payment methods. Crypto shows a wallet address (with a live amount); PayPal, BLIK and gift cards go through a ticket on the Discord server.
   To add another coin, add an entry with "cg" (CoinGecko id) and "sym" (ticker) and a matching option in the front-end list. */
const DISCORD = "https://discord.gg/vyron";
const PAYMENT = {
  sol:      { type: "crypto", label: "Solana",    coin: "SOL", cg: "solana",   address: "GMjFESghmNJDk17YUecARhZbBftnCDDUdx72CJDdvKk4" },
  ltc:      { type: "crypto", label: "Litecoin",  coin: "LTC", cg: "litecoin", address: "LeGJQcZ9bpBB4sYWAr3myLAHX3oqpKJmWN" },
  paypal:   { type: "ticket", label: "PayPal" },
  blik:     { type: "ticket", label: "BLIK" },
  giftcard: { type: "ticket", label: "Gift cards" },
};

/* Live USD prices for every crypto in PAYMENT. Cached for a few seconds; several public sources are tried in turn. */
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
  try { // 1) CoinGecko, one request for all coins
    const d = await fetchJson("https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&ids=" + coins.map(([, p]) => p.cg).join(","));
    for (const [id, p] of coins) { const v = d[p.cg] && d[p.cg].usd; if (v > 0) out[id] = v; }
  } catch {}
  for (const [id, p] of coins) { // 2) Coinbase, then 3) Binance for anything still missing
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

/* No accounts and no Discord login: every visitor gets an anonymous cart tied to a random cookie. */
const COOKIE_MS = 30 * 24 * 3600 * 1000;
const json = (res, code, body, headers = {}) => { res.writeHead(code, { "Content-Type": "application/json", ...headers }); res.end(JSON.stringify(body)); };
const readBody = req => new Promise(r => {
  let b = "";
  req.on("data", c => { b += c; if (b.length > 20000) req.destroy(); });
  req.on("end", () => { try { r(JSON.parse(b || "{}")); } catch { r({}); } });
  req.on("error", () => r({}));
});
const cookies = req => Object.fromEntries((req.headers.cookie || "").split(";").map(c => c.trim().split("=")).filter(c => c[0]).map(([k, ...v]) => [k, v.join("=")]));
const cookieHdr = (token, maxAge) => `vs=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`;

/* Returns the visitor's guest token, creating one (and a Set-Cookie header) on first use. */
function guestOf(req) {
  const t = cookies(req).vs;
  if (t && /^[a-f0-9]{64}$/.test(t) && db.prepare("SELECT 1 FROM guests WHERE token=?").get(t)) return { token: t, headers: {} };
  const token = crypto.randomBytes(32).toString("hex");
  db.prepare("INSERT INTO guests(token,created) VALUES(?,?)").run(token, new Date().toISOString());
  return { token, headers: { "Set-Cookie": cookieHdr(token, COOKIE_MS / 1000) } };
}
function cartOf(guest) {
  const rows = db.prepare("SELECT * FROM cart_items WHERE guest=? ORDER BY id").all(guest);
  const items = rows.map(r => {
    const p = CATALOG[r.product_id];
    const unit = p.price + p.add[r.opt];
    return { id: r.id, productId: r.product_id, name: p.name, color: p.colors[r.color][0], hex: p.colors[r.color][1], opt: p.opts[r.opt], qty: r.qty, unit, line: unit * r.qty };
  });
  return { items, count: items.reduce((a, i) => a + i.qty, 0), total: items.reduce((a, i) => a + i.line, 0) };
}
const int = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const p = url.pathname;

  /* ---- Cart (no login required) ---- */
  const cm = p.match(/^\/api\/cart(?:\/(\d+))?$/);
  if (cm) {
    const g = guestOf(req), H = g.headers;
    if (req.method === "GET" && !cm[1]) return json(res, 200, cartOf(g.token), H);
    if (req.method === "POST" && !cm[1]) {
      const b = await readBody(req), pr = CATALOG[b.productId];
      if (!pr || !int(b.color, 0, pr.colors.length - 1) || !int(b.opt, 0, pr.opts.length - 1) || !int(b.qty, 1, 9)) return json(res, 400, { error: "Invalid item" }, H);
      db.prepare(`INSERT INTO cart_items(guest,product_id,color,opt,qty) VALUES(?,?,?,?,?)
        ON CONFLICT(guest,product_id,color,opt) DO UPDATE SET qty=MIN(99, qty+excluded.qty)`).run(g.token, b.productId, b.color, b.opt, b.qty);
      return json(res, 200, cartOf(g.token), H);
    }
    if (req.method === "PATCH" && cm[1]) {
      const b = await readBody(req);
      if (!int(b.qty, 1, 99)) return json(res, 400, { error: "Invalid quantity" }, H);
      db.prepare("UPDATE cart_items SET qty=? WHERE id=? AND guest=?").run(b.qty, Number(cm[1]), g.token);
      return json(res, 200, cartOf(g.token), H);
    }
    if (req.method === "DELETE" && cm[1]) {
      db.prepare("DELETE FROM cart_items WHERE id=? AND guest=?").run(Number(cm[1]), g.token);
      return json(res, 200, cartOf(g.token), H);
    }
    return json(res, 405, { error: "method not allowed" }, H);
  }
  if (p === "/api/rates" && req.method === "GET") {
    const c = await getRates();
    return json(res, 200, { rates: c.rates, updated: c.at, stale: Date.now() - c.at > 3 * RATE_TTL }, { "Cache-Control": "no-store" });
  }
  const sm = p.match(/^\/api\/orders\/(\d+)\/sent$/);
  if (sm && req.method === "POST") {
    const g = guestOf(req), H = g.headers;
    const r = db.prepare("UPDATE orders SET status='sent' WHERE id=? AND guest=?").run(Number(sm[1]), g.token);
    if (!r.changes) return json(res, 404, { error: "Order not found" }, H);
    return json(res, 200, { ok: true, status: "sent" }, H);
  }
  if (p === "/api/checkout" && req.method === "POST") {
    const g = guestOf(req), H = g.headers;
    const b = await readBody(req), method = String(b.method || ""), pm = Object.hasOwn(PAYMENT, method) ? PAYMENT[method] : null;
    if (!pm) return json(res, 400, { error: "Please choose a payment method" }, H);
    const c = cartOf(g.token);
    if (!c.items.length) return json(res, 400, { error: "Your cart is empty" }, H);
    const r = db.prepare("INSERT INTO orders(guest,total,items,created,method) VALUES(?,?,?,?,?)").run(g.token, c.total, JSON.stringify(c.items), new Date().toISOString(), method);
    db.prepare("DELETE FROM cart_items WHERE guest=?").run(g.token);
    return json(res, 201, { orderId: Number(r.lastInsertRowid), total: c.total, pay: { method, ...pm, discord: DISCORD } }, H);
  }

  /* ---- Records (dashboard) ---- */
  const m = p.match(/^\/api\/records(?:\/(\d+))?$/);
  if (m) {
    if (req.method === "GET") return json(res, 200, db.prepare("SELECT * FROM records ORDER BY id DESC").all());
    if (req.method === "POST") {
      const b = await readBody(req);
      if (!b.name || !String(b.name).trim()) return json(res, 400, { error: "name required" });
      const r = db.prepare("INSERT INTO records(name,email,role,status,created) VALUES(?,?,?,?,?)")
        .run(String(b.name).trim(), b.email || "", b.role || "", b.status || "Active", b.created || new Date().toISOString().slice(0, 10));
      return json(res, 201, { id: Number(r.lastInsertRowid) });
    }
    if (req.method === "DELETE" && m[1]) { db.prepare("DELETE FROM records WHERE id=?").run(Number(m[1])); return json(res, 200, { ok: true }); }
    return json(res, 405, { error: "method not allowed" });
  }

  /* ---- Static files ---- */
  const root = path.join(__dirname, "public");
  const file = path.join(root, p === "/" ? "index.html" : path.normalize(p));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end("Not found"); }
  res.writeHead(200, { "Content-Type": file.endsWith(".html") ? "text/html; charset=utf-8" : file.endsWith(".png") ? "image/png" : /\.jpe?g$/.test(file) ? "image/jpeg" : file.endsWith(".webp") ? "image/webp" : "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`Vyron running at http://localhost:${PORT}`));
