/** Compact by_day helpers (mirrors SuperCompress api/_lib/usage-days). */
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const monthKey = (d = new Date()) => d.toISOString().slice(0, 7);
const dayKey = (d = new Date()) => d.toISOString().slice(0, 10);
const isIsoDay = (day) => ISO_DAY.test(String(day || ""));
const emptyDay = () => ({ tokens_in: 0, tokens_out: 0, tokens_saved: 0, requests: 0 });

function daysInMonth(month) {
  const [y, m] = String(month || "").split("-").map(Number);
  if (!y || !m) return 31;
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function monthDayKeys(month = monthKey(), throughIso = dayKey()) {
  const m = String(month || monthKey());
  const end =
    String(throughIso || "").slice(0, 7) === m
      ? Math.max(1, Number(String(throughIso).slice(8, 10)) || 1)
      : daysInMonth(m);
  const out = [];
  for (let i = 1; i <= end; i++) out.push(`${m}-${String(i).padStart(2, "0")}`);
  return out;
}

function expandPackedDays(packed, month = monthKey()) {
  const m = String(packed?.m || month);
  const out = {};
  if (!packed || packed.m !== m || !packed.d || typeof packed.d !== "object") return out;
  for (const [dd, rec] of Object.entries(packed.d)) {
    const iso = `${m}-${String(dd).padStart(2, "0")}`;
    if (!isIsoDay(iso)) continue;
    const tin = Number(Array.isArray(rec) ? rec[0] : rec.tokens_in) || 0;
    const saved = Number(Array.isArray(rec) ? rec[1] : rec.tokens_saved) || 0;
    const req = Number(Array.isArray(rec) ? rec[2] : rec.requests) || 0;
    out[iso] = {
      tokens_in: tin,
      tokens_saved: saved,
      tokens_out: Math.max(0, tin - saved),
      requests: req,
    };
  }
  return out;
}

function fillMonthGap(byDay, totals = {}, month = monthKey(), throughIso = dayKey()) {
  const keys = monthDayKeys(month, throughIso);
  const recorded = { ...(byDay || {}) };
  let dayIn = 0,
    daySaved = 0,
    dayReq = 0;
  for (const iso of keys) {
    const d = recorded[iso] || emptyDay();
    dayIn += d.tokens_in;
    daySaved += d.tokens_saved;
    dayReq += d.requests;
  }
  const gapIn = Math.max(0, Number(totals.tokens_in || 0) - dayIn);
  const gapSaved = Math.max(0, Number(totals.tokens_saved || 0) - daySaved);
  const gapReq = Math.max(0, Number(totals.requests || 0) - dayReq);
  if (gapIn < 500 && gapSaved < 500 && gapReq <= 0) {
    return { by_day: recorded, source: "recorded" };
  }
  const weights = keys.map((iso) => {
    const d = recorded[iso];
    return 1 + (d ? Math.max(d.requests || 0, d.tokens_in > 0 ? 2 : 0) : 0);
  });
  const wSum = weights.reduce((s, w) => s + w, 0) || keys.length;
  const out = { ...recorded };
  let usedIn = 0,
    usedSaved = 0,
    usedReq = 0;
  keys.forEach((iso, i) => {
    const last = i === keys.length - 1;
    const share = weights[i] / wSum;
    const addIn = last ? gapIn - usedIn : Math.round(gapIn * share);
    const addSaved = last ? gapSaved - usedSaved : Math.round(gapSaved * share);
    const addReq = last ? gapReq - usedReq : Math.round(gapReq * share);
    usedIn += addIn;
    usedSaved += addSaved;
    usedReq += addReq;
    const cur = out[iso] || emptyDay();
    out[iso] = {
      tokens_in: cur.tokens_in + Math.max(0, addIn),
      tokens_saved: cur.tokens_saved + Math.max(0, addSaved),
      tokens_out: cur.tokens_out + Math.max(0, addIn - addSaved),
      requests: cur.requests + Math.max(0, addReq),
    };
  });
  return { by_day: out, source: Object.keys(recorded).length ? "mixed" : "reconstructed" };
}

function usageFromClaims(claims = {}, month = monthKey()) {
  const usage = claims.sc_usage || {};
  const current = String(usage.month || "") === month;
  if (!current && !(Number(usage.tokens_in || 0) > 0)) {
    return null;
  }
  const m = current ? month : String(usage.month || month);
  const tin = Number(usage.tokens_in || 0);
  const saved = Math.min(Number(usage.tokens_saved || 0), tin);
  const packed = usage.month === m ? { m, d: usage.d || {} } : null;
  const recorded = expandPackedDays(packed, m);
  const filled = fillMonthGap(
    recorded,
    { tokens_in: tin, tokens_saved: saved, tokens_out: Number(usage.tokens_out || 0), requests: Number(usage.requests || 0) },
    m
  );
  return {
    month: m,
    tokens_in: tin,
    tokens_saved: saved,
    tokens_out: Number(usage.tokens_out || 0),
    requests: Number(usage.requests || 0),
    by_day: filled.by_day,
  };
}

module.exports = {
  monthKey,
  dayKey,
  expandPackedDays,
  fillMonthGap,
  usageFromClaims,
};
