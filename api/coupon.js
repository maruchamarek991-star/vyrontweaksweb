const { send, issueCoupon, verifyCoupon } = require("../lib/shop");
/* POST /api/coupon            -> rolls a new scratch-card discount (5-20 %) and returns { code, pct, exp }
   POST /api/coupon { code }   -> validates an existing code and returns { code, pct, exp } or 400 */
module.exports = (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "method not allowed" });
  const b = req.body || {};
  if (b.code !== undefined) {
    const c = verifyCoupon(b.code);
    return c ? send(res, 200, c) : send(res, 400, { error: "This discount code is invalid or has expired" });
  }
  send(res, 200, issueCoupon());
};
