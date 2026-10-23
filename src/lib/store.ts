import { promises as fs } from "fs";
import path from "path";
import { T3_AUTOCONNECT } from "./providers";
import type {
  Connection,
  Period,
  Player,
  ProviderId,
  StoreShape,
} from "./types";

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_PATH = path.join(DATA_DIR, "store.json");
const PERIODS: Period[] = ["hourly", "daily", "weekly", "monthly"];

type GlobalStore = typeof globalThis & {
  __tokenmaxxStore?: StoreShape;
};

const g = globalThis as GlobalStore;

/** Prefer file store locally; serverless (Vercel) uses in-memory singleton. */
const useFileStore =
  process.env.TOKENMAXX_FILE_STORE === "1" ||
  (!process.env.VERCEL && process.env.NODE_ENV !== "production");

function windowStart(period: Period, now = new Date()): string {
  const d = new Date(now);
  if (period === "hourly") {
    d.setMinutes(0, 0, 0);
  } else if (period === "daily") {
    d.setHours(0, 0, 0, 0);
  } else if (period === "weekly") {
    const day = d.getDay();
    const diff = (day + 6) % 7;
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
  } else {
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
  }
  return d.toISOString();
}

function freshWindows(now = new Date()): Record<Period, string> {
  return {
    hourly: windowStart("hourly", now),
    daily: windowStart("daily", now),
    weekly: windowStart("weekly", now),
    monthly: windowStart("monthly", now),
  };
}

function seedPlayer(
  id: string,
  handle: string,
  hue: number,
  base: number,
  isYou = false,
): Player {
  const now = new Date().toISOString();
  return {
    id,
    handle,
    avatarHue: hue,
    isYou,
    connections: [],
    totals: {
      hourly: Math.round(base * 0.02 + Math.random() * base * 0.01),
      daily: Math.round(base * 0.12 + Math.random() * base * 0.05),
      weekly: Math.round(base * 0.55 + Math.random() * base * 0.15),
      monthly: Math.round(base + Math.random() * base * 0.25),
    },
    lifetime: Math.round(base * 4.2),
    updatedAt: now,
  };
}

function seedStore(): StoreShape {
  const now = new Date().toISOString();
  const rivals: [string, string, number, number][] = [
    ["p_nova", "nova_burn", 28, 42_000_000],
    ["p_kilowatt", "kilowatt_kid", 190, 38_500_000],
    ["p_ctx", "context_glutton", 140, 36_200_000],
    ["p_agent", "agentfarm", 320, 31_800_000],
    ["p_prompt", "prompt_hoarder", 55, 28_400_000],
    ["p_diff", "diff_demon", 210, 24_100_000],
    ["p_loop", "while_true", 95, 19_600_000],
    ["p_yolo", "yolo_commits", 350, 15_200_000],
  ];

  const you = seedPlayer("you", "you", 85, 8_500_000, true);
  you.totals = { hourly: 0, daily: 0, weekly: 0, monthly: 0 };
  you.lifetime = 0;

  return {
    youId: "you",
    players: [you, ...rivals.map(([id, h, hue, base]) => seedPlayer(id, h, hue, base))],
    windows: freshWindows(),
    lastTickAt: now,
  };
}

async function ensureStore(): Promise<StoreShape> {
  if (g.__tokenmaxxStore) return g.__tokenmaxxStore;

  if (useFileStore) {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      const raw = await fs.readFile(STORE_PATH, "utf8");
      g.__tokenmaxxStore = JSON.parse(raw) as StoreShape;
      return g.__tokenmaxxStore;
    } catch {
      // fall through to seed
    }
  }

  g.__tokenmaxxStore = seedStore();
  if (useFileStore) {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(STORE_PATH, JSON.stringify(g.__tokenmaxxStore, null, 2));
    } catch {
      // memory only
    }
  }
  return g.__tokenmaxxStore;
}

async function writeStore(store: StoreShape): Promise<void> {
  g.__tokenmaxxStore = store;
  if (!useFileStore) return;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2));
  } catch {
    // ignore on read-only FS
  }
}

function rollWindows(store: StoreShape): void {
  const next = freshWindows();
  for (const period of PERIODS) {
    if (store.windows[period] !== next[period]) {
      store.windows[period] = next[period];
      for (const p of store.players) {
        p.totals[period] = p.isYou
          ? Math.round(
              p.connections
                .filter((c) => c.status === "connected")
                .reduce((s, c) => s + c.tokensSynced, 0) * 0.02,
            )
          : Math.round(p.totals[period] * 0.08 + Math.random() * 50_000);
      }
    }
  }
}

function tick(store: StoreShape): void {
  const now = Date.now();
  const last = new Date(store.lastTickAt).getTime();
  const elapsedSec = Math.min(120, Math.max(0, (now - last) / 1000));
  if (elapsedSec < 0.5) return;

  rollWindows(store);

  for (const player of store.players) {
    if (player.isYou) {
      const connected = player.connections.filter((c) => c.status === "connected");
      if (connected.length === 0) continue;
      const drip = Math.round(
        elapsedSec * (800 + Math.min(connected.length, 12) * 420) * (0.7 + Math.random() * 0.6),
      );
      for (const period of PERIODS) player.totals[period] += drip;
      player.lifetime += drip;
      const share = Math.floor(drip / connected.length);
      for (const c of connected) {
        c.tokensSynced += share;
        c.lastSyncAt = new Date().toISOString();
      }
      player.updatedAt = new Date().toISOString();
      continue;
    }

    const rate = 600 + (player.avatarHue % 40) * 40;
    const drip = Math.round(elapsedSec * rate * (0.5 + Math.random()));
    for (const period of PERIODS) player.totals[period] += drip;
    player.lifetime += drip;
    player.updatedAt = new Date().toISOString();
  }

  store.lastTickAt = new Date().toISOString();
}

export async function getStore(): Promise<StoreShape> {
  const store = await ensureStore();
  tick(store);
  await writeStore(store);
  return store;
}

export async function getYou(): Promise<Player> {
  const store = await getStore();
  const you = store.players.find((p) => p.id === store.youId);
  if (!you) throw new Error("you missing");
  return you;
}

export async function setHandle(handle: string): Promise<Player> {
  const cleaned = handle
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20);
  if (cleaned.length < 2) {
    throw new Error("Handle must be at least 2 characters (a-z, 0-9, _).");
  }
  const store = await getStore();
  const taken = store.players.some(
    (p) => !p.isYou && p.handle.toLowerCase() === cleaned,
  );
  if (taken) throw new Error("That handle is taken.");
  const you = store.players.find((p) => p.id === store.youId)!;
  you.handle = cleaned;
  you.updatedAt = new Date().toISOString();
  await writeStore(store);
  return you;
}

export async function getLeaderboard(period: Period) {
  const store = await getStore();
  const ranked = [...store.players]
    .sort((a, b) => b.totals[period] - a.totals[period])
    .map((p, i) => ({
      rank: i + 1,
      id: p.id,
      handle: p.handle,
      avatarHue: p.avatarHue,
      isYou: Boolean(p.isYou),
      tokens: p.totals[period],
      lifetime: p.lifetime,
      providers: p.connections
        .filter((c) => c.status === "connected")
        .map((c) => c.providerId),
    }));

  return {
    period,
    windowStart: store.windows[period],
    updatedAt: store.lastTickAt,
    rows: ranked,
  };
}

function upsertConnection(
  player: Player,
  providerId: ProviderId,
  source: Connection["source"],
): Connection {
  const existing = player.connections.find((c) => c.providerId === providerId);
  const now = new Date().toISOString();
  if (existing) {
    existing.status = "connected";
    existing.connectedAt = existing.connectedAt ?? now;
    existing.lastSyncAt = now;
    existing.source = source;
    return existing;
  }
  const created: Connection = {
    providerId,
    status: "connected",
    connectedAt: now,
    lastSyncAt: now,
    tokensSynced: 0,
    source,
  };
  player.connections.push(created);
  return created;
}

export async function connectProvider(providerId: ProviderId) {
  const store = await getStore();
  const you = store.players.find((p) => p.id === store.youId)!;

  if (providerId === "t3code") {
    return linkT3(store, you);
  }

  upsertConnection(you, providerId, "manual");
  const bump = 12_000 + Math.floor(Math.random() * 40_000);
  for (const period of PERIODS) you.totals[period] += bump;
  you.lifetime += bump;
  const conn = you.connections.find((c) => c.providerId === providerId)!;
  conn.tokensSynced += bump;
  you.updatedAt = new Date().toISOString();
  await writeStore(store);
  return { you, connected: [providerId] };
}

async function linkT3(store: StoreShape, you: Player) {
  upsertConnection(you, "t3code", "t3-linkup");
  const connected: ProviderId[] = ["t3code"];
  for (const id of T3_AUTOCONNECT) {
    upsertConnection(you, id, "t3-linkup");
    connected.push(id);
  }
  const bump =
    40_000 * Math.max(1, connected.length - 1) +
    Math.floor(Math.random() * 120_000);
  for (const period of PERIODS) you.totals[period] += bump;
  you.lifetime += bump;
  const share = Math.floor(bump / Math.max(1, connected.length - 1));
  for (const c of you.connections) {
    if (c.source === "t3-linkup" && c.providerId !== "t3code") {
      c.tokensSynced += share;
      c.lastSyncAt = new Date().toISOString();
    }
  }
  you.updatedAt = new Date().toISOString();
  await writeStore(store);
  return { you, connected };
}

export async function disconnectProvider(providerId: ProviderId) {
  const store = await getStore();
  const you = store.players.find((p) => p.id === store.youId)!;

  if (providerId === "t3code") {
    you.connections = you.connections.filter(
      (c) => c.source !== "t3-linkup" && c.providerId !== "t3code",
    );
  } else {
    you.connections = you.connections.filter((c) => c.providerId !== providerId);
  }

  you.updatedAt = new Date().toISOString();
  await writeStore(store);
  return you;
}

export async function syncNow() {
  const store = await getStore();
  const you = store.players.find((p) => p.id === store.youId)!;
  const connected = you.connections.filter((c) => c.status === "connected");
  if (connected.length === 0) {
    return { you, gained: 0 };
  }
  const gained =
    45_000 +
    Math.floor(Math.random() * 95_000) * Math.min(connected.length, 8);
  for (const period of PERIODS) you.totals[period] += gained;
  you.lifetime += gained;
  const share = Math.floor(gained / connected.length);
  const now = new Date().toISOString();
  for (const c of connected) {
    c.tokensSynced += share;
    c.lastSyncAt = now;
  }
  you.updatedAt = now;
  store.lastTickAt = now;
  await writeStore(store);
  return { you, gained };
}
