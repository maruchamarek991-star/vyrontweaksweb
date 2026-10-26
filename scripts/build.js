// Build step:  node scripts/build.js
//
//   src/*.html + src/i18n.js + src/pl/*.html   ->   public/
//
//   public/index.html            English landing page            (/)
//   public/pl/index.html         Polish landing page             (/pl/)   <- same source, text from src/i18n.js
//   public/{terms,privacy,refund}.html     English legal pages
//   public/pl/{terms,privacy,refund}.html  Polish legal pages (hand-translated in src/pl/)
//   public/404.html, public/sitemap.xml, public/robots.txt
//
// What the build does for every page: fills in the language-specific text, canonical/hreflang/Open Graph tags, JSON-LD
// structured data (landing page), obfuscates the inline scripts, and adds a Content-Security-Policy meta tag that
// whitelists exactly those scripts by SHA-256 hash.
//
// Environment variables (all optional):
//   SITE_URL          public address, e.g. https://vyron.lol          (default below)
//   ANALYTICS_DOMAIN  e.g. vyron.lol - turns on Plausible Analytics (cookie-free). Leave unset for no analytics at all.
"use strict";
globalThis.self = globalThis; // the vendored bundle expects a browser-like global
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const JSObfuscator = require("../tools/obfuscator.js");
const I18N = require("../src/i18n.js");
const { CATALOG } = require("../lib/shop.js");

const DEFAULT_SITE_URL = "https://vyron.lol";
const SITE_URL = (process.env.SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, "");
const ANALYTICS = (process.env.ANALYTICS_DOMAIN || "").trim();
if (SITE_URL.includes("your-domain")) console.warn("WARNING: SITE_URL is not set - canonical/Open Graph links point to " + SITE_URL);

const SRC = path.join(__dirname, "..", "src");
const PUBLIC = path.join(__dirname, "..", "public");
const TODAY = new Date().toISOString().slice(0, 10);

const OPTIONS = {
  compact: true, controlFlowFlattening: true, controlFlowFlatteningThreshold: 0.4,
  deadCodeInjection: true, deadCodeInjectionThreshold: 0.2,
  stringArray: true, stringArrayEncoding: ["base64"], stringArrayThreshold: 0.75,
  identifierNamesGenerator: "hexadecimal", renameGlobals: true,
  selfDefending: false, disableConsoleOutput: false, target: "browser",
};

const norm = s => s.replace(/\s+/g, " ").trim();
const attrEsc = s => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
const attrUnesc = s => s.replace(/&quot;/g, '"').replace(/&amp;/g, "&");
const stripTags = s => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

/* ---------- i18n: fill data-i18n / data-i18n-attr from the dictionary ---------- */
function translate(html, lang, file) {
  const dict = I18N[lang], errors = [];
  // 1) element content:  <tag ... data-i18n="key">...</tag>
  const re = /<([a-zA-Z][\w-]*)\b[^>]*?\bdata-i18n="([^"]+)"[^>]*>/g;
  let out = "", last = 0, m;
  while ((m = re.exec(html))) {
    const tag = m[1], key = m[2], openEnd = m.index + m[0].length;
    if (dict[key] === undefined) { errors.push(`missing key "${key}" in ${lang}`); continue; }
    const closeRe = new RegExp(`<(/?)${tag}\\b[^>]*>`, "gi"); closeRe.lastIndex = openEnd;
    let depth = 1, c;
    while ((c = closeRe.exec(html))) { if (c[1]) depth--; else if (!/\/>$/.test(c[0])) depth++; if (!depth) break; }
    if (!c) { errors.push(`unclosed <${tag}> for "${key}"`); continue; }
    const inner = html.slice(openEnd, c.index);
    if (lang === "en" && norm(inner) !== norm(I18N.en[key])) errors.push(`"${key}": HTML text differs from src/i18n.js\n      html: ${norm(inner)}\n      i18n: ${norm(I18N.en[key])}`);
    out += html.slice(last, openEnd) + dict[key]; last = c.index; re.lastIndex = c.index;
  }
  out += html.slice(last);
  // 2) attributes:  data-i18n-attr="aria-label:key;content:key2"
  out = out.replace(/<[a-zA-Z][^>]*\bdata-i18n-attr="([^"]+)"[^>]*>/g, tag => {
    const spec = tag.match(/data-i18n-attr="([^"]+)"/)[1];
    for (const pair of spec.split(";")) {
      const i = pair.indexOf(":"), attr = pair.slice(0, i), key = pair.slice(i + 1);
      if (dict[key] === undefined) { errors.push(`missing attr key "${key}" in ${lang}`); continue; }
      const ar = new RegExp(`(\\s${attr}=")([^"]*)(")`);
      const cur = tag.match(ar);
      if (!cur) { errors.push(`attribute ${attr} not found for "${key}"`); continue; }
      if (lang === "en" && norm(attrUnesc(cur[2])) !== norm(I18N.en[key])) errors.push(`"${key}" (${attr}): HTML differs from src/i18n.js\n      html: ${cur[2]}\n      i18n: ${I18N.en[key]}`);
      tag = tag.replace(ar, (_, a, __, b) => a + attrEsc(dict[key]) + b);
    }
    return tag;
  });
  if (errors.length) { console.error(`\ni18n problems in ${file} (${lang}):\n  - ` + errors.join("\n  - ")); process.exit(1); }
  return out;
}

/* ---------- JSON-LD (landing page) ---------- */
function jsonLd(lang, canon) {
  const d = I18N[lang], price = CATALOG[0].price.toFixed(2);
  const faq = [];
  for (let i = 1; d["faq.q" + i]; i++) faq.push({ "@type": "Question", name: d["faq.q" + i], acceptedAnswer: { "@type": "Answer", text: stripTags(d["faq.a" + i]) } });
  const graph = [
    { "@type": "Organization", "@id": SITE_URL + "/#org", name: "Vyron", url: SITE_URL + "/", logo: SITE_URL + "/logo.png", sameAs: ["https://discord.gg/vyron"] },
    { "@type": "WebSite", "@id": SITE_URL + "/#site", name: "Vyron Tweaks", url: SITE_URL + "/", inLanguage: lang, publisher: { "@id": SITE_URL + "/#org" } },
    { "@type": "SoftwareApplication", name: "Vyron Tweaks", description: d["meta.desc"], url: canon, image: SITE_URL + "/og-image.png", inLanguage: lang,
      applicationCategory: "UtilitiesApplication", operatingSystem: "Windows 10, Windows 11", publisher: { "@id": SITE_URL + "/#org" },
      offers: { "@type": "Offer", price, priceCurrency: "USD", availability: "https://schema.org/InStock", url: canon } },
    { "@type": "FAQPage", inLanguage: lang, mainEntity: faq },
  ];
  const json = JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c");
  return `<script type="application/ld+json">${json}</script>`;
}

/* ---------- common page pipeline ---------- */
function finish(html, { lang, canon, altEn, altPl, jsonld }) {
  const other = lang === "pl" ? "en_US" : "pl_PL";
  html = html.replace(/<html lang="[a-z]+"/, `<html lang="${lang}"`)
    .split("__CANON__").join(canon).split("__ALT_EN__").join(altEn).split("__ALT_PL__").join(altPl)
    .split("__LOCALE_ALT__").join(other).split("__LOCALE__").join(lang === "pl" ? "pl_PL" : "en_US")
    .split("__SITE_URL__").join(SITE_URL);
  html = html.replace("<!--JSONLD-->", jsonld || "");
  // analytics: off unless ANALYTICS_DOMAIN is set; the privacy-policy line about it is removed when it is off
  html = html.replace("<!--ANALYTICS-->", ANALYTICS ? `<script defer data-domain="${ANALYTICS}" src="https://plausible.io/js/script.js"></script>` : "");
  if (!ANALYTICS) html = html.replace(/<li data-analytics>[\s\S]*?<\/li>\n?/g, "");
  else html = html.replace(/<li data-analytics>/g, "<li>");

  // obfuscate inline scripts (never the I18N data block) and collect their hashes for the CSP
  const hashes = [];
  html = html.replace(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi, (whole, attrs, code) => {
    if (!code.trim()) return whole;
    if (/application\/ld\+json/.test(attrs)) return whole;
    if (!/data-noobf/.test(attrs)) code = JSObfuscator.obfuscate(code, OPTIONS).getObfuscatedCode();
    hashes.push("'sha256-" + crypto.createHash("sha256").update(code, "utf8").digest("base64") + "'");
    return `<script${attrs.replace(/\s*data-noobf/, "")}>${code}</script>`;
  });
  const plaus = ANALYTICS ? " https://plausible.io" : "";
  const csp = [
    "default-src 'none'", `script-src ${hashes.join(" ")}${plaus}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", "font-src https://fonts.gstatic.com",
    "img-src 'self' data:", "media-src 'self'", `connect-src 'self'${plaus}`, "manifest-src 'self'", "base-uri 'self'", "form-action 'none'",
  ].join("; ");
  return html.replace("<!--CSP-->", `<meta http-equiv="Content-Security-Policy" content="${csp}">`);
}

function write(rel, html) {
  const out = path.join(PUBLIC, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  console.log("built " + rel.replace(/\\/g, "/"));
}
const read = f => fs.readFileSync(path.join(SRC, f), "utf-8");
const url = p => SITE_URL + p;

fs.mkdirSync(PUBLIC, { recursive: true });

/* 1. landing page, once per language */
{
  const source = read("index.html");
  for (const lang of ["en", "pl"]) {
    let html = translate(source, lang, "index.html");
    if (lang === "pl") {
      html = html.replace(/href="\/(terms|privacy|refund)\.html"/g, 'href="/pl/$1.html"')
        .replace('data-lang="pl" lang="pl" title="Polski" aria-pressed="false"', 'class="on" data-lang="pl" lang="pl" title="Polski" aria-pressed="true"')
        .replace('class="on" data-lang="en" lang="en" title="English" aria-pressed="true"', 'data-lang="en" lang="en" title="English" aria-pressed="false"');
    }
    // the dictionary is embedded as data (not obfuscated: it is public text anyway)
    html = html.replace("<!--I18N-->", `<script data-noobf>const I18N=${JSON.stringify(I18N).replace(/</g, "\\u003c")};</script>`);
    const canon = lang === "pl" ? url("/pl/") : url("/");
    html = finish(html, { lang, canon, altEn: url("/"), altPl: url("/pl/"), jsonld: jsonLd(lang, canon) });
    write(lang === "pl" ? "pl/index.html" : "index.html", html);
  }
}

/* 2. legal pages (English from src/, Polish from src/pl/) */
const LEGAL = ["terms", "privacy", "refund"];
for (const name of LEGAL) {
  for (const lang of ["en", "pl"]) {
    const rel = lang === "pl" ? `pl/${name}.html` : `${name}.html`;
    const html = finish(fs.readFileSync(path.join(SRC, rel), "utf-8"), { lang, canon: url("/" + rel), altEn: url(`/${name}.html`), altPl: url(`/pl/${name}.html`) });
    write(rel, html);
  }
}

/* 3. 404 and the (noindex) dashboard */
write("404.html", finish(read("404.html"), { lang: "en", canon: url("/"), altEn: url("/"), altPl: url("/pl/") }));
{
  const html = read("app.html").replace(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi, (w, a, code) => code.trim() ? `<script${a}>${JSObfuscator.obfuscate(code, OPTIONS).getObfuscatedCode()}</script>` : w);
  write("app.html", html);
}

/* 4. sitemap.xml + robots.txt */
{
  const pages = [["/", "/pl/", "1.0"], ...LEGAL.map(n => [`/${n}.html`, `/pl/${n}.html`, "0.3"])];
  const alt = (en, pl) => `<xhtml:link rel="alternate" hreflang="en" href="${url(en)}"/><xhtml:link rel="alternate" hreflang="pl" href="${url(pl)}"/><xhtml:link rel="alternate" hreflang="x-default" href="${url(en)}"/>`;
  const entries = pages.flatMap(([en, pl, prio]) => [en, pl].map(loc => `  <url><loc>${url(loc)}</loc><lastmod>${TODAY}</lastmod><priority>${prio}</priority>${alt(en, pl)}</url>`));
  write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join("\n")}\n</urlset>\n`);
  write("robots.txt", `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /app.html\n\nSitemap: ${url("/sitemap.xml")}\n`);
}
console.log(`\nDone. Site URL: ${SITE_URL}${ANALYTICS ? " | analytics: Plausible (" + ANALYTICS + ")" : " | analytics: off"}`);
