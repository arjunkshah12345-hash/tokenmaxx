/**
 * Firebase Auth user listing via Identity Toolkit REST (no firebase-admin on Vercel).
 */
const crypto = require("crypto");

function loadSa() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "";
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON missing");
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  return parsed;
}

function b64urlJson(obj) {
  return Buffer.from(JSON.stringify(obj))
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function accessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64urlJson({ alg: "RS256", typ: "JWT" });
  const claim = b64urlJson({
    iss: sa.client_email,
    sub: sa.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope:
      "https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/cloud-platform",
  });
  const data = `${header}.${claim}`;
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(data);
  sign.end();
  const sig = sign
    .sign(sa.private_key)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  const assertion = `${data}.${sig}`;
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) {
    throw new Error(j.error_description || j.error || "token exchange failed");
  }
  return j.access_token;
}

function normalizeUser(u) {
  let customClaims = {};
  const raw = u.customAttributes || u.customClaims;
  if (typeof raw === "string" && raw) {
    try {
      customClaims = JSON.parse(raw);
    } catch (_) {}
  } else if (raw && typeof raw === "object") {
    customClaims = raw;
  }
  const providerData = (u.providerUserInfo || []).map((p) => ({
    email: p.email,
    providerId: p.providerId,
    displayName: p.displayName,
  }));
  return {
    uid: u.localId || u.uid,
    email: u.email,
    displayName: u.displayName,
    disabled: Boolean(u.disabled),
    customClaims,
    providerData,
  };
}

/** Yield pages of Auth users via downloadAccount. */
async function* listAllUsers() {
  const sa = loadSa();
  const token = await accessToken(sa);
  const projectId = sa.project_id;
  let nextPageToken;
  do {
    const r = await fetch("https://www.googleapis.com/identitytoolkit/v3/relyingparty/downloadAccount", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        targetProjectId: projectId,
        maxResults: 1000,
        ...(nextPageToken ? { nextPageToken } : {}),
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      throw new Error(j.error?.message || JSON.stringify(j.error || j) || "downloadAccount failed");
    }
    yield (j.users || []).map(normalizeUser);
    nextPageToken = j.nextPageToken;
  } while (nextPageToken);
}

module.exports = { listAllUsers, loadSa };
