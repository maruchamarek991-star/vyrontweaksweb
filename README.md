# Vyron website

Static single-page site served by a tiny Express server (`server.js`).

## Structure

```
public/index.html   the whole website
public/favicon.png  icon (also served at /favicon.ico)
public/robots.txt
server.js           Express server (works locally and on Vercel)
vercel.json         Vercel config
package.json
```

## Run locally

```
npm install
npm start
```

Open http://localhost:3000

## Deploy on Vercel

**Option A – GitHub (recommended)**
1. Create a GitHub repo and push this folder.
2. Go to https://vercel.com/new and import the repo.
3. Leave all settings as they are (Framework Preset: Other) and click Deploy.

**Option B – Vercel CLI**
```
npm i -g vercel
vercel        # preview deploy
vercel --prod # production deploy
```

## Custom domain
Vercel project → Settings → Domains → add your domain and set the DNS records it shows.

## Editing the site
All content is in `public/index.html`. Change it, commit, push – Vercel redeploys automatically.
