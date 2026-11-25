'use strict';

const path = require('path');
const express = require('express');

const app = express();
const PUBLIC_DIR = path.join(__dirname, 'public');

app.disable('x-powered-by');

// Basic security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// Health check
app.get('/healthz', (req, res) => res.json({ ok: true }));

// Static files (index.html, favicon, robots.txt)
app.use(
  express.static(PUBLIC_DIR, {
    extensions: ['html'],
    setHeaders(res, filePath) {
      if (filePath.endsWith('.html')) {
        // Always serve the latest version of the page
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }
    },
  })
);

// Browsers ask for /favicon.ico by default
app.get('/favicon.ico', (req, res) => {
  res.type('image/png');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.sendFile(path.join(PUBLIC_DIR, 'favicon.png'));
});

// The site is a single page (routes use #hash), so any unknown path goes home
app.use((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).end();
  res.redirect(302, '/');
});

// Vercel imports the app; locally (node server.js) we start a listener
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Vyron site running on http://localhost:${PORT}`);
  });
}

module.exports = app;
