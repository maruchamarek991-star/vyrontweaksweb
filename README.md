# Vyron

A minimal page: the Vyron logo and name on the home page.

## Run
1. Install Node.js 22.13 or newer.
2. In this folder run: `node local-server.js`
3. Open http://localhost:3000

## Editing
The source is in `src/` (`index.html`, `404.html`, `app.html`). After editing run `node scripts/build.js`
(or `npm run build`) — it writes `public/`, which is what gets served (set `SITE_URL=https://yourdomain` for canonical / sitemap links).
Vercel serves `public/` as is.
