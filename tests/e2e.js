// Browser test: node tests/e2e.js   (needs the local server with the fake internet on :3111)
//   PORT=3111 node -r ./tests/preload.js local-server.js &
"use strict";
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const BASE = "http://localhost:" + (process.env.PORT || 3111);
const mock = (action, units) => fetch(BASE + "/__mock", { method: "POST", body: JSON.stringify({ action, units }) }).then(r => r.json());
let passed = 0;
const test = async (name, fn) => { try { await fn(); passed++; console.log("  ok  " + name); } catch (e) { console.log("FAIL  " + name + "\n" + (e.stack || e).toString().split("\n").slice(0, 6).join("\n")); process.exitCode = 1; } };

(async () => {
  const browser = await chromium.launch();
  const mk = async (locale, w = 1280, h = 900) => {
    const ctx = await browser.newContext({ locale, viewport: { width: w, height: h }, permissions: ["clipboard-read", "clipboard-write"] });
    const page = await ctx.newPage(); page.errors = [];
    page.on("console", m => { if ((m.type() === "error" || /Content Security Policy|violat/i.test(m.text())) && !/ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED/.test(m.text())) page.errors.push(m.text()); });
    page.on("pageerror", e => page.errors.push("pageerror: " + e.message));
    return { ctx, page };
  };
  const skipIntro = async page => { await page.click("#skip"); await page.waitForSelector("#intro", { state: "detached" }); };
  const txt = (page, sel) => page.locator(sel).first().innerText();
  const openBuy = async page => { await page.click('nav button[data-t="products"]'); await page.waitForTimeout(500); await page.click("#tilebuy"); };

  console.log("language switch");
  {
    const { ctx, page } = await mk("en-US");
    await page.goto(BASE + "/"); await skipIntro(page);
    await test("EN page loads without console errors or CSP violations", async () => {
      assert.equal(await page.getAttribute("html", "lang"), "en");
      assert.equal(await txt(page, "nav button.on"), "Main");
      assert.match(await txt(page, "h1"), /Optimize your PC for Gaming/);
      assert.deepEqual(page.errors, []);
    });
    await test("clicking PL translates the page in place, updates URL, <html lang>, title and legal links", async () => {
      await page.click('[data-lang="pl"]');
      assert.equal(await page.getAttribute("html", "lang"), "pl");
      assert.equal(new URL(page.url()).pathname, "/pl/");
      assert.match(await txt(page, "h1"), /Zoptymalizuj swój komputer do gier/);
      assert.equal(await txt(page, "nav button.on"), "Start");
      assert.match(await page.title(), /optymalizacja Windowsa/);
      assert.equal(await page.getAttribute('.ftc a[href*="terms"]', "href"), "/pl/terms.html");
      assert.equal(await page.getAttribute('[data-lang="pl"]', "aria-pressed"), "true");
    });
    await test("choice is remembered and clicking EN switches back", async () => {
      await page.reload(); await skipIntro(page);
      assert.equal(await page.getAttribute("html", "lang"), "pl");
      await page.click('[data-lang="en"]');
      assert.equal(new URL(page.url()).pathname, "/");
      assert.equal(await txt(page, "nav button.on"), "Main");
      assert.equal(await page.getAttribute('.ftc a[href*="terms"]', "href"), "/terms.html");
    });
    await ctx.close();
  }
  await test("Polish browser on / is switched to Polish automatically", async () => {
    const { ctx, page } = await mk("pl-PL");
    await page.goto(BASE + "/"); await skipIntro(page);
    assert.equal(await page.getAttribute("html", "lang"), "pl");
    assert.equal(new URL(page.url()).pathname, "/pl/");
    assert.deepEqual(page.errors, []); await ctx.close();
  });
  await test("/pl/ is served as Polish HTML (no JS needed) and stays Polish for an English browser", async () => {
    const html = await (await fetch(BASE + "/pl/")).text();
    assert.match(html, /<html lang="pl"/); assert.match(html, /hreflang="en" href="https:\/\/vyron\.lol\/"/);
    assert.match(html, /"@type":"FAQPage"/); assert.match(html, /Czy Vyron Tweaks jest bezpieczny\?/);
    const { ctx, page } = await mk("en-US"); await page.goto(BASE + "/pl/"); await skipIntro(page);
    assert.equal(await page.getAttribute("html", "lang"), "pl"); assert.match(await txt(page, "h1"), /Zoptymalizuj/);
    assert.deepEqual(page.errors, []); await ctx.close();
  });
  await test("no English left on the Polish page (home, product modal, scratch card, payment window)", async () => {
    const { ctx, page } = await mk("en-US"); await page.goto(BASE + "/pl/"); await skipIntro(page);
    await page.waitForSelector("#cpn.open", { timeout: 9000 }); // scratch card
    const I18N = await page.evaluate(() => I18N);
    const strip = s => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/\{\w+\}|\$/g, "").trim();
    const leaks = [];
    const check = async label => {
      const body = await page.evaluate(() => document.body.innerText + " " + [...document.querySelectorAll("[aria-label]")].map(e => e.getAttribute("aria-label")).join(" "));
      for (const [k, v] of Object.entries(I18N.en)) {
        const e = strip(v);
        if (e.length < 6 || e === strip(I18N.pl[k]) || strip(I18N.pl[k]).includes(e) || /^(Solana|Litecoin|Premium)/.test(e)) continue;
        if (body.includes(e)) leaks.push(`${label}: ${k} -> "${e}"`);
      }
    };
    await check("scratch"); await page.click("#cpx");
    await check("home");
    for (const t of ["products", "updates", "contact"]) { await page.click(`nav button[data-t="${t}"]`); await page.waitForTimeout(450); await check(t); }
    await page.click("nav button[data-t=\"products\"]"); await page.waitForTimeout(450); await page.click("#tile"); await check("product modal"); await page.click("#pcl");
    await openBuy(page); await page.click('[data-pm="sol"]'); await check("payment methods");
    await page.click("#pc"); await page.waitForSelector("#sendamt"); await check("crypto order");
    await page.click("#manual"); await check("manual guide");
    assert.deepEqual(leaks, []); assert.deepEqual(page.errors, []); await ctx.close();
  });

  console.log("Halloween coupon");
  {
    const { ctx, page } = await mk("en-US"); await page.goto(BASE + "/"); await skipIntro(page);
    await test("-20% Halloween popup appears and the discount is already applied", async () => {
      await page.waitForSelector("#cpn.open", { timeout: 9000 });
      assert.match(await txt(page, "#sccode"), /HALLOWEEN20/);
      assert.match(await txt(page, "#tsub"), /−20% applied/);
      const c = await page.evaluate(() => JSON.parse(localStorage.getItem("vy-coupon")));
      assert.equal(c.pct, 20); assert.equal(c.exp, Date.UTC(2026, 9, 31, 23));
      assert.deepEqual(page.errors, []);
    });
    await ctx.close();
  }

  console.log("crypto payment, verified automatically");
  for (const [lang, locale] of [["en", "en-US"], ["pl", "pl-PL"]]) {
    const { ctx, page } = await mk(locale); await page.goto(BASE + (lang === "pl" ? "/pl/" : "/")); await skipIntro(page);
    await page.waitForSelector("#cpn.open", { timeout: 9000 }); await page.click("#cpx");
    await openBuy(page); await page.click('[data-pm="sol"]'); await page.click("#pc");
    await page.waitForSelector("#sendamt");
    const amount = await txt(page, "#sendamt");
    await test(`[${lang}] SOL: locked unique amount + live status "waiting"`, async () => {
      assert.match(amount, /^\d+\.\d{8}$/);
      assert.ok(await page.locator(".opanel").first().isVisible());
      assert.match(await page.locator(".ostat").first().textContent(), lang === "pl" ? /Oczekiwanie na płatność/ : /Awaiting payment/);
      assert.match(await txt(page, "[data-quote]"), /^\d+:\d\d$/);
    });
    await test(`[${lang}] SOL: exact payment is detected, then confirmed once finalized; Discord webhook fires once`, async () => {
      await mock("paySol", Number(amount.replace(".", "")));
      await page.waitForSelector(".ostat.det", { timeout: 15000 });
      await mock("finalizeSol");
      await page.waitForSelector(".ostat.okc", { timeout: 15000 });
      const tpl = await txt(page, "#tpl");
      assert.match(tpl, /e2esig\d/); assert.match(tpl, lang === "pl" ? /Zamówienie #/ : /Order #/);
      assert.match(await txt(page, ".opanel"), lang === "pl" ? /Płatność potwierdzona/ : /Payment confirmed/);
      await page.screenshot({ path: `/tmp/shot-${lang}-confirmed.png` });
      assert.equal((await mock("noop")).hooks, lang === "en" ? 1 : 2, "one Discord notification per paid order");
      assert.deepEqual(page.errors, []);
    });
    await ctx.close();
  }
  await test("LTC: mempool payment -> detected, 1 confirmation -> confirmed", async () => {
    const { ctx, page } = await mk("en-US"); await page.goto(BASE + "/"); await skipIntro(page);
    await page.waitForSelector("#cpn.open", { timeout: 9000 }); await page.click("#cpx");
    await openBuy(page); await page.click('[data-pm="ltc"]'); await page.click("#pc"); await page.waitForSelector("#sendamt");
    await mock("payLtc", Number((await txt(page, "#sendamt")).replace(".", "")));
    await page.waitForSelector(".ostat.det", { timeout: 15000 });
    await mock("confirmLtc");
    await page.waitForSelector(".ostat.okc", { timeout: 15000 });
    await ctx.close();
  });
  await test("ticket methods (BLIK) are unchanged: no polling, ticket steps shown", async () => {
    const { ctx, page } = await mk("pl-PL"); await page.goto(BASE + "/pl/"); await skipIntro(page);
    await page.waitForSelector("#cpn.open", { timeout: 9000 }); await page.click("#cpx");
    await openBuy(page); await page.click('[data-pm="blik"]'); await page.click("#pc"); await page.waitForSelector(".steps");
    assert.match(await txt(page, ".steps"), /Podaj numer zamówienia #[0-9A-F]{6} oraz wybraną metodę płatności: BLIK/);
    await ctx.close();
  });

  console.log("layout");
  for (const [w, h] of [[1280, 800], [390, 800], [340, 700]]) {
    for (const [lang, locale, path] of [["en", "en-US", "/"], ["pl", "pl-PL", "/pl/"]]) {
      const { ctx, page } = await mk(locale, w, h); await page.goto(BASE + path); await skipIntro(page); await page.waitForTimeout(1300);
      await test(`header fits at ${w}px (${lang}): no horizontal overflow`, async () => {
        const o = await page.evaluate(() => { const p = document.querySelector(".pill").getBoundingClientRect(), a = document.querySelector(".act").getBoundingClientRect(); return { pillRight: p.right, actRight: a.right, vw: innerWidth, sw: document.documentElement.scrollWidth }; });
        assert.ok(o.sw <= o.vw + 1, "page scrolls sideways: " + JSON.stringify(o)); assert.ok(o.actRight <= o.pillRight + 1, "controls overflow the pill: " + JSON.stringify(o));
      });
      if (w !== 1280 || lang === "pl") await page.screenshot({ path: `/tmp/shot-${lang}-${w}.png` });
      await ctx.close();
    }
  }
  await browser.close();
  console.log(`\n${passed} passed${process.exitCode ? ", SOME FAILED" : ""}`);
})();
