# Zentro

Dark glass UI with a real SQLite database. No runtime dependencies, no install step.

## Run
1. Install Node.js 22.13 or newer (https://nodejs.org)
2. In this folder run: `node server.js`
3. Open http://localhost:3000 (landing page; dashboard at /app.html)

## Editing the site — IMPORTANT
`public/index.html` and `public/app.html` are **generated, obfuscated build
output** — don't hand-edit them, your changes will be lost on the next build.
The real, readable source lives in `src/index.html` and `src/app.html`.

Workflow:
1. Edit `src/index.html` / `src/app.html` as normal (plain, readable HTML/CSS/JS).
2. Run `node scripts/build.js` to regenerate `public/*.html` — this runs every
   inline `<script>` through `javascript-obfuscator` (vendored in
   `tools/obfuscator.js`, no `npm install` needed) and copies the result into
   `public/`.
3. Restart/redeploy `server.js`, which only ever serves files from `public/`.

The build also adds a right-click / text-selection / devtools-shortcut
blocker to both pages (see "Copy & inspect protection" below) — it's already
baked into `src/*.html`, so you don't need to re-add it by hand.

### Copy & inspect protection
Both pages block the right-click menu, text selection/drag-select, copy/cut,
and the common DevTools shortcuts (F12, Ctrl/Cmd+Shift+I/J/C, Ctrl/Cmd+U).
The shipped JavaScript itself is also obfuscated (renamed identifiers,
encoded string table, flattened control flow) by the build step above.

**Be aware this deters casual copying, it does not make the code secret.**
Anyone can still open DevTools directly (there's no way to block that from
a webpage), view the page through the Network tab, or run a de-obfuscator.
Nothing sensitive depends on this: passwords are hashed server-side, prices
are calculated server-side, and the wallet addresses are only ever strings
in the HTML the browser already has to download to render the page.

The database file `zentro.db` is created automatically on first run.

## Accounts & cart
Visitors must sign up (nickname + password) to add to the cart or buy. Accounts, sessions, carts and orders live in `zentro.db`
(passwords are salted + scrypt-hashed, never stored in plain text). Prices are calculated on the server.

## API
- POST   /api/register  { nick, password }
- POST   /api/login     { nick, password }
- POST   /api/logout
- GET    /api/me
- GET    /api/cart
- POST   /api/cart      { productId, color, opt, qty }
- PATCH  /api/cart/:id  { qty }
- DELETE /api/cart/:id
- POST   /api/checkout
- GET    /api/records
- POST   /api/records   { name, email, role, status }
- DELETE /api/records/:id
