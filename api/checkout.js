const { send, checkout } = require("../lib/shop");
module.exports = async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "method not allowed" });
  const r = await checkout(req.body);
  send(res, r.code, r.body);
};
