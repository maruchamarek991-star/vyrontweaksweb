// Zentro — zero-dependency Node.js server with SQLite (requires Node 22.13+)
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");

const PORT = process.env.PORT || 3000;
const db = new DatabaseSync(path.join(__dirname, "zentro.db"));
db.exec("PRAGMA foreign_keys = ON");
db.exec(`
CREATE TABLE IF NOT EXISTS records(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, email TEXT DEFAULT '', role TEXT DEFAULT '',
  status TEXT DEFAULT 'Active', created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nick TEXT NOT NULL UNIQUE COLLATE NOCASE,
  salt TEXT NOT NULL, hash TEXT NOT NULL, created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS cart_items(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL, color INTEGER NOT NULL, opt INTEGER NOT NULL,
  qty INTEGER NOT NULL,
  UNIQUE(user_id, product_id, color, opt));
CREATE TABLE IF NOT EXISTS orders(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total INTEGER NOT NULL, items TEXT NOT NULL, created TEXT NOT NULL);
`);

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
  { name: "Minecraft Internal", soon: true, price: 5, colors: [["","#4ade80"]], opts: ["1 Day","7 Days","30 Days"], add: [0,10,20] },
  { name: "Valorant Internal",  price: 10, colors: [["","#f87171"]], opts: ["7 Days","30 Days","Lifetime"], add: [0,15,30] },
  { name: "Vanguard Emulator",  price: 15, colors: [["","#c4b5fd"]], opts: ["7 Days","2 Weeks","1 Month","Lifetime"], add: [0,5,25,45] },
  { name: "CS2 Internal", soon: true,       price: 8, colors: [["","#fbbf6a"]], opts: ["1 Day","7 Days","30 Days"], add: [0,17,37] },
  { name: "CS2 External", soon: true,       price: 6, colors: [["","#93c5fd"]], opts: ["1 Day","7 Days","30 Days"], add: [0,14,29] },
];

/* Payment methods. Crypto shows a wallet address; PayPal and gift cards go through a ticket on the Discord server. */
const DISCORD = "https://discord.gg/zentro";
const PAYMENT = {
  sol:      { type: "crypto", label: "Solana",    coin: "SOL", address: "GMjFESghmNJDk17YUecARhZbBftnCDDUdx72CJDdvKk4" },
  ltc:      { type: "crypto", label: "Litecoin",  coin: "LTC", address: "LeGJQcZ9bpBB4sYWAr3myLAHX3oqpKJmWN" },
  paypal:   { type: "ticket", label: "PayPal" },
  giftcard: { type: "ticket", label: "Gift cards" },
};

const SESSION_MS = 30 * 24 * 3600 * 1000;
const json = (res, code, body, headers = {}) => { res.writeHead(code, { "Content-Type": "application/json", ...headers }); res.end(JSON.stringify(body)); };
const readBody = req => new Promise(r => {
  let b = "";
  req.on("data", c => { b += c; if (b.length > 20000) req.destroy(); });
  req.on("end", () => { try { r(JSON.parse(b || "{}")); } catch { r({}); } });
  req.on("error", () => r({}));
});
const hashPw = (pw, salt) => crypto.scryptSync(pw, salt, 64).toString("hex");
const cookies = req => Object.fromEntries((req.headers.cookie || "").split(";").map(c => c.trim().split("=")).filter(c => c[0]).map(([k, ...v]) => [k, v.join("=")]));
const cookieHdr = (token, maxAge) => `zs=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`;

function userOf(req) {
  const t = cookies(req).zs;
  if (!t) return null;
  const row = db.prepare("SELECT u.id, u.nick, s.expires FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=?").get(t);
  if (!row) return null;
  if (row.expires < Date.now()) { db.prepare("DELETE FROM sessions WHERE token=?").run(t); return null; }
  return { id: row.id, nick: row.nick, token: t };
}
if (!db.prepare("PRAGMA table_info(orders)").all().some(c => c.name === "method")) db.exec("ALTER TABLE orders ADD COLUMN method TEXT NOT NULL DEFAULT ''");
function startSession(res, userId, nick, code = 200) {
  const token = crypto.randomBytes(32).toString("hex");
  db.prepare("INSERT INTO sessions(token,user_id,expires) VALUES(?,?,?)").run(token, userId, Date.now() + SESSION_MS);
  json(res, code, { nick }, { "Set-Cookie": cookieHdr(token, SESSION_MS / 1000) });
}
function cartOf(userId) {
  const rows = db.prepare("SELECT * FROM cart_items WHERE user_id=? ORDER BY id").all(userId);
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

  /* ---- Auth ---- */
  if (p === "/api/register" && req.method === "POST") {
    const b = await readBody(req);
    const nick = String(b.nick || "").trim(), pw = String(b.password || "");
    if (!/^[A-Za-z0-9_]{3,20}$/.test(nick)) return json(res, 400, { error: "Nickname must be 3–20 characters: letters, numbers or _" });
    if (pw.length < 6 || pw.length > 100) return json(res, 400, { error: "Password must be at least 6 characters" });
    if (db.prepare("SELECT 1 FROM users WHERE nick=?").get(nick)) return json(res, 409, { error: "This nickname is already taken" });
    const salt = crypto.randomBytes(16).toString("hex");
    const r = db.prepare("INSERT INTO users(nick,salt,hash,created) VALUES(?,?,?,?)").run(nick, salt, hashPw(pw, salt), new Date().toISOString());
    return startSession(res, Number(r.lastInsertRowid), nick, 201);
  }
  if (p === "/api/login" && req.method === "POST") {
    const b = await readBody(req);
    const u = db.prepare("SELECT * FROM users WHERE nick=?").get(String(b.nick || "").trim());
    const given = Buffer.from(hashPw(String(b.password || ""), u ? u.salt : "00"), "hex");
    const ok = u && crypto.timingSafeEqual(given, Buffer.from(u.hash, "hex"));
    if (!ok) return json(res, 401, { error: "Wrong nickname or password" });
    return startSession(res, u.id, u.nick);
  }
  if (p === "/api/logout" && req.method === "POST") {
    const u = userOf(req);
    if (u) db.prepare("DELETE FROM sessions WHERE token=?").run(u.token);
    return json(res, 200, { ok: true }, { "Set-Cookie": cookieHdr("", 0) });
  }
  if (p === "/api/me" && req.method === "GET") {
    const u = userOf(req);
    return json(res, 200, { nick: u ? u.nick : null });
  }

  /* ---- Cart (login required) ---- */
  const cm = p.match(/^\/api\/cart(?:\/(\d+))?$/);
  if (cm) {
    const u = userOf(req);
    if (!u) return json(res, 401, { error: "Please log in" });
    if (req.method === "GET" && !cm[1]) return json(res, 200, cartOf(u.id));
    if (req.method === "POST" && !cm[1]) {
      const b = await readBody(req), pr = CATALOG[b.productId];
      if (pr && pr.soon) return json(res, 400, { error: "This product is not released yet" });
      if (!pr || !int(b.color, 0, pr.colors.length - 1) || !int(b.opt, 0, pr.opts.length - 1) || !int(b.qty, 1, 9)) return json(res, 400, { error: "Invalid item" });
      db.prepare(`INSERT INTO cart_items(user_id,product_id,color,opt,qty) VALUES(?,?,?,?,?)
        ON CONFLICT(user_id,product_id,color,opt) DO UPDATE SET qty=MIN(99, qty+excluded.qty)`).run(u.id, b.productId, b.color, b.opt, b.qty);
      return json(res, 200, cartOf(u.id));
    }
    if (req.method === "PATCH" && cm[1]) {
      const b = await readBody(req);
      if (!int(b.qty, 1, 99)) return json(res, 400, { error: "Invalid quantity" });
      db.prepare("UPDATE cart_items SET qty=? WHERE id=? AND user_id=?").run(b.qty, Number(cm[1]), u.id);
      return json(res, 200, cartOf(u.id));
    }
    if (req.method === "DELETE" && cm[1]) {
      db.prepare("DELETE FROM cart_items WHERE id=? AND user_id=?").run(Number(cm[1]), u.id);
      return json(res, 200, cartOf(u.id));
    }
    return json(res, 405, { error: "method not allowed" });
  }
  if (p === "/api/checkout" && req.method === "POST") {
    const u = userOf(req);
    if (!u) return json(res, 401, { error: "Please log in" });
    const b = await readBody(req), method = String(b.method || ""), pm = Object.hasOwn(PAYMENT, method) ? PAYMENT[method] : null;
    if (!pm) return json(res, 400, { error: "Please choose a payment method" });
    const c = cartOf(u.id);
    if (!c.items.length) return json(res, 400, { error: "Your cart is empty" });
    const r = db.prepare("INSERT INTO orders(user_id,total,items,created,method) VALUES(?,?,?,?,?)").run(u.id, c.total, JSON.stringify(c.items), new Date().toISOString(), method);
    db.prepare("DELETE FROM cart_items WHERE user_id=?").run(u.id);
    return json(res, 201, { orderId: Number(r.lastInsertRowid), total: c.total, pay: { method, ...pm, discord: DISCORD } });
  }

  /* ---- Order history (login required) ---- */
  if (p === "/api/orders" && req.method === "GET") {
    const u = userOf(req);
    if (!u) return json(res, 401, { error: "Please log in" });
    const rows = db.prepare("SELECT id,total,items,created,method FROM orders WHERE user_id=? ORDER BY id DESC LIMIT 100").all(u.id);
    return json(res, 200, rows.map(r => {
      let items = []; try { items = JSON.parse(r.items); } catch {}
      const pm = Object.hasOwn(PAYMENT, r.method) ? PAYMENT[r.method] : null;
      return { id: r.id, total: r.total, created: r.created, method: pm ? r.method : "", label: pm ? pm.label : "",
        items: items.map(i => ({ productId: i.productId, name: i.name, opt: i.opt, qty: i.qty, line: i.line })) };
    }));
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
}).listen(PORT, () => console.log(`Zentro running at http://localhost:${PORT}`));
