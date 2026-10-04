/* ===== CONFIG — edit here ===== */
const CONFIG = {
  logo: 'assets/premium-tweaks-logo.png',   // replace this file with the Premium Tweaks logo
  plans: [
    { id: 'premium-lifetime', product: 'Premium Tweaks', name: 'Lifetime', price: '5', unit: 'one-time', desc: 'Pay once. All current and future updates.', best: true }
  ],
  includes: [
    { icon: 'gpu',      title: 'GPU Tweaks',    desc: 'General GPU tweaks, plus AMD, NVIDIA and Intel.' },
    { icon: 'cpu',      title: 'CPU Tweaks',    desc: 'General CPU tweaks for AMD and Intel.' },
    { icon: 'system',   title: 'System Tweaks', desc: 'Disk, memory, debloat, internet and processes.' },
    { icon: 'firmware', title: 'Firmware',      desc: 'BIOS tweaks.' }
  ],
  // Put your real links in "url". Entries with url '#' show a notice instead of opening.
  socials: [
    { name: 'Discord', icon: 'discord', url: 'https://discord.gg/vyron', desc: 'Join the community, get support and early updates.' }
  ]
};

/* Payment methods. "crypto" ones show the wallet address (addresses live in server.js / env), "ticket" ones only show instructions (no link). */
const PAY_METHODS = [
  { id: 'ltc', kind: 'crypto', name: 'Litecoin', tag: 'LTC', network: 'Litecoin' },
  { id: 'sol', kind: 'crypto', name: 'Solana', tag: 'SOL', network: 'Solana' },
  { id: 'eth', kind: 'crypto', name: 'Ethereum', tag: 'ETH', network: 'Ethereum (ERC-20)' },
  { id: 'paypal', kind: 'ticket', name: 'PayPal', tag: 'Ticket', text: 'Open a ticket on our Discord server and staff will send you the PayPal details.' },
  { id: 'giftcard', kind: 'ticket', name: 'GiftCard', tag: 'Ticket', text: 'Open a ticket on our Discord server to pay with a gift card.' },
  { id: 'blik', kind: 'ticket', icon: 'blik.png', name: 'BLIK', tag: 'Ticket', text: 'Open a ticket on our Discord server to pay with BLIK.' },
  { id: 'others', kind: 'ticket', name: 'Others', tag: 'Ticket', text: 'Want to pay another way? Open a ticket on our Discord server and ask the staff.' }
];

const ICONS = {
  cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2.5 3.5h3l2.2 11h10.6l2-8H6.2"/>',
  logout: '<path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  trash2: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z"/>',
  chat: '<path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z"/>',
  play: '<rect x="3" y="5" width="18" height="14" rx="4"/><path d="M10 9.5v5l4.5-2.5z"/>',
  note: '<path d="M10 17V5l9-2v12"/><circle cx="7" cy="17" r="3"/><circle cx="16" cy="15" r="3"/>',
  at: '<circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 006 0v-1a10 10 0 10-4 8"/>',
  photo: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6"/>',
  gpu: '<rect x="2" y="6" width="20" height="11" rx="2"/><circle cx="9" cy="11.5" r="3"/><path d="M15 9.5h4M15 13.5h4M5 17v3M9 17v3"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
  system: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  firmware: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 12.5l9 5 9-5M3 16.5l9 5 9-5"/>',
  timer: '<circle cx="12" cy="14" r="7"/><path d="M12 14V10M9.5 3h5M12 3v4"/>',
  wifi: '<path d="M2 9a15 15 0 0120 0M5 12.5a10 10 0 0114 0M8.5 16a5 5 0 017 0"/><circle cx="12" cy="19" r="1"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 012-2h9"/>',
  discord: '<path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/>'
};
const FILLED = { discord: true };
const svgIcon = n => '<svg viewBox="0 0 24 24"' + (FILLED[n] ? ' class="fill"' : '') + '>' + (ICONS[n] || '') + '</svg>';

const $ = s => document.querySelector(s);
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const safeSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

/* ===== TOAST ===== */
let toastT;
function toast(msg) { const e = $('#toast'); e.textContent = msg; e.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('show'), 3200); }

/* ===== THEME ===== */
function applyTheme(th) {
  document.documentElement.setAttribute('data-theme', th);
  $('#themeIcon').innerHTML = ICONS[th === 'dark' ? 'sun' : 'moon'];
}
applyTheme(document.documentElement.getAttribute('data-theme') || 'dark');
$('#themeBtn').addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  safeSet('vy-theme', next); applyTheme(next);
});

/* ===== INTRO (home page, first visit in a session) ===== */
(function intro() {
  const node = $('#intro'); if (!node) return;
  if (document.documentElement.classList.contains('seen')) { node.remove(); document.body.classList.remove('lock'); return; }
  const title = $('#introTitle');
  'Vyron'.split('').forEach((c, i) => { const s = document.createElement('span'); s.textContent = c; s.style.setProperty('--i', i); title.appendChild(s); });
  let done = false;
  function end() {
    if (done) return; done = true;
    try { sessionStorage.setItem('vy-intro', '1'); } catch (e) {}
    node.classList.add('out'); document.body.classList.remove('lock');
    setTimeout(() => node.remove(), 1100);
  }
  node.addEventListener('click', end);
  setTimeout(end, 4300);
})();

/* ===== ACCOUNT (Discord) + CART ===== */
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};
const account = { user: store.get('vy-user', null), configured: true };
let cart = store.get('vy-cart', []).filter(id => CONFIG.plans.some(p => p.id === id));
const planById = id => CONFIG.plans.find(p => p.id === id);
const api = (url, opts) => fetch(url, Object.assign({ credentials: 'same-origin', cache: 'no-store', headers: { 'X-Requested-With': 'vyron' } }, opts));
const unlock = () => { const m = $('#modal'); if (!(m && !m.hidden) && !$('#cartPanel.open') && !$('#authModal:not([hidden])') && !$('#payModal:not([hidden])')) document.body.classList.remove('lock'); };

/* --- auth modal (sign in) --- */
let authEl = null, authLast = null;
function buildAuth() {
  if (authEl) return authEl;
  authEl = el('div', 'modal'); authEl.id = 'authModal'; authEl.hidden = true;
  authEl.innerHTML = '<div class="modal-bg" data-aclose></div><div class="sheet glass narrow" role="dialog" aria-modal="true" aria-labelledby="aTitle">' +
    '<button class="icon-btn x" data-aclose aria-label="Close"><svg viewBox="0 0 24 24">' + ICONS.close + '</svg></button>' +
    '<div class="auth-ico">' + svgIcon('discord') + '</div><h2 id="aTitle"></h2><p class="auth-text"></p><div class="auth-actions"></div><p class="note auth-note"></p></div>';
  document.body.appendChild(authEl);
  authEl.querySelectorAll('[data-aclose]').forEach(n => n.addEventListener('click', closeAuth));
  return authEl;
}
function openAuth() {
  const m = buildAuth(); authLast = document.activeElement;
  const t = $('#aTitle'), p = $('.auth-text', m), a = $('.auth-actions', m), n = $('.auth-note', m);
  a.textContent = '';
  const login = () => { location.href = '/api/auth/login'; };
  t.textContent = 'Connect with Discord';
  p.textContent = 'Create your Vyron account by signing in with Discord.';
  const b = el('button', 'btn primary center'); b.type = 'button'; b.innerHTML = svgIcon('discord'); b.appendChild(el('span', '', 'Continue with Discord')); b.addEventListener('click', login);
  a.append(b); n.textContent = 'We only read your Discord name and avatar.';
  m.classList.remove('closing'); m.hidden = false; document.body.classList.add('lock');
  const f = $('.auth-actions .btn', m); if (f) f.focus();
}
function closeAuth() {
  const m = authEl; if (!m || m.hidden || m.classList.contains('closing')) return;
  m.classList.add('closing');
  setTimeout(() => { m.hidden = true; m.classList.remove('closing'); unlock(); if (authLast && document.contains(authLast)) authLast.focus(); }, 230);
}

/* --- account button in the nav --- */
function renderAcct() {
  const box = $('#acct'); if (!box) return;
  box.textContent = '';
  const u = account.user;
  if (!u) {
    const b = el('button', 'signin'); b.type = 'button'; b.innerHTML = svgIcon('discord'); b.appendChild(el('span', '', 'Sign in'));
    b.addEventListener('click', () => { if (!account.configured) { toast('Discord login is not configured yet.'); return; } openAuth(); });
    box.appendChild(b); return;
  }
  const b = el('button', 'profile'); b.type = 'button'; b.setAttribute('aria-haspopup', 'menu'); b.setAttribute('aria-expanded', 'false');
  const img = new Image(); img.alt = ''; img.width = 28; img.height = 28; img.referrerPolicy = 'no-referrer'; img.src = u.avatar;
  b.append(img, el('span', 'pname', u.name));
  const menu = el('div', 'menu glass'); menu.hidden = true; menu.setAttribute('role', 'menu');
  const head = el('div', 'menu-head'); head.append(el('b', '', u.name), el('span', '', 'Discord account'));
  const out = el('button', 'menu-item'); out.type = 'button'; out.innerHTML = '<svg viewBox="0 0 24 24">' + ICONS.logout + '</svg>'; out.appendChild(el('span', '', 'Log out'));
  out.addEventListener('click', async () => {
    try { await api('/api/logout', { method: 'POST' }); } catch (e) {}
    account.user = null; store.del('vy-user'); renderAcct(); toast('Signed out.');
  });
  menu.append(head, out);
  const setMenu = on => { menu.hidden = !on; b.setAttribute('aria-expanded', on ? 'true' : 'false'); };
  b.addEventListener('click', e => { e.stopPropagation(); setMenu(menu.hidden); });
  menu.addEventListener('click', e => e.stopPropagation());
  document.addEventListener('click', () => { if (!menu.hidden) setMenu(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) setMenu(false); });
  box.append(b, menu);
}
async function loadMe() {
  try {
    const r = await api('/api/me'); const d = await r.json();
    account.configured = !!d.configured;
    account.user = d.user || null;
    if (d.user) store.set('vy-user', d.user); else store.del('vy-user');
  } catch (e) { account.user = null; account.configured = false; store.del('vy-user'); }
  renderAcct();
}

/* --- cart --- */
let panel = null, panelLast = null;
function cartSave() { store.set('vy-cart', cart); renderBadge(); renderCart(); }
function renderBadge() {
  const b = $('#cartBadge'); if (!b) return;
  b.textContent = String(cart.length); b.hidden = cart.length === 0;
  const btn = $('#cartBtn'); if (btn) btn.setAttribute('aria-label', 'Cart (' + cart.length + ')');
}
function buildCart() {
  if (panel) return panel;
  panel = el('div', 'cart'); panel.id = 'cartPanel'; panel.hidden = true;
  panel.innerHTML = '<div class="cart-bg" data-cclose></div><aside class="cart-sheet" role="dialog" aria-modal="true" aria-labelledby="cTitle">' +
    '<div class="cart-top"><h3 id="cTitle">Your cart</h3><button class="icon-btn" data-cclose aria-label="Close cart"><svg viewBox="0 0 24 24">' + ICONS.close + '</svg></button></div>' +
    '<div class="cart-body" id="cartBody"></div><div class="cart-foot" id="cartFoot"></div></aside>';
  document.body.appendChild(panel);
  panel.querySelectorAll('[data-cclose]').forEach(n => n.addEventListener('click', closeCart));
  return panel;
}
function renderCart() {
  if (!panel) return;
  const body = $('#cartBody'), foot = $('#cartFoot'); body.textContent = ''; foot.textContent = '';
  if (!cart.length) {
    const e = el('div', 'cart-empty'); e.append(el('p', '', 'Your cart is empty.'));
    const a = el('a', 'btn ghost center', 'Browse products'); a.href = 'products.html'; a.addEventListener('click', closeCart);
    e.append(a); body.appendChild(e); return;
  }
  let total = 0;
  cart.forEach(id => {
    const p = planById(id); total += Number(p.price);
    const row = el('div', 'cart-item');
    const logo = new Image(); logo.alt = ''; logo.src = CONFIG.logo; logo.className = 'cart-logo';
    const info = el('div', 'cart-info'); info.append(el('b', '', p.product), el('span', '', p.name + ' \u00b7 ' + p.unit));
    const price = el('div', 'cart-price', '$' + p.price);
    const rm = el('button', 'icon-btn sm'); rm.type = 'button'; rm.setAttribute('aria-label', 'Remove ' + p.product); rm.innerHTML = '<svg viewBox="0 0 24 24">' + ICONS.trash2 + '</svg>';
    rm.addEventListener('click', () => { cart = cart.filter(x => x !== id); cartSave(); });
    row.append(logo, info, price, rm); body.appendChild(row);
  });
  const t = el('div', 'cart-total'); t.append(el('span', '', 'Total'), el('b', '', '$' + total));
  const go = el('button', 'btn primary center', account.user ? 'Checkout' : 'Sign in with Discord to checkout'); go.type = 'button';
  go.addEventListener('click', checkout);
  foot.append(t, go);
  if (!account.user) foot.appendChild(el('p', 'note', 'A Discord account is needed to buy.'));
}
async function checkout() {
  if (!account.user) { closeCart(); setTimeout(() => { if (!account.configured) toast('Discord login is not configured yet.'); else openAuth(); }, 240); return; }
  try {
    const r = await api('/api/checkout', { method: 'POST' });
    if (r.status === 401) { account.user = null; store.del('vy-user'); renderAcct(); renderCart(); closeCart(); setTimeout(() => openAuth(), 240); return; }
    const d = await r.json();
    if (!r.ok) throw new Error('checkout');
    closeCart(); setTimeout(() => openPay(d), 240);
  } catch (e) { toast('Checkout failed. Please try again.'); }
}

/* --- payment modal: pick a method, then see the address / instructions --- */
let payEl = null, payLast = null;
const cartTotal = () => cart.reduce((t, id) => t + Number((planById(id) || { price: 0 }).price), 0);
function payIcon(m) { const i = new Image(); i.src = 'assets/pay/' + (m.icon || m.id + '.svg'); i.alt = ''; i.width = 36; i.height = 36; i.className = 'pay-ico'; i.draggable = false; return i; }
function copyText(txt, label) {
  const done = () => toast(label + ' copied.');
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, () => toast('Could not copy. Please copy it manually.'));
  else toast('Could not copy. Please copy it manually.');
}
function buildPay() {
  if (payEl) return payEl;
  payEl = el('div', 'modal'); payEl.id = 'payModal'; payEl.hidden = true;
  payEl.innerHTML = '<div class="modal-bg" data-pclose></div><div class="sheet glass narrow pay" role="dialog" aria-modal="true" aria-labelledby="pTitle">' +
    '<button class="icon-btn x" data-pclose aria-label="Close"><svg viewBox="0 0 24 24">' + ICONS.close + '</svg></button><div id="payBody"></div></div>';
  document.body.appendChild(payEl);
  payEl.querySelectorAll('[data-pclose]').forEach(n => n.addEventListener('click', closePay));
  return payEl;
}
/* Live prices: ONE feed shared by the method list and the detail view; all coins refresh together every 10 s. */
const PAY_NOTE = 'If you are not sure the rate is correct, please open a ticket on our Discord server and staff will help you.';
const PAY_EVERY = 10;
const payLive = { rates: {}, at: 0, ok: true, left: PAY_EVERY, busy: false, timer: null, paint: null };
const payClock = t => new Date(t).toLocaleTimeString('en-GB');
const fmtAmt = (usd, rate, dec) => { const k = Math.pow(10, dec); return (Math.ceil((usd / rate) * k - 1e-9) / k).toFixed(dec); };
const fmtRate = n => '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: n >= 100 ? 2 : 4 });
const payPaint = changed => { if (payLive.paint) payLive.paint(changed); };
async function payRefresh() {
  if (payLive.busy) return; payLive.busy = true;
  try {
    const r = await api('/api/rates'); if (!r.ok) throw new Error('rates');
    const j = await r.json(); let got = 0;
    Object.keys(j.rates || {}).forEach(k => { const n = Number(j.rates[k]); if (n > 0) { payLive.rates[k] = n; got++; } });
    if (got) { payLive.at = Date.now(); payLive.ok = true; } else payLive.ok = false;
  } catch (e) { payLive.ok = false; }
  payLive.busy = false; payLive.left = PAY_EVERY; payPaint(true);
}
function payStart(d) {
  payStop();
  payLive.rates = {}; (d.crypto || []).forEach(c => { if (c.usd) payLive.rates[c.id] = c.usd; });
  payLive.at = Date.now(); payLive.ok = true; payLive.left = PAY_EVERY;
  payLive.timer = setInterval(() => { if (document.hidden) return; payLive.left -= 1; if (payLive.left <= 0) payRefresh(); else payPaint(false); }, 1000);
  payRefresh();
}
function payStop() { if (payLive.timer) { clearInterval(payLive.timer); payLive.timer = null; } payLive.paint = null; }
const payStatus = () => payLive.ok ? 'Live rates \u00b7 updated ' + payClock(payLive.at) + ' \u00b7 next update in ' + payLive.left + 's'
  : 'Could not refresh \u2014 last rates from ' + payClock(payLive.at) + ' \u00b7 retrying in ' + payLive.left + 's';
function payList(d) {
  const b = $('#payBody'); b.textContent = '';
  b.append(el('h2', '', 'Choose payment method'), el('p', 'auth-text', 'Total: $' + cartTotal() + '. Pick how you want to pay.'));
  b.lastChild.id = 'pTitle';
  const list = el('div', 'pay-list'), rows = [];
  const group = (label, items) => {
    list.appendChild(el('div', 'pay-group', label));
    items.forEach(m => {
      const c = (d.crypto || []).find(x => x.id === m.id);
      const btn = el('button', 'pay-opt'); btn.type = 'button';
      const t = el('span', 'pay-name'); t.append(el('b', '', m.name), el('small', '', m.kind === 'crypto' ? m.tag : 'Open a ticket'));
      btn.append(payIcon(m), t);
      if (m.kind === 'crypto' && c) {
        const eq = el('span', 'pay-eq'), a = el('b', ''), r = el('small', ''); eq.append(a, r); btn.appendChild(eq); rows.push({ c, a, r, eq });
      }
      btn.insertAdjacentHTML('beforeend', '<svg class="chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>');
      btn.addEventListener('click', () => payDetail(d, m, c));
      list.appendChild(btn);
    });
  };
  group('Crypto', PAY_METHODS.filter(m => m.kind === 'crypto'));
  group('Other methods', PAY_METHODS.filter(m => m.kind !== 'crypto'));
  b.appendChild(list);
  const live = el('p', 'pay-live pay-live-foot'); b.appendChild(live);
  b.appendChild(el('p', 'note pay-note', PAY_NOTE));
  const total = cartTotal();
  payLive.paint = changed => {
    rows.forEach(x => {
      const n = payLive.rates[x.c.id];
      if (n) {
        const v = '\u2248 ' + fmtAmt(total, n, x.c.decimals) + ' ' + x.c.symbol;
        if (changed && x.a.textContent && x.a.textContent !== v) { x.a.classList.remove('flash'); void x.a.offsetWidth; x.a.classList.add('flash'); }
        x.a.textContent = v; x.r.textContent = '1 ' + x.c.symbol + ' = ' + fmtRate(n);
      } else { x.a.textContent = '\u2026'; x.r.textContent = 'rate unavailable'; }
    });
    live.className = 'pay-live pay-live-foot' + (payLive.ok ? '' : ' stale'); live.textContent = payStatus();
  };
  payPaint(false);
}
function payDetail(d, m, c) {
  const b = $('#payBody'); b.textContent = '';
  payLive.paint = null;
  const back = el('button', 'pay-back'); back.type = 'button'; back.innerHTML = '<svg viewBox="0 0 24 24">' + ICONS.back + '</svg>'; back.appendChild(el('span', '', 'All methods'));
  back.addEventListener('click', () => payList(d));
  const head = el('div', 'pay-head'); head.append(payIcon(m)); const h = el('h2', '', m.name); h.id = 'pTitle'; head.appendChild(h);
  b.append(back, head);
  if (m.kind === 'crypto' && c) {
    const total = cartTotal();
    const box = el('div', 'pay-amount');
    const val = el('b', ''), sub = el('small', ''), live = el('em', 'pay-live');
    box.append(el('span', '', 'Amount'), val, sub, live, el('small', 'pay-hint', 'Send the amount shown when you pay \u2014 it follows the market, so it can change slightly.'));
    const cur = () => payLive.rates[c.id] ? fmtAmt(total, payLive.rates[c.id], c.decimals) : null;
    payLive.paint = changed => {
      const n = payLive.rates[c.id], prev = val.textContent;
      if (n) {
        val.textContent = '\u2248 ' + cur() + ' ' + c.symbol;
        sub.textContent = '= $' + total + ' at 1 ' + c.symbol + ' = ' + fmtRate(n);
        if (changed && prev && prev !== val.textContent) { val.classList.remove('flash'); void val.offsetWidth; val.classList.add('flash'); }
        live.className = 'pay-live' + (payLive.ok ? '' : ' stale'); live.textContent = payStatus();
      } else { val.textContent = '$' + total + ' in ' + c.symbol; sub.textContent = 'Live rate unavailable right now \u2014 retrying\u2026'; live.textContent = ''; }
    };
    payPaint(false);
    const addr = el('div', 'pay-addr'); addr.append(el('span', '', c.symbol + ' address'), el('code', '', c.address));
    const cp = el('button', 'btn ghost center'); cp.type = 'button'; cp.innerHTML = '<svg viewBox="0 0 24 24">' + ICONS.copy + '</svg>'; cp.appendChild(el('span', '', 'Copy address'));
    cp.addEventListener('click', () => copyText(c.address, c.symbol + ' address'));
    const sent = el('button', 'btn primary center', "I've sent the payment"); sent.type = 'button';
    sent.addEventListener('click', () => payPaid(d, m, c, cur()));
    b.append(box, addr, cp);
    b.appendChild(el('p', 'pay-warn', 'Send only ' + c.symbol + ' on the ' + m.network + ' network. Funds sent on another network are lost.'));
    b.appendChild(sent);
    b.appendChild(el('p', 'note pay-note', PAY_NOTE));
  } else {
    b.append(el('p', 'auth-text', m.text));
    b.appendChild(el('p', 'note', 'Mention your Discord name (' + d.user.name + ') and what you want to buy.'));
  }
}
/* after "I've sent the payment": tell the buyer exactly what to put in the ticket */
function payPaid(d, m, c, amt) {
  payLive.paint = null;
  const b = $('#payBody'); b.textContent = '';
  const back = el('button', 'pay-back'); back.type = 'button'; back.innerHTML = '<svg viewBox="0 0 24 24">' + ICONS.back + '</svg>'; back.appendChild(el('span', '', 'Back'));
  back.addEventListener('click', () => payDetail(d, m, c));
  const head = el('div', 'pay-head'); head.append(payIcon(m)); const h = el('h2', '', 'Payment sent \u2014 one more step'); h.id = 'pTitle'; head.appendChild(h);
  b.append(back, head);
  b.appendChild(el('p', 'auth-text', 'To confirm your ' + c.symbol + ' payment, send the transaction ID in a ticket on our Discord server.'));
  const ol = el('ol', 'pay-steps');
  [
    'Copy the transaction ID (TXID / hash) of your ' + c.symbol + ' transfer from your wallet or exchange.',
    'Open a ticket on our Discord server.',
    'Paste the TXID in the ticket together with the details below. Staff will confirm it and deliver your order.'
  ].forEach(t => ol.appendChild(el('li', '', t)));
  b.appendChild(ol);
  const items = (typeof cart !== 'undefined' ? cart : []).map(id => { const p = planById(id); return p ? p.product + ' ' + p.name : ''; }).filter(Boolean).join(', ');
  const msg = 'Crypto payment sent\n' +
    'Coin: ' + c.symbol + ' (' + m.network + ')\n' +
    'Amount: ' + (amt ? amt + ' ' + c.symbol + ' (= $' + cartTotal() + ')' : '$' + cartTotal() + ' in ' + c.symbol) + '\n' +
    'TXID: <paste your transaction ID here>\n' +
    'Discord: ' + d.user.name + '\n' +
    'Order: ' + items;
  const box = el('div', 'pay-addr'); box.append(el('span', '', 'Message for the ticket'), el('code', 'pay-msg', msg));
  const cp = el('button', 'btn ghost center'); cp.type = 'button'; cp.innerHTML = '<svg viewBox="0 0 24 24">' + ICONS.copy + '</svg>'; cp.appendChild(el('span', '', 'Copy message'));
  cp.addEventListener('click', () => copyText(msg, 'Message'));
  b.append(box, cp);
  b.appendChild(el('p', 'pay-warn', 'Orders without a transaction ID in the ticket cannot be confirmed.'));
}
function openPay(d) {
  const m = buildPay(); payLast = document.activeElement; payStart(d); payList(d);
  m.classList.remove('closing'); m.hidden = false; document.body.classList.add('lock');
  const f = $('.pay-opt', m); if (f) f.focus();
}
function closePay() {
  const m = payEl; if (!m || m.hidden || m.classList.contains('closing')) return;
  payStop();
  m.classList.add('closing');
  setTimeout(() => { m.hidden = true; m.classList.remove('closing'); unlock(); if (payLast && document.contains(payLast)) payLast.focus(); }, 230);
}
function openCart() {
  const c = buildCart(); panelLast = document.activeElement; renderCart();
  c.classList.remove('closing'); c.hidden = false; void c.offsetWidth; c.classList.add('open'); document.body.classList.add('lock');
  const f = $('.cart-sheet .btn, .cart-sheet .icon-btn', c); if (f) f.focus();
}
function closeCart() {
  const c = panel; if (!c || c.hidden || c.classList.contains('closing')) return;
  c.classList.remove('open'); c.classList.add('closing');
  setTimeout(() => { c.hidden = true; c.classList.remove('closing'); unlock(); if (panelLast && document.contains(panelLast)) panelLast.focus(); }, 280);
}
function cartAdd(id) {
  if (cart.indexOf(id) >= 0) toast('Already in your cart.'); else { cart.push(id); cartSave(); }
  openCart();
}
document.addEventListener('keydown', e => { if (e.key !== 'Escape') return; if (payEl && !payEl.hidden) closePay(); else if (authEl && !authEl.hidden) closeAuth(); else if (panel && !panel.hidden) closeCart(); });

(function accountInit() {
  const cb = $('#cartBtn'); if (cb) { $('#cartIcon').innerHTML = ICONS.cart; cb.addEventListener('click', openCart); }
  renderBadge(); renderAcct(); loadMe();
  /* result of the Discord redirect: /?auth=ok|cancelled|error|unconfigured */
  const q = new URLSearchParams(location.search), a = q.get('auth');
  if (a) {
    history.replaceState({}, '', location.pathname + location.hash);
    const run = () => {
      if (a === 'ok') toast('Signed in with Discord.');
      else if (a === 'cancelled') toast('Discord sign-in was cancelled.');
      else if (a === 'unconfigured') toast('Discord login is not configured yet.');
      else toast('Discord sign-in failed. Please try again.');
    };
    setTimeout(run, document.documentElement.classList.contains('seen') ? 150 : 4800);
  }
})();

/* ===== PAGE INITS (re-run after every in-page navigation) ===== */
let closeModal = null;
document.addEventListener('keydown', e => { if (e.key === 'Escape' && closeModal) closeModal(); });

function initProducts() {
  closeModal = null;
  const open = $('#openPremium'); if (!open) return;
  function loadLogo(sel) {
    const slot = $(sel), img = new Image(); img.alt = 'Premium Tweaks logo';
    img.onload = () => { slot.classList.add('has'); slot.textContent = ''; slot.appendChild(img); };
    img.src = CONFIG.logo;
  }
  loadLogo('#logoSlot'); loadLogo('#logoSlotBig');

  const inc = $('#incl');
  CONFIG.includes.forEach((t, i) => {
    const li = el('li', 'tweak'); li.style.setProperty('--i', i);
    const ico = el('span', 'ico'); ico.innerHTML = svgIcon(t.icon);
    const txt = el('div'); txt.append(el('b', '', t.title), el('span', 'd', t.desc));
    li.append(ico, txt);
    li.addEventListener('pointermove', e => {
      const r = li.getBoundingClientRect();
      li.style.setProperty('--mx', (e.clientX - r.left) + 'px'); li.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
    inc.appendChild(li);
  });

  const box = $('#plans');
  CONFIG.plans.forEach(p => {
    const c = el('div', 'plan' + (p.best ? ' best' : ''));
    if (p.best) c.appendChild(el('span', 'pill', 'Best value'));
    const price = el('div', 'plan-price', '$' + p.price + ' '); price.appendChild(el('small', '', p.unit));
    const b = el('button', 'btn center ' + (p.best ? 'primary' : 'ghost'), 'Add to cart'); b.type = 'button';
    b.addEventListener('click', () => { closeM(); setTimeout(() => cartAdd(p.id), 240); });
    c.append(el('div', 'plan-name', p.name), price, el('div', 'plan-desc', p.desc), b);
    box.appendChild(c);
  });

  let last;
  const modal = $('#modal');
  const openM = () => { last = document.activeElement; modal.classList.remove('closing'); modal.hidden = false; document.body.classList.add('lock'); $('#modal .x').focus(); };
  let closing = false;
  const closeM = () => {
    if (closing || modal.hidden) return; closing = true;
    modal.classList.add('closing');
    setTimeout(() => { modal.hidden = true; modal.classList.remove('closing'); closing = false; document.body.classList.remove('lock'); if (last && document.contains(last)) last.focus(); }, 230);
  };
  closeModal = closeM;
  open.addEventListener('click', openM);
  modal.querySelectorAll('[data-close]').forEach(e => e.addEventListener('click', closeM));
}

function initSocials() {
  const grid = $('#socials'); if (!grid) return;
  CONFIG.socials.forEach(s => {
    const a = el('a', 'social glass hover'); a.href = s.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    a.addEventListener('click', e => { if (s.url === '#') { e.preventDefault(); toast(s.name + ' link is not configured yet.'); } });
    const ico = el('div', 'ico'); ico.innerHTML = svgIcon(s.icon);
    const go = el('span', 'go', 'Open ' + s.name); go.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 24 24"><path d="M7 17L17 7M8 7h9v9"/></svg>');
    a.append(ico, el('h3', '', s.name), el('p', '', s.desc), go);
    grid.appendChild(a);
  });
  if (CONFIG.socials.length === 1) grid.classList.add('single');
}

function initPage() { initProducts(); initSocials(); }
initPage();

/* ===== TABS: sliding indicator + in-page navigation =====
   Instead of reloading the whole document (which re-creates the background, nav and fonts and causes a visible hitch),
   the next page is fetched, only <main> (and the modal) is swapped, and the nav / background stay untouched. */
(function router() {
  const nav = $('.links'); if (!nav) return;
  const root = document.documentElement;
  const links = Array.from(nav.querySelectorAll('a'));
  const norm = p => (p.replace(/\/index\.html$/, '/').replace(/\.html$/, '').replace(/\/+$/, '') || '/');
  const idxOf = path => links.findIndex(a => norm(new URL(a.getAttribute('href'), location.href).pathname) === norm(path));
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let cur = Math.max(0, links.findIndex(a => a.classList.contains('on')));
  const flagHome = () => root.classList.toggle('on-home', cur === 0);
  flagHome();

  const ind = el('span', 'tab-ind'); nav.prepend(ind); nav.classList.add('js-ind');
  const place = a => { ind.style.setProperty('width', a.offsetWidth + 'px'); ind.style.setProperty('transform', 'translateX(' + a.offsetLeft + 'px)'); };
  const placeNow = a => { ind.style.setProperty('transition', 'none'); place(a); void ind.offsetWidth; ind.style.removeProperty('transition'); };
  placeNow(links[cur]);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => placeNow(links[cur]));
  window.addEventListener('resize', () => placeNow(links[cur]));

  /* prefetch: pages are tiny, so they are ready before the click */
  const cache = new Map();
  function load(url) {
    if (!cache.has(url)) cache.set(url, fetch(url, { credentials: 'same-origin' })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.text(); })
      .catch(err => { cache.delete(url); throw err; }));
    return cache.get(url);
  }
  const prefetch = a => { try { const u = new URL(a.href, location.href); if (u.origin === location.origin) load(u.href).catch(() => {}); } catch (e) {} };
  links.forEach(a => { ['pointerenter', 'touchstart', 'focus'].forEach(t => a.addEventListener(t, () => prefetch(a), { passive: true })); });
  (window.requestIdleCallback || (f => setTimeout(f, 600)))(() => links.forEach(a => { if (a !== links[cur]) prefetch(a); }));

  let token = 0, fxT;
  async function go(href, push) {
    const u = new URL(href, location.href);
    const to = idxOf(u.pathname);
    const dir = to > cur || to < 0 ? 'fwd' : 'back';
    const my = ++token;
    const oldMain = $('main');
    if (oldMain) { oldMain.classList.remove('out-fwd', 'out-back'); oldMain.classList.add('out', 'out-' + dir); }
    if (to >= 0) place(links[to]);
    let html;
    try { [html] = await Promise.all([load(u.href), sleep(reduce ? 0 : 230)]); } catch (err) { location.href = u.href; return; }
    if (my !== token) return;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const nm = doc.querySelector('main');
    if (!nm || !oldMain) { location.href = u.href; return; }

    root.classList.remove('from-fwd', 'from-back'); root.classList.add('from-' + dir);
    const oldModal = $('#modal'); if (oldModal) oldModal.remove();
    closeModal = null;
    const m = document.importNode(nm, true);
    oldMain.replaceWith(m);
    const nmodal = doc.querySelector('#modal'); if (nmodal) m.after(document.importNode(nmodal, true));
    document.title = doc.title;
    if (push) history.pushState({}, '', u.href);
    if (to >= 0) { cur = to; links.forEach((a, i) => { a.classList.toggle('on', i === to); if (i === to) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }); flagHome(); }
    if (!$('#intro')) document.body.classList.remove('lock');
    window.scrollTo(0, 0);
    initPage();
    clearTimeout(fxT); fxT = setTimeout(() => root.classList.remove('from-fwd', 'from-back'), 1000);
  }

  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target && a.target !== '_self') return;
    let u; try { u = new URL(a.href, location.href); } catch (err) { return; }
    if (u.origin !== location.origin || u.pathname.indexOf('/api/') === 0) return;
    if (norm(u.pathname) === norm(location.pathname)) { if (!u.hash) e.preventDefault(); return; }
    e.preventDefault();
    go(u.href, true);
  });

  window.addEventListener('popstate', () => go(location.href, false));
})();

/* ===== BACKGROUND FX: slight parallax of the misty logo ===== */
(function bgfx() {
  const bg = $('.bg'); if (!bg) return;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wrap = $('.mist-wrap');
  if (reduce) return;
  let tx = innerWidth / 2, ty = innerHeight / 3, x = tx, y = ty, run = false;
  function frame() {
    x += (tx - x) * .08; y += (ty - y) * .08;
    if (wrap) wrap.style.setProperty('transform', 'translate3d(' + ((x / innerWidth - .5) * -26).toFixed(1) + 'px,' + ((y / innerHeight - .5) * -18).toFixed(1) + 'px,0)');
    if (Math.abs(tx - x) > .4 || Math.abs(ty - y) > .4) requestAnimationFrame(frame); else run = false;
  }
  addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; if (!run) { run = true; requestAnimationFrame(frame); } }, { passive: true });
  run = true; frame();
})();
