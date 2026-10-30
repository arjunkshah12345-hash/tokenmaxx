const crypto = require("crypto");
const SC = require("./sc");
const { usageFromClaims, monthKey } = require("./days");

const HANDLE = /^[a-z0-9_]{2,20}$/;
const STUB_RE = /^(sck_|sc_lnk_|sc_at_|sc_ac_|sc_aff_|sc_fnl_)/;

function sha(s) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function shareSecret() {
  const s = process.env.SC_USAGE_SHARE_SECRET || "";
  if (s.length < 32) throw new Error("SC_USAGE_SHARE_SECRET missing");
  return s;
}

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

function mintShareToken(ownerUid, keyId) {
  const secret = shareSecret();
  const payload = b64url(JSON.stringify({ v: 1, u: String(ownerUid), k: String(keyId) }));
  const sig = b64url(crypto.createHmac("sha256", secret).update(`usage-share:v1:${payload}`).digest());
  return `scu_${payload}.${sig}`;
}

function accountRef(ownerUid) {
  return crypto
    .createHmac("sha256", shareSecret())
    .update(`usage-share:acct:${ownerUid}`)
    .digest("hex")
    .slice(0, 24);
}

function isHuman(user) {
  if (!user || user.disabled) return false;
  if (STUB_RE.test(String(user.uid || ""))) return false;
  return Boolean(user.email || user.providerData?.some((p) => p.email));
}

function activeKeyId(user) {
  const claims = user.customClaims || {};
  const ids = Array.isArray(claims.sc_key_ids) ? claims.sc_key_ids.filter(Boolean) : [];
  return ids[0] || null;
}

function suggestHandle(user, acct, taken) {
  const email = (user.email || user.providerData?.find((p) => p.email)?.email || "").toLowerCase();
  const local = email.split("@")[0] || "";
  const fromEmail = local
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 20);
  const fromName = String(user.displayName || "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 20);
  for (const cand of [fromEmail, fromName, `sc_${acct.slice(0, 10)}`, `u_${acct.slice(0, 12)}`]) {
    if (cand && HANDLE.test(cand) && !taken.has(cand)) return cand;
  }
  let i = 0;
  while (i < 100) {
    const cand = `u_${acct.slice(0, 8)}${i || ""}`;
    if (HANDLE.test(cand) && !taken.has(cand)) return cand;
    i += 1;
  }
  throw new Error("could not allocate handle");
}

async function listTaken(S) {
  const taken = new Set();
  const blobs = await S.all();
  for (const b of blobs) {
    const m = /^u\/([a-z0-9_]+)\.json$/.exec(b.pathname);
    if (m) taken.add(m[1]);
  }
  return taken;
}

async function resolveHandle(S, acct, user, taken) {
  const ix = `a/${acct}.json`;
  const got = await S.list({ prefix: ix, limit: 1 });
  if (got.blobs[0]) {
    const ref = await S.readBlob(got.blobs[0]);
    if (ref?.optedOut) return { optedOut: true };
    if (ref?.handle) return { handle: ref.handle, existing: true };
  }
  const handle = suggestHandle(user, acct, taken);
  taken.add(handle); // reserve now: the sync runs several upserts at once
  return { handle, existing: false };
}

async function upsertFromAuthUser(S, user, taken, month = monthKey()) {
  if (!isHuman(user)) return { status: "skip_not_human" };
  // Every existing account gets a row; accounts with no usage yet sit at zero.
  const usage = usageFromClaims(user.customClaims || {}, month) || { month, tokens_in: 0, tokens_saved: 0, by_day: {} };
  const idle = !(usage.tokens_in > 0);

  const acct = accountRef(user.uid);
  const { handle, existing, optedOut } = await resolveHandle(S, acct, user, taken);
  // Accounts that left the board keep a tombstone in a/<acct>.json; never re-add them.
  if (optedOut) return { status: "skip_opted_out" };
  let u = existing ? await S.getUser(handle) : null;
  // Idle rows that are already seeded for this month have nothing to write.
  if (u && idle && u.sc && u.sc.last && u.sc.last.month === month && !(u.sc.last.tin > 0)) {
    return { status: "unchanged", handle };
  }
  if (!u) {
    const token = "tmx_" + crypto.randomBytes(20).toString("hex");
    const th = sha(token);
    u = {
      handle,
      tokenHash: th,
      createdAt: new Date().toISOString(),
      lastSync: null,
      syncs: 0,
      buckets: {},
      sources: { seeded: "supercompress-auto" },
      sc: null,
      scb: {},
    };
    await S.put(`t/${th.slice(0, 32)}.json`, JSON.stringify({ handle }), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
    taken.add(handle);
  }

  const keyId = activeKeyId(user);
  u.sc = u.sc || { account: acct };
  u.sc.account = acct;
  if (keyId && SC.enabled()) {
    try {
      u.sc.enc = SC.enc(mintShareToken(user.uid, keyId));
      u.sc.error = null;
      delete u.sc.seedOnly;
    } catch (_) {
      u.sc.seedOnly = true;
    }
  } else {
    u.sc.seedOnly = true;
  }
  u.sc.linkedAt = u.sc.linkedAt || new Date().toISOString();
  SC.rebuild(u, usage);
  await S.saveUser(u);
  await S.put(`a/${acct}.json`, JSON.stringify({ handle }), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
  return { status: existing ? "updated" : "created", handle, tokens_in: usage.tokens_in };
}

module.exports = {
  HANDLE,
  sha,
  mintShareToken,
  accountRef,
  isHuman,
  activeKeyId,
  suggestHandle,
  listTaken,
  upsertFromAuthUser,
};
