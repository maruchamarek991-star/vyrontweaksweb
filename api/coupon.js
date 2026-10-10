const { send, issueCoupon, verifyCoupon, fingerprint } = require("../lib/shop");
/* POST /api/coupon            -> issues the visitor's scratch-card discount (5-20 %, valid 24 h) and returns { code, pct, exp }
                                  Asking again on the same day returns the same percentage (no re-rolling for a better one).
   POST /api/coupon { code }   -> validates an existing code and returns { code, pct, exp } or 400 */
module.exports = (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "method not allowed" });
  const b = req.body || {};
  if (b.code !== undefined) {
    const c = verifyCoupon(b.code);
    return c ? send(res, 200, c) : send(res, 400, { error: "This discount code is invalid or has expired", code: "coupon_invalid" });
  }
  send(res, 200, issueCoupon(fingerprint(req)));
};
