/**
 * POST/GET /api/sync-sc — put every existing SuperCompress account on the board (idle ones at zero).
 * Auth: Authorization: Bearer <CRON_SECRET or TMX_SYNC_SECRET>
 * Vercel Cron hits this so new SC accounts appear without claiming a handle.
 */
const S = require("../lib/store");
const { listTaken, upsertFromAuthUser, isHuman } = require("../lib/accounts");
const { monthKey } = require("../lib/days");
const { listAllUsers } = require("../lib/firebase-auth");

function authorized(req) {
  const want = String(process.env.CRON_SECRET || process.env.TMX_SYNC_SECRET || "").trim();
  if (!want) return false;
  // Vercel Cron sends Authorization: Bearer $CRON_SECRET. Headers like x-vercel-cron
  // can be set by any caller, so the secret is the only thing trusted here.
  return String(req.headers.authorization || "") === `Bearer ${want}`;
}

module.exports = async (req, res) => {
  // Allow longer runs for full Auth scan + blob writes
  if (typeof res.setHeader === "function") {
    try {
      // hint only; maxDuration set in vercel.json
    } catch (_) {}
  }
  if (req.method === "OPTIONS") return S.json(res, 204, {});
  if (req.method !== "GET" && req.method !== "POST") {
    return S.json(res, 405, { error: "GET or POST" });
  }
  if (!authorized(req)) return S.json(res, 401, { error: "Unauthorized" });
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return S.json(res, 503, { error: "FIREBASE_SERVICE_ACCOUNT_JSON missing" });
  }
  if (!process.env.SC_USAGE_SHARE_SECRET || process.env.SC_USAGE_SHARE_SECRET.length < 32) {
    return S.json(res, 503, { error: "SC_USAGE_SHARE_SECRET missing" });
  }

  const started = Date.now();
  const month = monthKey();
  const stats = { scanned: 0, humans: 0, created: 0, updated: 0, skipped: 0, errors: [] };
  try {
    const taken = await listTaken(S);
    const one = async (user) => {
      try {
        const r = await upsertFromAuthUser(S, user, taken, month);
        if (r.status === "created") stats.created += 1;
        else if (r.status === "updated") stats.updated += 1;
        else stats.skipped += 1;
      } catch (err) {
        stats.errors.push(String(user.uid || "").slice(0, 12) + ":" + (err.message || err));
      }
    };
    for await (const page of listAllUsers()) {
      const humans = page.filter(isHuman);
      stats.scanned += page.length;
      stats.humans += humans.length;
      // 8 at a time keeps ~500 accounts inside one cron run
      for (let i = 0; i < humans.length; i += 8) {
        await Promise.all(humans.slice(i, i + 8).map(one));
        if (stats.errors.length > 25 || Date.now() - started > 250000) break;
      }
      if (stats.errors.length > 25) break;
      // Stay under serverless wall clock; resume next cron if needed
      if (Date.now() - started > 250000) {
        stats.truncated = true;
        break;
      }
    }

    return S.json(res, 200, {
      ok: true,
      month,
      ms: Date.now() - started,
      ...stats,
      errors: stats.errors.slice(0, 10),
    });
  } catch (err) {
    return S.json(res, 500, { error: err.message || "sync failed" });
  }
};
