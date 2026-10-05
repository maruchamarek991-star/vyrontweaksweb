const { send } = require("../../../lib/shop");
module.exports = (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "method not allowed" });
  send(res, 200, { ok: true, status: "sent" });
};
