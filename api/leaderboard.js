const S = require("../lib/store"),
  SC = require("../lib/sc");
let cache = { t: 0, users: null };
function starts(now) {
  const d = new Date(now),
    y = d.getUTCFullYear(),
    m = d.getUTCMonth(),
    day = d.getUTCDate(),
    h = d.getUTCHours(),
    dow = (d.getUTCDay() + 6) % 7;
  return {
    hourly: Date.UTC(y, m, day, h),
    daily: Date.UTC(y, m, day),
    weekly: Date.UTC(y, m, day - dow),
    monthly: Date.UTC(y, m, 1),
  };
}
// Ranks come from SuperCompress accounts only. Local-log buckets are ignored.
module.exports = async (req, res) => {
  const period = ["hourly", "daily", "weekly", "monthly"].includes(req.query.period)
    ? req.query.period
    : "daily";
  const metric = req.query.metric === "compressed" ? "compressed" : "passed";
  const now = Date.now();
  if (!cache.users || now - cache.t > 15e3) {
    const blobs = await S.all();
    const users = (await Promise.all(blobs.map(S.readBlob))).filter(Boolean);
    // Refresh a few linked accounts so live deltas land in the current hour.
    const linked = users.filter((u) => u.sc && u.sc.enc).slice(0, 8);
    await Promise.all(linked.map((u) => SC.refresh(u, S).catch(() => {})));
    cache = { t: now, users };
  }
  const ws = starts(now)[period];
  const rows = cache.users
    .filter((u) => u.sc && u.scb)
    .map((u) => {
      let passed = 0,
        compressed = 0,
        lp = 0,
        lc = 0;
      for (const [h, [a, b]] of Object.entries(u.scb)) {
        lp += a;
        lc += b;
        if (Date.parse(h + ":00:00Z") >= ws) {
          passed += a;
          compressed += b;
        }
      }
      return {
        handle: u.handle,
        passed,
        compressed,
        tokens: metric === "compressed" ? compressed : passed,
        lifetime: { passed: lp, compressed: lc },
        lastSync: u.sc.polledAt,
      };
    })
    // Only rank players with activity inside this window (not lifetime-only).
    .filter((r) => r.passed > 0 || r.compressed > 0)
    .sort((a, b) => b.tokens - a.tokens || b.passed - a.passed)
    .map((r, i) => Object.assign({ rank: i + 1 }, r));
  S.json(res, 200, {
    period,
    metric,
    linking: SC.enabled(),
    windowStart: new Date(ws).toISOString(),
    updatedAt: new Date(now).toISOString(),
    players: rows.length,
    rows,
  });
};
