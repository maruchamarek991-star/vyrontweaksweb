'use strict';
// Builds the production files:  src/js/*.js -> public/js/*.js (obfuscated)   src/css/*.css -> public/css/*.css (minified)
// Run: npm run build   (Vercel runs it automatically on every deploy through the "vercel-build" script)
const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');
const esbuild = require('esbuild');

const ROOT = __dirname;
const jsOptions = {
  target: 'browser',
  compact: true,
  simplify: true,
  renameGlobals: false,
  identifierNamesGenerator: 'hexadecimal',
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.3,
  numbersToExpressions: true,
  splitStrings: true,
  splitStringsChunkLength: 5,
  stringArray: true,
  stringArrayEncoding: ['rc4'],
  stringArrayThreshold: 1,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayIndexShift: true,
  stringArrayWrappersCount: 3,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersType: 'function',
  stringArrayCallsTransform: true,
  stringArrayCallsTransformThreshold: 0.8,
  transformObjectKeys: true,
  unicodeEscapeSequence: false,
  disableConsoleOutput: true,
  // NOT used on purpose: they need eval / Function(), which the site's CSP blocks
  selfDefending: false,
  debugProtection: false
};

const SRC_JS = path.join(ROOT, 'src', 'js'), OUT_JS = path.join(ROOT, 'public', 'js');
fs.mkdirSync(OUT_JS, { recursive: true });
for (const f of fs.readdirSync(SRC_JS).filter(n => n.endsWith('.js'))) {
  const code = fs.readFileSync(path.join(SRC_JS, f), 'utf8');
  const out = JavaScriptObfuscator.obfuscate(code, jsOptions).getObfuscatedCode();
  fs.writeFileSync(path.join(OUT_JS, f), out);
  console.log('obfuscated', f, code.length + ' -> ' + out.length + ' bytes');
}

const SRC_CSS = path.join(ROOT, 'src', 'css'), OUT_CSS = path.join(ROOT, 'public', 'css');
fs.mkdirSync(OUT_CSS, { recursive: true });
for (const f of fs.readdirSync(SRC_CSS).filter(n => n.endsWith('.css'))) {
  const code = fs.readFileSync(path.join(SRC_CSS, f), 'utf8');
  const out = esbuild.transformSync(code, { loader: 'css', minify: true }).code;
  fs.writeFileSync(path.join(OUT_CSS, f), out);
  console.log('minified', f, code.length + ' -> ' + out.length + ' bytes');
}
