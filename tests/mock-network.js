// Fake internet for tests: price APIs, a Solana RPC node, Litecoin explorers and a Discord webhook.
// `state` is mutable so a test can "make a payment" on the fake blockchain.
"use strict";
const SOL_ADDR = "GMjFESghmNJDk17YUecARhZbBftnCDDUdx72CJDdvKk4";
const LTC_ADDR = "LeGJQcZ9bpBB4sYWAr3myLAHX3oqpKJmWN";
const state = {
  rates: { solana: 150, litecoin: 80 },
  sol: [],            // { signature, blockTime(s), status: "confirmed"|"finalized", lamports, err? }
  ltc: [],            // { txid, value(litoshi), confirmed, height, time(s) }
  ltcTip: 1000,
  esploraDown: false, // makes litecoinspace fail -> exercises the BlockCypher fallback
  allDown: false,     // every chain API fails -> "degraded"
  hooks: [],          // received Discord webhook bodies
  calls: { solSigs: 0, solTx: 0 },
};
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });

function install() {
  const real = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    url = String(url);
    if (url.startsWith("https://api.coingecko.com/")) return json({ solana: { usd: state.rates.solana }, litecoin: { usd: state.rates.litecoin } });
    if (url.startsWith("https://discord.com/api/v10/invites/")) return json({ approximate_member_count: 12345, approximate_presence_count: 678 });
    if (url.startsWith("https://discord.com/api/webhooks/")) { state.hooks.push(JSON.parse(init.body)); return new Response(null, { status: 204 }); }
    if (url.startsWith("https://api.mainnet-beta.solana.com")) {
      if (state.allDown) return json({}, 503);
      const { method, params, id } = JSON.parse(init.body);
      if (method === "getSignaturesForAddress") {
        state.calls.solSigs++;
        return json({ jsonrpc: "2.0", id, result: state.sol.slice().reverse().map(t => ({ signature: t.signature, slot: 1, err: t.err || null, blockTime: t.blockTime, confirmationStatus: t.status })) });
      }
      if (method === "getTransaction") {
        state.calls.solTx++;
        const t = state.sol.find(x => x.signature === params[0]);
        if (!t) return json({ jsonrpc: "2.0", id, result: null });
        return json({ jsonrpc: "2.0", id, result: { blockTime: t.blockTime, transaction: { message: { accountKeys: ["Payer1111111111111111111111111111111111111", SOL_ADDR, "11111111111111111111111111111111"] } },
          meta: { err: null, preBalances: [5e9, 1e9, 1], postBalances: [5e9 - t.lamports - 5000, 1e9 + t.lamports, 1] } } });
      }
    }
    if (url.startsWith("https://litecoinspace.org/api")) {
      if (state.esploraDown || state.allDown) return new Response("down", { status: 502 });
      if (url.endsWith("/blocks/tip/height")) return new Response(String(state.ltcTip), { status: 200 });
      if (url.endsWith("/txs")) return json(state.ltc.slice().reverse().map(t => ({ txid: t.txid, vout: [{ scriptpubkey_address: "Lother", value: 12345 }, { scriptpubkey_address: LTC_ADDR, value: t.value }],
        status: t.confirmed ? { confirmed: true, block_height: t.height, block_time: t.time } : { confirmed: false } })));
    }
    if (url.startsWith("https://api.blockcypher.com/v1/ltc/main/addrs/")) {
      if (state.allDown) return new Response("down", { status: 502 });
      return json({ address: LTC_ADDR, txs: state.ltc.slice().reverse().map(t => ({ hash: t.txid, confirmations: t.confirmed ? state.ltcTip - t.height + 1 : 0,
        confirmed: t.confirmed ? new Date(t.time * 1000).toISOString() : undefined, outputs: [{ value: t.value, addresses: [LTC_ADDR] }, { value: 999, addresses: ["Lother"] }] })) });
    }
    if (url.startsWith("http://127.0.0.1") || url.startsWith("http://localhost")) return real(url, init);
    throw new Error("unmocked network call: " + url);
  };
  return state;
}
module.exports = { install, state, SOL_ADDR, LTC_ADDR };
