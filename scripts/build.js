// Build step: copies src/*.html -> public/*.html with every inline <script>
// block run through javascript-obfuscator. Run this after editing files in
// src/ and before deploying. Usage:  node scripts/build.js
"use strict";
globalThis.self = globalThis; // the vendored bundle expects a browser-like global
const fs = require("fs");
const path = require("path");
const JSObfuscator = require("../tools/obfuscator.js");

// Public address of the site, used for canonical + Open Graph URLs (they must be absolute).
// Set it once here, or per build:  SITE_URL=https://your-domain.com node scripts/build.js
const DEFAULT_SITE_URL = "https://your-domain.com";
const SITE_URL = (process.env.SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, "");
if (SITE_URL === DEFAULT_SITE_URL)
  console.warn("WARNING: SITE_URL is not set - canonical/Open Graph links point to " + DEFAULT_SITE_URL + ". Edit DEFAULT_SITE_URL in scripts/build.js or run with SITE_URL=https://yourdomain.");

const SRC = path.join(__dirname, "..", "src");
const PUBLIC = path.join(__dirname, "..", "public");

const OPTIONS = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.4,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.2,
  stringArray: true,
  stringArrayEncoding: ["base64"],
  stringArrayThreshold: 0.75,
  identifierNamesGenerator: "hexadecimal",
  renameGlobals: true,
  selfDefending: false, // keeps output readable by error stacks / simpler to debug if something breaks
  disableConsoleOutput: false,
  target: "browser",
};

function obfuscateFile(file) {
  const srcPath = path.join(SRC, file);
  const outPath = path.join(PUBLIC, file);
  let html = fs.readFileSync(srcPath, "utf-8");

  let count = 0;
  html = html.replace(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi, (whole, attrs, code) => {
    if (!code.trim()) return whole;
    count++;
    const result = JSObfuscator.obfuscate(code, OPTIONS);
    return `<script${attrs}>${result.getObfuscatedCode()}</script>`;
  });

  html = html.split("__SITE_URL__").join(SITE_URL);
  fs.writeFileSync(outPath, html);
  console.log(`built ${file} (${count} script block(s) obfuscated)`);
}

fs.mkdirSync(PUBLIC, { recursive: true });
for (const file of fs.readdirSync(SRC)) {
  if (file.endsWith(".html")) obfuscateFile(file);
}
