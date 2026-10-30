const crypto = require("crypto");
const BASE = process.env.SC_API_BASE || "https://api.supercompress.dev";
const enabled = () =>
  process.env.SC_LINK_ENABLED === "1" && String(process.env.TMX_SHARE_KEY || "").length >= 32;
const key = () => crypto.createHash("sha256").update(String(process.env.TMX_SHARE_KEY)).digest();
function enc(s) {
  const iv = crypto.randomBytes(12),
    c = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const d = Buffer.concat([c.update(s, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), d].map((b) => b.toString("base64url")).join(".");
}
function dec(s) {
  const [iv, tag, d] = s.split(".").map((x) => Buffer.from(x, "base64url"));
  const c = crypto.createDecipheriv("aes-256-gcm", key(), iv);
  c.setAuthTag(tag);
  return Buffer.concat([c.update(d), c.final()]).toString("utf8");
}
async function fetchUsage(share) {
  const ac = new AbortController(),
    t = setTimeout(() => ac.abort(), 5000);
  try {
    const r = await fetch(BASE + "/api/usage-share", {
      headers: { Authorization: "Bearer " + share },
      signal: ac.signal,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const e = new Error(j.detail || "SuperCompress said no");
      e.status = r.status;
      throw e;
    }
    return j;
  } finally {
    clearTimeout(t);
  }
}
const n = (x) => Math.max(0, Number(x) || 0);
const hourKey = (d) => new Date(d).toISOString().slice(0, 13);
const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

/**
 * Rebuild hour buckets from SuperCompress monthly + by_day series.
 * Past/complete day totals land on that day's 00:00 UTC hour so daily/weekly/monthly
 * windows are accurate. Live poll deltas still go into the current hour via apply().
 * Never dump the whole month into "now" — that made hourly === monthly.
 */
function rebuild(u, usage, now = Date.now(), { keepUnreported = false } = {}) {
  const m = usage.month || new Date(now).toISOString().slice(0, 7);
  const tin = n(usage.tokens_in);
  const sv = Math.min(n(usage.tokens_saved), tin);
  const today = dayKey(now);
  const next = {};
  const days = usage.by_day || {};
  let pin = 0,
    psv = 0;
  for (const [k, v] of Object.entries(u.scb || {})) {
    if (String(k).startsWith(m)) {
      // This month's days the new series doesn't report keep what they already had.
      // The live API's by_day is sparse; dropping them pushed the whole month onto today.
      if (!keepUnreported || days[k.slice(0, 10)]) continue;
      next[k] = v;
      pin += n(v[0]);
      psv += n(v[1]);
      continue;
    }
    // Keep other months' day anchors (…T00) for weekly/monthly history.
    // Drop stray hour dumps from other months — those were the hourly===monthly bug.
    if (/^\d{4}-\d{2}-\d{2}T00$/.test(k)) next[k] = v;
  }
  for (const [day, r] of Object.entries(days)) {
    if (!day.startsWith(m)) continue;
    const a = n(r.tokens_in);
    const b = Math.min(n(r.tokens_saved), a);
    if (!(a > 0 || b > 0)) continue;
    next[day + "T00"] = [a, b];
    pin += a;
    psv += b;
  }
  const gapIn = Math.max(0, tin - pin);
  const gapSv = Math.max(0, sv - psv);
  if (gapIn > 0 || gapSv > 0) {
    // Unattributed remainder stays on today 00:00 (daily+), not the current hour.
    const k = (today.startsWith(m) ? today : m + "-01") + "T00";
    const cur = next[k] || [0, 0];
    next[k] = [cur[0] + gapIn, cur[1] + gapSv];
  }
  u.scb = next;
  u.sc = u.sc || {};
  u.sc.last = { month: m, tin, sv };
  u.sc.polledAt = new Date(now).toISOString();
  for (const k of Object.keys(u.scb)) {
    if (Date.parse(k + ":00:00Z") < now - 400 * 864e5) delete u.scb[k];
  }
  return u;
}

/**
 * Incremental update after a prior rebuild/poll.
 * Growth since last.tin lands in the current UTC hour (honest hourly).
 * Month rollover or missing last falls back to rebuild.
 */
function apply(u, usage, now = Date.now()) {
  u.sc = u.sc || {};
  const last = u.sc.last;
  const m = usage.month || new Date(now).toISOString().slice(0, 7);
  const tin = n(usage.tokens_in);
  const sv = Math.min(n(usage.tokens_saved), tin);
  if (!last || last.month !== m || usage.rebuild) return rebuild(u, usage, now);
  const hk = hourKey(now);
  u.scb = u.scb || {};
  const dIn = Math.max(0, tin - n(last.tin));
  const dSv = Math.max(0, sv - n(last.sv));
  if (dIn > 0 || dSv > 0) {
    const c = u.scb[hk] || [0, 0];
    u.scb[hk] = [c[0] + dIn, c[1] + dSv];
  }
  u.sc.last = { month: m, tin: Math.max(tin, n(last.tin)), sv: Math.max(sv, n(last.sv)) };
  u.sc.polledAt = new Date(now).toISOString();
  for (const k of Object.keys(u.scb)) {
    if (Date.parse(k + ":00:00Z") < now - 400 * 864e5) delete u.scb[k];
  }
  return u;
}

async function refresh(u, S) {
  if (!enabled() || !u.sc || !u.sc.enc) return false;
  if (u.sc.polledAt && Date.now() - Date.parse(u.sc.polledAt) < 10 * 60e3) return false;
  try {
    const j = await fetchUsage(dec(u.sc.enc));
    const usage = j.usage || {};
    const hasDays = usage.by_day && Object.keys(usage.by_day).length > 0;
    if (hasDays) {
      // Live by_day is sparse: rebuild the days it reports, keep the rest.
      rebuild(u, usage, Date.now(), { keepUnreported: true });
    } else if (u.sc.last && usage.month && usage.month === u.sc.last.month) {
      // Same month, no day series: only attribute positive deltas to this hour.
      apply(u, usage);
    } else {
      // Month rolled or no baseline — wait for claims sync / by_day. Do not dump
      // a whole monthly counter into the current hour (that made hourly === monthly).
      u.sc.polledAt = new Date().toISOString();
    }
    u.sc.error = null;
  } catch (e) {
    u.sc.polledAt = new Date().toISOString();
    u.sc.error = e.status === 401 ? "revoked" : "unreachable";
  }
  await S.saveUser(u);
  return true;
}

module.exports = { enabled, enc, dec, fetchUsage, apply, rebuild, refresh, BASE, n, hourKey, dayKey };
