const { send, getRates, RATE_TTL } = require("../lib/shop");
const { limited } = require("../lib/limit");
module.exports = limited("rates", 60, 60000, async (req, res) => {
  if (req.method !== "GET") return send(res, 405, { error: "method not allowed" });
  const c = await getRates();
  send(res, 200, { rates: c.rates, updated: c.at, stale: Date.now() - c.at > 3 * RATE_TTL });
});
