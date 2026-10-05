const { send, checkout } = require("../lib/shop");
module.exports = (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "method not allowed" });
  const r = checkout(req.body);
  send(res, r.code, r.body);
};
