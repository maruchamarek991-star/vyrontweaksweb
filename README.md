# Vyron

Dark glass UI with a real SQLite database. No runtime dependencies, no install step.

## Run
1. Install Node.js 22.13 or newer (https://nodejs.org)
2. In this folder run: `node local-server.js`
3. Open http://localhost:3000 (landing page; dashboard at /app.html)

## Editing the site — IMPORTANT
Everything in `public/*.html` is **generated, obfuscated build output** — don't
hand-edit it, your changes will be lost on the next build. The readable source is in `src/`:
`index.html` (landing page), `i18n.js` (all text, English + Polish), `pl/*.html` (Polish legal pages),
`terms/privacy/refund.html`, `404.html`, `app.html`.

Workflow:
1. Edit `src/` as normal (plain, readable HTML/CSS/JS).
2. Run `node scripts/build.js` (or `npm run build`). It writes the English and Polish pages, obfuscates every
   inline `<script>` (`tools/obfuscator.js`, no `npm install` needed), adds a Content-Security-Policy with the
   scripts' hashes, JSON-LD, hreflang, `sitemap.xml` and `robots.txt`. **Commit the regenerated `public/`** —
   Vercel serves it as is (there is no build step on Vercel).
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
Import this folder as the project root. `public/` is served statically and `api/*.js` run as serverless functions (`/api/rates`, `/api/checkout`, `/api/verify`, `/api/coupon`, `/api/discord`). There is no cart: the visitor clicks "Buy now", picks a payment method and places the order. Prices are re-checked server-side at checkout, so no database is needed. Orders are not stored on the server; the customer gets an order ID to quote in the Discord ticket. The `/app.html` dashboard (`/api/records`) needs the local SQLite server and is not part of the Vercel deployment.

## Languages (EN / PL)
- `/` is English, `/pl/` is Polish. Both are real pre-rendered pages (good for SEO and no-JS visitors), with `hreflang` links.
  The PL/EN switch in the header translates the page instantly without reloading and remembers the choice. A visitor whose browser is set to
  Polish and who opens `/` is switched to Polish automatically.
- **All text is in `src/i18n.js`** (both languages side by side). In `src/index.html` an element is marked `data-i18n="key"`
  (attributes: `data-i18n-attr="aria-label:key"`). The build fails if the English text in the HTML and in `i18n.js` ever differ,
  so a changed sentence can't be forgotten in one of the languages. Texts used by JavaScript use `t("key", {param})`.
- Polish legal pages are separate hand-translated files in `src/pl/`. If you change `src/terms.html` etc., update the Polish file too.
- `src/app.html` (internal dashboard) is intentionally English only and marked `noindex`.

## Crypto payments: automatic verification
- At checkout the server locks the coin amount for **30 min**: `USD total / live rate + a tiny unique "dust"` (max 0.0001 coin, ~1 cent),
  so every open order has its own exact amount. The order is returned as a **signed token** (HMAC) — nothing is stored on the server.
- The payment window polls `POST /api/verify { token }` every 5 s. The server reads the blockchain and looks for a transfer of **exactly**
  that amount to our address: Solana via JSON-RPC (`getSignaturesForAddress` + `getTransaction`), Litecoin via the Esplora API of
  litecoinspace.org with BlockCypher as automatic fallback. Statuses: `waiting` → `detected` → `confirmed` (SOL: finalized, LTC: 1 confirmation) / `expired`.
  A payment sent in time is still found for 15 min after the offer expired.
- Results are cached (one address lookup per 4 s, every transaction fetched once), so many visitors can't overload the public APIs.
- If the amount is wrong or the customer paid after the window, the "Not detected? Send the TX ID manually" fallback (the old ticket flow) is one click away.
- **Optional environment variables**
  - `DISCORD_WEBHOOK_URL` — posts "✅ Crypto payment confirmed" (order, amount, explorer link) to your staff channel once per order.
    Without it you simply see the order number in the customer's ticket.
  - `SOL_RPC_URL` — your own Solana RPC (Helius, QuickNode, ...). The free public node is rate-limited; recommended for production.
  - `LTC_API_URL` (Esplora-compatible, default `https://litecoinspace.org/api`), `LTC_MIN_CONF` (default 1).
  - `ORDER_SECRET` — separate secret for order tokens (falls back to `COUPON_SECRET`).
- Honest limits: matching is by exact amount, so a customer who sends a different amount (e.g. an exchange deducted its fee) is not recognised
  automatically; one transaction could in theory match two orders only if both got the identical random dust (1 in 9999) — check that the same TX hash isn't
  quoted in two tickets. Delivery itself is still done by you in the ticket.

## Scratch-card discount coupon
- A code is valid for exactly **24 hours** from the moment it is issued. When it expires it is removed and the visitor gets a **new scratch card with a new random discount**
  (also while the page stays open).
- Re-rolling for a better discount no longer works: the percentage (5–20 %) is derived (HMAC) from the visitor's IP + browser and the current UTC day, so asking again the
  same day returns the same percentage. A different percentage can only come on another day, i.e. after the old code expired. Nothing is stored; a VPN/new IP
  can still get one more roll per day.
- `POST /api/coupon` issues the visitor's code; `POST /api/coupon { code }` validates one. `POST /api/checkout` re-verifies and recomputes the price server-side.
- **Set `COUPON_SECRET`** (any long random string) in the Vercel environment variables. Without it a public development secret is used and anyone could forge codes.
- Tunables: `COUPON_MIN` / `COUPON_MAX` / `COUPON_TTL_H` in `lib/shop.js`; `COUPON_DELAY` and `REVEAL_AT` in `src/index.html`.
- Limitation of the stateless design: a code can be used for any number of orders until it expires (one-time use needs storage, e.g. Vercel KV).

## SEO & security
- Generated automatically: `sitemap.xml` (with hreflang), `robots.txt`, canonical + Open Graph per language, JSON-LD (`Organization`, `WebSite`,
  `SoftwareApplication` with the price, `FAQPage` from the FAQ text), a real `<h1>`, a styled `404.html`.
- **Set `SITE_URL`** when building (`SITE_URL=https://yourdomain node scripts/build.js`) — it ends up in canonical/hreflang/sitemap/JSON-LD.
- Security: `vercel.json` sets HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `frame-ancestors 'none'`, `Referrer-Policy`, `Permissions-Policy`; every page carries a
  Content-Security-Policy that allows only its own scripts (by SHA-256 hash), Google Fonts and same-origin requests.
- Analytics: off by default. `ANALYTICS_DOMAIN=yourdomain node scripts/build.js` adds cookie-free Plausible (and the matching line in the privacy policy).
- Not included: guides/blog articles for Google traffic (content you should write and fact-check yourself).

## Tests
`npm test` runs the backend tests (coupons, order tokens, SOL/LTC verification against a fake blockchain). The browser tests (`node tests/e2e.js`, needs Playwright
and `PORT=3111 node -r ./tests/preload.js local-server.js` running) click through both languages, the scratch card and complete SOL/LTC payments.

## Buying
No accounts, no sign-in, no Discord connection and no cart: "Buy now" opens the payment-method picker directly.
Prices are calculated on the server. The only product is **Premium Tweaks** ($5, Lifetime). Payment is by crypto (SOL / LTC: locked amount, verified automatically — see above), or a ticket on
the Discord server (`discord.gg/vyron`) for BLIK, PayPal and gift cards.

## API
- GET    /api/rates
- POST   /api/verify    { token }   (crypto payment status)
- POST   /api/coupon    [{ code }]
- POST   /api/orders/:id/sent   (legacy, unused)
- POST   /api/checkout  { method, items: [{ productId, qty }] }
- GET    /api/records
- POST   /api/records   { name, email, role, status }
- DELETE /api/records/:id
