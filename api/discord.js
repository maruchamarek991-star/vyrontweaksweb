const { send, getDiscordStats } = require("../lib/shop");
/* GET /api/discord -> { members, online }  (cached; 503 if Discord can't be reached and nothing is cached) */
module.exports = async (req, res) => {
  if (req.method !== "GET") return send(res, 405, { error: "method not allowed" });
  const d = await getDiscordStats();
  if (!d) return send(res, 503, { error: "unavailable" });
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  res.end(JSON.stringify(d));
};
