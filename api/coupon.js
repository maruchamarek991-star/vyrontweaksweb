const { send, issueCoupon, verifyCoupon } = require("../lib/shop");
/* POST /api/coupon            -> the current Halloween offer { code, pct, exp }, or 410 once it has ended
   POST /api/coupon { code }   -> validates a code and returns { code, pct, exp } or 400 */
module.exports = (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "method not allowed" });
  const b = req.body || {};
  if (b.code !== undefined) {
    const c = verifyCoupon(b.code);
    return c ? send(res, 200, c) : send(res, 400, { error: "This discount code is invalid or has expired", code: "coupon_invalid" });
  }
  const c = issueCoupon();
  c ? send(res, 200, c) : send(res, 410, { error: "The Halloween sale has ended", code: "coupon_invalid" });
};
