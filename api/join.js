const S = require("../lib/store");
/** Handle claims are retired — SuperCompress accounts sync onto the board automatically. */
module.exports = async (req, res) => {
  if (req.method === "OPTIONS") return S.json(res, 204, {});
  return S.json(res, 410, {
    error: "gone",
    message: "Handles are created automatically from SuperCompress accounts. Install SuperCompress and use it — the board updates on its own.",
  });
};
