'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');

/* tiny .env loader (local development; on Vercel use the project's Environment Variables).
   Handles UTF-8, UTF-8 with BOM and UTF-16 files (Windows Notepad / PowerShell) and says what it found. */
const ENV_FILE = path.join(__dirname, '.env');
let ENV_NOTE = '';
try {
  let buf = fs.readFileSync(ENV_FILE), txt;
  if (buf[0] === 0xFF && buf[1] === 0xFE) txt = buf.toString('utf16le');
  else if (buf[0] === 0xFE && buf[1] === 0xFF) txt = Buffer.from(buf.slice(2)).swap16().toString('utf16le');
  else txt = buf.toString('utf8');
  txt = txt.replace(/^\uFEFF/, '');
  let n = 0;
  txt.split(/\r?\n/).forEach(l => {
    const m = l.match(/^\s*(?:export\s+)?([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m || /^\s*#/.test(l)) return;
    const val = m[2].replace(/^(['"])(.*)\1$/, '$2');
    if (val && !process.env[m[1]]) { process.env[m[1]] = val; n++; }
  });
  ENV_NOTE = 'Loaded ' + ENV_FILE + ' (' + n + ' value' + (n === 1 ? '' : 's') + ' with content)';
} catch (e) {
  const near = ['.env.txt', '.env.example', 'env', 'env.txt'].find(f => fs.existsSync(path.join(__dirname, f)));
  ENV_NOTE = 'No .env file found at ' + ENV_FILE + (near ? '  <-- found "' + near + '" instead: the file must be named exactly ".env" (Explorer: enable View > File name extensions)' : '');
}

const E = process.env;
/* Discord login needs only these 3 values (see .env.example):
   DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_REDIRECT_URI */
const CLIENT_ID = E.DISCORD_CLIENT_ID, CLIENT_SECRET = E.DISCORD_CLIENT_SECRET, REDIRECT_URI = E.DISCORD_REDIRECT_URI;
const CONFIGURED = !!(CLIENT_ID && CLIENT_SECRET && REDIRECT_URI);
/* session signing key is derived from the client secret, nothing to configure */
const SECRET = CLIENT_SECRET ? crypto.createHmac('sha256', CLIENT_SECRET).update('vyron-session-v1').digest('hex') : crypto.randomBytes(32).toString('hex');
const SESSION_DAYS = 7;
const DISCORD = 'https://discord.com/api/v10';

/* Wallet addresses (override with ETH_ADDRESS / SOL_ADDRESS / LTC_ADDRESS in the environment) */
const CRYPTO = [
  { id: 'ltc', name: 'Litecoin', symbol: 'LTC', cg: 'litecoin', decimals: 6, address: E.LTC_ADDRESS || 'LeGJQcZ9bpBB4sYWAr3myLAHX3oqpKJmWN' },
  { id: 'sol', name: 'Solana',   symbol: 'SOL', cg: 'solana',   decimals: 5, address: E.SOL_ADDRESS || 'GMjFESghmNJDk17YUecARhZbBftnCDDUdx72CJDdvKk4' },
  { id: 'eth', name: 'Ethereum', symbol: 'ETH', cg: 'ethereum', decimals: 7, address: E.ETH_ADDRESS || '0x0F64a14c25724dA8c6f1A161c4ADFA6fD88955A1' }
];

/* Live prices (USD). Coinbase spot first (real-time), CoinGecko as a per-coin fallback. Cached 10 s so every visitor does not hit the APIs. */
let rateCache = { t: 0, v: null };
async function getJson(url, ms) {
  const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), ms || 3500);
  try { const r = await fetch(url, { signal: ctl.signal, headers: { Accept: 'application/json' } }); if (!r.ok) throw new Error(url + ' ' + r.status); return await r.json(); }
  finally { clearTimeout(to); }
}
async function rates() {
  if (rateCache.v && Date.now() - rateCache.t < 10000) return rateCache;
  const v = {};
  await Promise.all(CRYPTO.map(async c => {
    try {
      const d = await getJson('https://api.coinbase.com/v2/prices/' + c.symbol + '-USD/spot');
      const n = Number(d && d.data && d.data.amount); if (n > 0) v[c.id] = n;
    } catch (e) { /* try the fallback below */ }
  }));
  const miss = CRYPTO.filter(c => !v[c.id]);
  if (miss.length) {
    try {
      const d = await getJson('https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&ids=' + miss.map(c => c.cg).join(','));
      miss.forEach(c => { if (d[c.cg] && Number(d[c.cg].usd) > 0) v[c.id] = Number(d[c.cg].usd); });
    } catch (e) { /* keep the last known values */ }
  }
  if (Object.keys(v).length) rateCache = { t: Date.now(), v: Object.assign({}, rateCache.v || {}, v) };
  return rateCache.v ? rateCache : { t: 0, v: {} };
}

const app = express();
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy':
      "default-src 'self'; img-src 'self' data: https://cdn.discordapp.com; style-src 'self' https://fonts.googleapis.com; " +
      "font-src https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; frame-ancestors 'none'"
  });
  next();
});

/* ---------- helpers: cookies + signed session (stateless, works on Vercel) ---------- */
const b64 = b => Buffer.from(b).toString('base64url');
const sign = s => crypto.createHmac('sha256', SECRET).update(s).digest('base64url');
function pack(obj) { const p = b64(JSON.stringify(obj)); return p + '.' + sign(p); }
function unpack(tok) {
  if (!tok || typeof tok !== 'string') return null;
  const [p, s] = tok.split('.');
  if (!p || !s) return null;
  const good = sign(p);
  if (s.length !== good.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(good))) return null;
  try { const o = JSON.parse(Buffer.from(p, 'base64url').toString('utf8')); return o.exp > Date.now() ? o : null; } catch (e) { return null; }
}
function cookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(c => { const i = c.indexOf('='); if (i > 0) out[c.slice(0, i).trim()] = decodeURIComponent(c.slice(i + 1).trim()); });
  return out;
}
const isHttps = req => (req.headers['x-forwarded-proto'] || req.protocol) === 'https';
function setCookie(req, res, name, val, maxAgeSec) {
  const parts = [name + '=' + encodeURIComponent(val), 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=' + maxAgeSec];
  if (isHttps(req)) parts.push('Secure');
  res.append('Set-Cookie', parts.join('; '));
}
const clearCookie = (req, res, name) => setCookie(req, res, name, '', 0);
const session = req => unpack(cookies(req).vy_session);
const avatarUrl = u => u.avatar
  ? 'https://cdn.discordapp.com/avatars/' + u.id + '/' + u.avatar + '.png?size=64'
  : 'https://cdn.discordapp.com/embed/avatars/' + Number((BigInt(u.id) >> 22n) % 6n) + '.png';
const publicUser = s => ({ id: s.id, name: s.name, avatar: s.avatar });
const needHeader = (req, res) => { if (req.get('X-Requested-With') !== 'vyron') { res.status(400).json({ error: 'bad_request' }); return false; } return true; };

async function dget(url, headers) {
  const r = await fetch(DISCORD + url, { headers });
  if (!r.ok) throw new Error('discord ' + r.status);
  return r.json();
}

/* ---------- auth: Discord OAuth2 (identify only) ---------- */
app.get('/api/auth/login', (req, res) => {
  if (!CONFIGURED) return res.redirect('/?auth=unconfigured');
  const state = crypto.randomBytes(16).toString('hex');
  setCookie(req, res, 'vy_state', state, 600);
  const q = new URLSearchParams({
    client_id: CLIENT_ID, response_type: 'code', redirect_uri: REDIRECT_URI,
    scope: 'identify', state, prompt: 'none'
  });
  res.redirect('https://discord.com/oauth2/authorize?' + q);
});

app.get('/api/auth/callback', async (req, res) => {
  if (!CONFIGURED) return res.redirect('/?auth=unconfigured');
  const st = cookies(req).vy_state;
  clearCookie(req, res, 'vy_state');
  if (req.query.error) return res.redirect('/?auth=cancelled');
  if (!st || !req.query.code || req.query.state !== st) return res.redirect('/?auth=error');
  try {
    const tr = await fetch(DISCORD + '/oauth2/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: 'authorization_code',
        code: String(req.query.code), redirect_uri: REDIRECT_URI
      })
    });
    if (!tr.ok) throw new Error('token ' + tr.status);
    const tok = await tr.json();
    const user = await dget('/users/@me', { Authorization: 'Bearer ' + tok.access_token });
    const s = { id: user.id, name: user.global_name || user.username, avatar: avatarUrl(user), exp: Date.now() + SESSION_DAYS * 864e5 };
    setCookie(req, res, 'vy_session', pack(s), SESSION_DAYS * 86400);
    res.redirect('/?auth=ok');
  } catch (e) {
    console.error('auth error:', e.message);
    res.redirect('/?auth=error');
  }
});

app.get('/api/me', (req, res) => {
  res.set('Cache-Control', 'no-store');
  const s = session(req);
  res.json({ configured: CONFIGURED, user: s ? publicUser(s) : null });
});

app.post('/api/logout', (req, res) => {
  if (!needHeader(req, res)) return;
  clearCookie(req, res, 'vy_session');
  res.json({ ok: true });
});

/* current prices, polled by the payment window so the amount follows the market */
app.get('/api/rates', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const r = await rates();
  res.json({ t: r.t || null, rates: r.v || {} });
});

/* payment details are only handed out to a signed-in user */
app.post('/api/checkout', async (req, res) => {
  if (!needHeader(req, res)) return;
  res.set('Cache-Control', 'no-store');
  const s = session(req);
  if (!s) return res.status(401).json({ error: 'auth_required' });
  const rt = (await rates()).v;
  res.json({
    user: publicUser(s),
    crypto: CRYPTO.map(c => ({ id: c.id, name: c.name, symbol: c.symbol, decimals: c.decimals, address: c.address, usd: rt[c.id] || null }))
  });
});

app.get('/healthz', (_, res) => res.json({ ok: true }));
app.use('/api', (req, res) => res.status(404).json({ error: 'not_found' }));

app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'], setHeaders: (res) => res.set('Cache-Control', 'no-cache') }));
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'public', 'index.html')));

module.exports = app;
if (require.main === module) {
  const port = E.PORT || 3000;
  app.listen(port, () => {
    console.log('Vyron: http://localhost:' + port);
    console.log(ENV_NOTE);
    if (CONFIGURED) console.log('Discord login ON. Redirect URI to add in the Developer Portal: ' + REDIRECT_URI);
    else console.log('Discord login is OFF - missing: ' + ['DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET', 'DISCORD_REDIRECT_URI'].filter(k => !E[k]).join(', '));
  });
}
