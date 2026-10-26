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
Import this folder as the project root. `public/` is served statically and `api/*.js` run as serverless functions (`/api/rates`, `/api/checkout`, `/api/verify`, `/api/discord`). There is no cart: the visitor clicks "Buy now", picks a payment method and places the order. Prices are re-checked server-side at checkout, so no database is needed. Orders are not stored on the server; the customer gets an order ID to quote in the Discord ticket. The `/app.html` dashboard (`/api/records`) needs the local SQLite server and is not part of the Vercel deployment.

## Look (v17)
The Halloween theme (lava-orange glow, bats, webs, spider, embers, lightning, "Spooky effects" toggle) was removed. The site is back on the neutral black/silver base styles; the "Midnight City" skyline (see below) is the only background effect.
The Halloween coupon (HALLOWEEN20: popup, badge, countdown, `/api/coupon`, server-side discount logic) was removed as well — there are no discounts on the site now. `COUPON_SECRET` is still the (optional) signing key for order tokens; the name was kept so your Vercel settings keep working.

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

## SEO & security
- Generated automatically: `sitemap.xml` (with hreflang), `robots.txt`, canonical + Open Graph per language, JSON-LD (`Organization`, `WebSite`,
  `SoftwareApplication` with the price, `FAQPage` from the FAQ text), a real `<h1>`, a styled `404.html`.
- **Set `SITE_URL`** when building (`SITE_URL=https://yourdomain node scripts/build.js`) — it ends up in canonical/hreflang/sitemap/JSON-LD.
- Security: `vercel.json` sets HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `frame-ancestors 'none'`, `Referrer-Policy`, `Permissions-Policy`; every page carries a
  Content-Security-Policy that allows only its own scripts (by SHA-256 hash), Google Fonts and same-origin requests.
- Analytics: off by default. `ANALYTICS_DOMAIN=yourdomain node scripts/build.js` adds cookie-free Plausible (and the matching line in the privacy policy).
- Not included: guides/blog articles for Google traffic (content you should write and fact-check yourself).

## Security hardening (v15) — works without any Vercel setting
- **Forged order tokens are worthless even if `COUPON_SECRET` is not set.** `lib/chain.js` (`plausible()`) rejects tokens that claim a price below the cheapest
  possible order, any discount (there are none), a creation time in the future, or a coin amount worth
  less than ~40 % of the claimed price. Setting `COUPON_SECRET` on Vercel is still recommended (optional): it makes tokens unforgeable altogether.
- **Rate limiting** (`lib/limit.js`, in memory, per IP): checkout 30/min, verify 90/min (a customer polls 12/min), rates 60/min, discord 30/min.
  Over the limit the API answers `429` + `Retry-After` (`code: "rate_limited"`); the payment window already treats failed polls as "retrying" and keeps going.
  Counters are per serverless instance, so this is best effort, but it stops scripts from hammering the public blockchain / price APIs through us.
- **One transaction pays one order** (per server instance): a second order with an identical amount is no longer matched to the same TX.
  A guarantee across instances would need a small database (not added, to keep the setup unchanged).
- **`.vercelignore`** keeps `public/app.html` (the local-only dashboard, which cannot work on Vercel), `tools/`, `tests/` and `vyron.db` out of the deployment.
  Locally nothing changes: `node local-server.js` still serves the dashboard.
- No change to `src/` or `public/`: the website itself is identical, so no rebuild is needed.

## Tests
`npm test` runs the backend tests (order tokens, SOL/LTC verification against a fake blockchain). The browser tests (`node tests/e2e.js`, needs Playwright
and `PORT=3111 node -r ./tests/preload.js local-server.js` running) click through both languages and complete SOL/LTC payments.

## Buying
No accounts, no sign-in, no Discord connection and no cart: "Buy now" opens the payment-method picker directly.
Prices are calculated on the server. The only product is **Premium Tweaks** ($5, Lifetime). Payment is by crypto (SOL / LTC: locked amount, verified automatically — see above), or a ticket on
the Discord server (`discord.gg/vyron`) for BLIK, PayPal and gift cards.

## API
- GET    /api/rates
- POST   /api/verify    { token }   (crypto payment status)
- POST   /api/orders/:id/sent   (legacy, unused)
- POST   /api/checkout  { method, items: [{ productId, qty }] }
- GET    /api/records
- POST   /api/records   { name, email, role, status }
- DELETE /api/records/:id

## Midnight City (v16): background music + audio-reactive skyline
- **Music:** put your MP3 at `public/audio/music.mp3` (the file itself is not included). Browsers block autoplay with sound, so the music starts on the visitor's
  first click / key press / tap (a small hint appears at the bottom until then). Fade-in, loops, pauses when the tab is hidden, and the new equalizer button in the header
  mutes it (choice remembered in `vy-music`).
- **Audio-reactive visuals:** a neon skyline canvas (`#city`) with 3 parallax layers, twinkling windows, blinking tower lights and light trails on the road.
  Bass from the song (Web Audio analyser) drives the skyline, the header glow, the big background logo and the equalizer button. Without the file it uses a 105 BPM pulse.
  Switched off by the existing "Spooky effects" toggle and in the light theme.
- Code: CSS `<style id="midnight">`, the `#city` / `<audio id="mc">` elements after `#fx`, and the last `<script>` ("Midnight City") in `src/index.html`; `media-src 'self'` added to the CSP in `scripts/build.js`.
- Rights: a copyrighted song on a commercial site needs a licence — otherwise expect takedowns (Vercel/GitHub/Discord) or complaints.
