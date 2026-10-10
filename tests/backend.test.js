// Backend tests (no dependencies):  node tests/backend.test.js
"use strict";
process.env.COUPON_SECRET = "test-secret";
process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1/abc";
const assert = require("node:assert/strict");
const { install, state } = require("./mock-network");
install();
const shop = require("../lib/shop");
const chain = require("../lib/chain");
const { issueCoupon, verifyCoupon, checkout, parseOrder, signOrder, MINUTE, HOUR, DAY } = shop;

let passed = 0;
const test = async (name, fn) => { try { await fn(); passed++; console.log("  ok  " + name); } catch (e) { console.log("FAIL  " + name + "\n" + e.stack); process.exitCode = 1; } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  console.log("coupons");
  await test("code is valid for exactly 24 hours, then it expires", () => {
    const now = Date.now(), c = issueCoupon("1.2.3.4|UA", now);
    assert.ok(c.pct >= 5 && c.pct <= 20);
    assert.ok(Math.abs(c.exp - (now + 24 * HOUR)) < MINUTE, "expiry is 24h from issue");
    assert.ok(verifyCoupon(c.code, now + 24 * HOUR - 2 * MINUTE), "still valid just before 24h");
    assert.equal(verifyCoupon(c.code, now + 24 * HOUR + 2 * MINUTE), null, "expired just after 24h");
  });
  await test("tampered or forged codes are rejected", () => {
    const c = issueCoupon("x|y");
    assert.equal(verifyCoupon(c.code.replace(/^VYRON\d+/, "VYRON20")), c.pct === 20 ? c.code : null);
    assert.equal(verifyCoupon(c.code.slice(0, -1) + (c.code.endsWith("A") ? "B" : "A")), null);
    assert.equal(verifyCoupon("VYRON20-ZZZZZZZZZ-0000000000"), null);
    assert.equal(verifyCoupon(""), null);
  });
  await test("re-rolling does not help: same visitor + same day -> same percentage", () => {
    const now = Date.UTC(2026, 9, 10, 0, 30); // everything below stays inside the same UTC day
    const set = new Set(Array.from({ length: 30 }, () => issueCoupon("5.6.7.8|Chrome", now + Math.random() * 22 * HOUR).pct));
    assert.equal(set.size, 1);
  });
  await test("a new day gives a new random percentage; visitors differ; all within 5-20", () => {
    const days = new Set(), visitors = new Set();
    for (let d = 0; d < 60; d++) { const p = issueCoupon("9.9.9.9|UA", Date.UTC(2026, 9, 1 + d, 8)).pct; days.add(p); assert.ok(p >= 5 && p <= 20); }
    for (let v = 0; v < 60; v++) visitors.add(issueCoupon("10.0.0." + v + "|UA", Date.UTC(2026, 9, 10, 8)).pct);
    assert.ok(days.size > 8, "percentage changes from day to day (" + days.size + " distinct)");
    assert.ok(visitors.size > 8, "visitors get different percentages (" + visitors.size + " distinct)");
  });
  await test("fingerprint uses forwarded IP + UA and reduces IPv6 to /64", () => {
    const a = shop.fingerprint({ headers: { "x-forwarded-for": "2001:db8:1:2:aaaa:bbbb:cccc:dddd, 10.0.0.1", "user-agent": "UA" } });
    const b = shop.fingerprint({ headers: { "x-forwarded-for": "2001:db8:1:2:1111:2222:3333:4444", "user-agent": "UA" } });
    assert.equal(a, b);
  });

  console.log("checkout");
  await test("rejects unknown payment method with a machine-readable code", async () => {
    const r = await checkout({ method: "nope", items: [{ productId: 0, qty: 1 }] });
    assert.equal(r.code, 400); assert.equal(r.body.code, "choose_method");
  });
  await test("expired / invalid coupon is reported with its code", async () => {
    const r = await checkout({ method: "paypal", coupon: "VYRON10-AAAAAAAAA-0000000000", items: [{ productId: 0, qty: 1 }] });
    assert.equal(r.code, 400); assert.equal(r.body.code, "coupon_invalid"); assert.equal(r.body.couponInvalid, true);
  });
  await test("ticket methods have no crypto block; coupon discount is applied in cents", async () => {
    const c = issueCoupon("a|b"), r = await checkout({ method: "blik", coupon: c.code, items: [{ productId: 0, qty: 1 }] });
    assert.equal(r.code, 201); assert.equal(r.body.crypto, undefined);
    assert.equal(r.body.total, Math.round(500 * (100 - c.pct) / 100) / 100);
  });
  let order;
  await test("SOL checkout locks a unique amount in a signed token", async () => {
    const r = await checkout({ method: "sol", items: [{ productId: 0, qty: 1 }] });
    assert.equal(r.code, 201); order = r.body;
    const o = parseOrder(order.crypto.token);
    assert.equal(o.id, order.orderId); assert.equal(o.m, "sol"); assert.equal(o.t, 500);
    const exact = 5 / 150, units = o.u / 1e8;
    assert.ok(units > exact && units < exact + 0.00011, "amount = $5/rate + dust <= 0.0001");
    assert.equal(order.crypto.amount, shop.fmtUnits(o.u)); assert.match(order.crypto.amount, /^\d+\.\d{8}$/);
    assert.ok(order.crypto.expires - order.crypto.created === 30 * MINUTE);
  });
  await test("two orders get different amounts", async () => {
    const seen = new Set();
    for (let i = 0; i < 25; i++) seen.add((await checkout({ method: "ltc", items: [{ productId: 0, qty: 1 }] })).body.crypto.amount);
    assert.ok(seen.size >= 24, "unique amounts (" + seen.size + "/25)");
  });
  await test("token tampering is detected", () => {
    const t = order.crypto.token, [b, s] = t.split(".");
    assert.equal(parseOrder(b + "." + s.slice(0, -1) + (s.endsWith("A") ? "B" : "A")), null);
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(b, "base64url")), u: 1 })).toString("base64url");
    assert.equal(parseOrder(forged + "." + s), null);
    assert.equal(parseOrder("garbage"), null); assert.equal(parseOrder(undefined), null);
  });

  console.log("verification – Solana");
  const check = async tok => { chain._cache.clear(); return (await chain.checkOrder(tok)).body; };
  const lamports = o => parseOrder(o.crypto.token).u * 10;
  await test("waiting while nothing was sent", async () => assert.equal((await check(order.crypto.token)).status, "waiting"));
  await test("a payment of the wrong amount is ignored", async () => {
    state.sol.push({ signature: "sigWRONG", blockTime: Math.floor(Date.now() / 1000), status: "finalized", lamports: lamports(order) + 10 });
    assert.equal((await check(order.crypto.token)).status, "waiting");
  });
  await test("a payment of the exact amount is detected, then confirmed once finalized", async () => {
    state.sol.push({ signature: "sigOK", blockTime: Math.floor(Date.now() / 1000), status: "confirmed", lamports: lamports(order) });
    let r = await check(order.crypto.token);
    assert.equal(r.status, "detected"); assert.equal(r.txid, "sigOK");
    state.sol.find(t => t.signature === "sigOK").status = "finalized";
    r = await check(order.crypto.token);
    assert.equal(r.status, "confirmed"); assert.equal(r.txid, "sigOK");
    await sleep(30);
    assert.equal(state.hooks.length, 1, "Discord webhook fired exactly once");
    assert.match(JSON.stringify(state.hooks[0]), new RegExp(order.orderId));
    await check(order.crypto.token); await sleep(30);
    assert.equal(state.hooks.length, 1, "...and is not repeated on later polls");
  });
  await test("a different order is not marked paid by someone else's transfer", async () => {
    const other = (await checkout({ method: "sol", items: [{ productId: 0, qty: 1 }] })).body;
    assert.equal((await check(other.crypto.token)).status, "waiting");
  });
  await test("transactions older than the order do not count", async () => {
    const o2 = (await checkout({ method: "sol", items: [{ productId: 0, qty: 1 }] })).body;
    state.sol.push({ signature: "sigOLD", blockTime: Math.floor(Date.now() / 1000) - 5 * 3600, status: "finalized", lamports: lamports(o2) });
    assert.equal((await check(o2.crypto.token)).status, "waiting");
  });
  await test("RPC caching: polling does not hammer the node", async () => {
    chain._cache.clear(); state.calls.solSigs = 0; state.calls.solTx = 0;
    for (let i = 0; i < 20; i++) await chain.checkOrder(order.crypto.token);
    assert.equal(state.calls.solSigs, 1); assert.ok(state.calls.solTx <= 3);
  });
  await test("status becomes `expired` only after quote + grace, and `degraded` is flagged when APIs fail", async () => {
    const old = signOrder({ v: 1, id: "ABCDEF", m: "sol", u: 123456789, c: Date.now() - 50 * MINUTE, t: 500, p: 0 });
    assert.equal((await check(old)).status, "expired");
    const fresh = signOrder({ v: 1, id: "ABCDE1", m: "sol", u: 123456789, c: Date.now() - 40 * MINUTE, t: 500, p: 0 });
    assert.equal((await check(fresh)).status, "waiting", "40 min old: past the quote but inside the grace window");
    state.allDown = true;
    const r = await check(order.crypto.token.replace(/^/, ""));
    assert.equal(r.degraded, true); state.allDown = false;
  });

  console.log("verification – Litecoin");
  let lo;
  await test("LTC order + unconfirmed (mempool) payment -> detected", async () => {
    lo = (await checkout({ method: "ltc", items: [{ productId: 0, qty: 1 }] })).body;
    const u = parseOrder(lo.crypto.token).u;
    assert.equal((await check(lo.crypto.token)).status, "waiting");
    state.ltc.push({ txid: "ltcTX1", value: u, confirmed: false });
    const r = await check(lo.crypto.token);
    assert.equal(r.status, "detected"); assert.equal(r.confirmations, 0); assert.equal(r.required, 1);
  });
  await test("one confirmation -> confirmed", async () => {
    Object.assign(state.ltc[0], { confirmed: true, height: 1000, time: Math.floor(Date.now() / 1000) });
    const r = await check(lo.crypto.token);
    assert.equal(r.status, "confirmed"); assert.equal(r.confirmations, 1);
  });
  await test("falls back to BlockCypher when the primary explorer is down", async () => {
    state.esploraDown = true;
    const r = await check(lo.crypto.token);
    assert.equal(r.status, "confirmed"); assert.equal(r.txid, "ltcTX1"); state.esploraDown = false;
  });
  await test("invalid token -> 400 bad_token", async () => {
    const r = await chain.checkOrder("nope"); assert.equal(r.code, 400); assert.equal(r.body.code, "bad_token");
  });

  console.log(`\n${passed} passed${process.exitCode ? ", SOME FAILED" : ""}`);
})();
