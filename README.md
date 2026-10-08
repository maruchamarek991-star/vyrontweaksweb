# Vyron

Dark glass UI with a real SQLite database. No runtime dependencies, no install step.

## Run
1. Install Node.js 22.13 or newer (https://nodejs.org)
2. In this folder run: `node local-server.js`
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
3. Restart/redeploy `local-server.js`, which only ever serves files from `public/`.

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

The database file `vyron.db` is created automatically on first run.

## Deploy on Vercel
Import this folder as the project root. `public/` is served statically and `api/*.js` run as serverless functions (`/api/rates`, `/api/checkout`, `/api/orders/:id/sent`). There is no cart: the visitor clicks "Buy now", picks a payment method and places the order. Prices are re-checked server-side at checkout, so no database is needed. Orders are not stored on the server; the customer gets an order ID to quote in the Discord ticket. The `/app.html` dashboard (`/api/records`) needs the local SQLite server and is not part of the Vercel deployment.

## Scratch-card discount coupon
5 s after the landing page loads, a scratch card pops up (once per visitor). When enough of the foil is scratched off, it reveals a random **5-20 %** discount and a code like `VYRON15-AQ3K1F9C-5B7E0A44D1`; the discount is attached to the visitor's order automatically (also shown on the product price and in the payment summary). The code can also be typed into the "Discount code" field in the payment window.
- `POST /api/coupon` rolls a new code; `POST /api/coupon { code }` validates one.
- `POST /api/checkout` accepts an optional `coupon` and recomputes the discounted total server-side (integer cents).
- Codes are **stateless**: the percentage and expiry (48 h) are inside the code and signed with HMAC-SHA256, so no database is needed and the browser can't forge or change a code.
- **Set `COUPON_SECRET`** (any long random string) in the Vercel environment variables. Without it a public development secret is used and anyone with the source could generate valid codes.
- Tunables: `COUPON_MIN` / `COUPON_MAX` / `COUPON_TTL_H` in `lib/shop.js`; `COUPON_DELAY` (ms) and `REVEAL_AT` in `src/index.html`.
- Limitation of the stateless design: a code can be used for any number of orders until it expires, and re-rolling is possible by calling the API again (the browser only offers one card per visitor). Tracking one-time use needs storage (e.g. Vercel KV).

## Buying
No accounts, no sign-in, no Discord connection and no cart: "Buy now" opens the payment-method picker directly.
Prices are calculated on the server. The only product is **Premium Tweaks** ($5, Lifetime). Payment is by crypto (SOL / LTC, coin amount updates live from public price APIs every 15 s), or a ticket on
the Discord server (`discord.gg/vyron`) for BLIK, PayPal and gift cards. After paying in crypto the customer presses "I've sent the payment" and gets a guide for sending the TX ID in a ticket.

## API
- GET    /api/rates
- POST   /api/orders/:id/sent
- POST   /api/checkout  { method, items: [{ productId, qty }] }
- GET    /api/records
- POST   /api/records   { name, email, role, status }
- DELETE /api/records/:id
