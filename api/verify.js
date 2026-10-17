const { send } = require("../lib/shop");
const { checkOrder } = require("../lib/chain");
const { limited } = require("../lib/limit");
/* POST /api/verify { token }  -> { status: "waiting" | "detected" | "confirmed" | "expired", txid?, confirmations?, required?, expires, degraded? }
   `token` is the signed order token returned by /api/checkout for crypto payments. */
module.exports = limited("verify", 90, 60000, async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "method not allowed" });
  const r = await checkOrder((req.body || {}).token);
  send(res, r.code, r.body);
});
