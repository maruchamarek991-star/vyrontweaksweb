// Vyron — local dev server (Node 22.13+). On Vercel, public/ is served statically and api/* run as serverless functions.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const PORT = process.env.PORT || 3000;
const db = new DatabaseSync(path.join(__dirname, "vyron.db"));
db.exec(`CREATE TABLE IF NOT EXISTS records(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, email TEXT DEFAULT '', role TEXT DEFAULT '',
  status TEXT DEFAULT 'Active', created TEXT NOT NULL)`);

const json = (res, code, body) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };
const readBody = req => new Promise(r => {
  let b = "";
  req.on("data", c => { b += c; if (b.length > 20000) req.destroy(); });
  req.on("end", () => { try { r(JSON.parse(b || "{}")); } catch { r({}); } });
  req.on("error", () => r({}));
});

/* Shop endpoints reuse the exact same handlers Vercel runs */
const ROUTES = [
  [/^\/api\/rates$/, "./api/rates.js"],
  [/^\/api\/checkout$/, "./api/checkout.js"],
  [/^\/api\/orders\/\d+\/sent$/, "./api/orders/[id]/sent.js"],
];

http.createServer(async (req, res) => {
  const p = new URL(req.url, "http://x").pathname;

  const route = ROUTES.find(([re]) => re.test(p));
  if (route) { req.body = await readBody(req); try { return await require(route[1])(req, res); } catch { return json(res, 500, { error: "Server error" }); } }

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
  res.writeHead(200, { "Content-Type": file.endsWith(".html") ? "text/html; charset=utf-8" : file.endsWith(".png") ? "image/png" : "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`Vyron running at http://localhost:${PORT}`));
