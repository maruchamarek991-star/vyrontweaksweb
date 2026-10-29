// Build step:  node scripts/build.js
//   src/index.html, src/404.html, src/app.html  ->  public/
// Also writes public/sitemap.xml and public/robots.txt and adds a Content-Security-Policy to each page.
// Environment variable (optional):  SITE_URL  public address, e.g. https://vyron.lol
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const SITE_URL = (process.env.SITE_URL || "https://vyron.lol").replace(/\/+$/, "");
const SRC = path.join(__dirname, "..", "src");
const PUBLIC = path.join(__dirname, "..", "public");
const TODAY = new Date().toISOString().slice(0, 10);

function finish(html, canon) {
  html = html.split("__CANON__").join(canon).split("__SITE_URL__").join(SITE_URL);
  const hashes = [];
  html.replace(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi, (w, code) => {
    if (code.trim()) hashes.push("'sha256-" + crypto.createHash("sha256").update(code, "utf8").digest("base64") + "'");
    return w;
  });
  const csp = [
    "default-src 'none'", `script-src ${hashes.join(" ") || "'none'"}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", "font-src https://fonts.gstatic.com",
    "img-src 'self' data:", "connect-src 'self'", "manifest-src 'self'", "base-uri 'self'", "form-action 'none'",
  ].join("; ");
  return html.replace("<!--CSP-->", `<meta http-equiv="Content-Security-Policy" content="${csp}">`);
}
function write(rel, html) {
  fs.mkdirSync(path.dirname(path.join(PUBLIC, rel)), { recursive: true });
  fs.writeFileSync(path.join(PUBLIC, rel), html);
  console.log("built " + rel);
}
const read = f => fs.readFileSync(path.join(SRC, f), "utf-8");

write("index.html", finish(read("index.html"), SITE_URL + "/"));
write("404.html", finish(read("404.html"), SITE_URL + "/"));
write("app.html", read("app.html"));
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${SITE_URL}/</loc><lastmod>${TODAY}</lastmod><priority>1.0</priority></url>\n</urlset>\n`);
write("robots.txt", `User-agent: *\nAllow: /\nDisallow: /app.html\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
console.log("\nDone. Site URL: " + SITE_URL);
