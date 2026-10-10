// node -r ./tests/preload.js local-server.js  -> the local server runs against a fake internet (see mock-network.js).
// POST /__mock {action:"paySol"|"payLtc"|"confirmSol"|"confirmLtc"|"down"|"up", orderToken?} lets a browser test act as the payer.
"use strict";
process.env.COUPON_SECRET = "e2e-secret";
process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1/abc";
const http = require("node:http");
const { install, state } = require("./mock-network");
install();
const orig = http.createServer;
http.createServer = function (handler) {
  return orig.call(http, async (req, res) => {
    if (req.url === "/__mock") {
      let b = ""; for await (const c of req) b += c;
      const { action, units } = JSON.parse(b || "{}"), now = Math.floor(Date.now() / 1000);
      if (action === "paySol") state.sol.push({ signature: "e2esig" + state.sol.length, blockTime: now, status: "confirmed", lamports: units * 10 });
      if (action === "finalizeSol") state.sol.forEach(t => (t.status = "finalized"));
      if (action === "payLtc") state.ltc.push({ txid: "e2eltc" + state.ltc.length, value: units, confirmed: false });
      if (action === "confirmLtc") state.ltc.forEach(t => Object.assign(t, { confirmed: true, height: state.ltcTip, time: now }));
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ ok: true, hooks: state.hooks.length }));
    }
    return handler(req, res);
  });
};
