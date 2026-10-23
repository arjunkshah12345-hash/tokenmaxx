"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DitherAvatar } from "@/components/dither-kit/avatar";
import { formatTokens, relativeSync } from "@/lib/format";
import {
  CATEGORIES,
  PROVIDERS,
  T3_AUTOCONNECT,
  providersByCategory,
} from "@/lib/providers";
import type { Player, ProviderCategory, ProviderId } from "@/lib/types";

export function ConnectPanel() {
  const [you, setYou] = useState<Player | null>(null);
  const [busy, setBusy] = useState<ProviderId | "t3" | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [category, setCategory] = useState<ProviderCategory | "all">("all");
  const [query, setQuery] = useState("");

  const refresh = useCallback(async () => {
    const res = await fetch("/api/me", { cache: "no-store" });
    const data = (await res.json()) as { you: Player };
    setYou(data.you);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const statusOf = (id: ProviderId) =>
    you?.connections.find((c) => c.providerId === id && c.status === "connected");

  const list = useMemo(() => {
    const base = providersByCategory(category);
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (p) => p.name.toLowerCase().includes(q) || p.id.includes(q),
    );
  }, [category, query]);

  const liveCount = you?.connections.filter((c) => c.status === "connected").length ?? 0;

  async function connect(providerId: ProviderId) {
    setBusy(providerId);
    setFlash(null);
    try {
      const res = await fetch("/api/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId }),
      });
      const data = (await res.json()) as { you: Player; connected?: string[] };
      setYou(data.you);
      setFlash(
        providerId === "t3code"
          ? `T3 linkup live — ${data.connected?.length ?? 0} sources.`
          : `${providerId} connected.`,
      );
    } finally {
      setBusy(null);
    }
  }

  async function t3Linkup() {
    setBusy("t3");
    setFlash(null);
    try {
      await new Promise((r) => setTimeout(r, 500));
      const res = await fetch("/api/connect/t3", { method: "POST" });
      const data = (await res.json()) as {
        you: Player;
        connected: string[];
        message: string;
      };
      setYou(data.you);
      setFlash(
        `T3 Code linked. Autoconnected ${data.connected.length - 1} providers.`,
      );
    } finally {
      setBusy(null);
    }
  }

  async function disconnect(providerId: ProviderId) {
    setBusy(providerId);
    try {
      const res = await fetch("/api/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId, action: "disconnect" }),
      });
      const data = (await res.json()) as { you: Player };
      setYou(data.you);
      setFlash(`Disconnected ${providerId}.`);
    } finally {
      setBusy(null);
    }
  }

  async function sync() {
    setBusy("t3");
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = (await res.json()) as { you: Player; gained: number };
      setYou(data.you);
      setFlash(
        data.gained
          ? `Synced +${formatTokens(data.gained)} tokens.`
          : "Connect a source first.",
      );
    } finally {
      setBusy(null);
    }
  }

  const t3 = statusOf("t3code");

  return (
    <div className="flex w-full flex-col gap-12">
      <section id="t3" className="relative overflow-hidden border border-border bg-card px-5 py-7 md:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Fastest path · {T3_AUTOCONNECT.length} autoconnects
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-tight md:text-4xl">
              T3 Code linkup
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Already running multiple AI coding subs through T3 Code? One tap
              discovers them and autoconnects every via-T3 source in the catalog.
            </p>
          </div>
          <DitherAvatar name="t3code" hue={120} size={48} bloom="off" animate={false} />
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          {t3 ? (
            <>
              <button
                type="button"
                onClick={() => void sync()}
                disabled={busy !== null}
                className="bg-foreground px-4 py-2.5 text-sm text-background disabled:opacity-50"
              >
                {busy === "t3" ? "Syncing…" : "Sync now"}
              </button>
              <button
                type="button"
                onClick={() => void disconnect("t3code")}
                disabled={busy !== null}
                className="border border-border px-4 py-2.5 text-sm text-muted-foreground disabled:opacity-50"
              >
                Unlink T3
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => void t3Linkup()}
              disabled={busy !== null}
              className="bg-foreground px-4 py-2.5 text-sm text-background disabled:opacity-50"
            >
              {busy === "t3" ? "Discovering…" : "Connect T3 Code"}
            </button>
          )}
        </div>
        {t3 ? (
          <p className="mt-3 font-mono text-[11px] text-muted-foreground">
            Linked {relativeSync(t3.connectedAt)} · {liveCount} sources live
          </p>
        ) : null}
      </section>

      {flash ? (
        <p className="border-l-2 border-foreground pl-3 text-sm" role="status">
          {flash}
        </p>
      ) : null}

      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-tight">
              All providers
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {PROVIDERS.length} sources · wire one by one or let T3 pull the via-T3 set
            </p>
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter…"
            className="w-full max-w-xs border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground md:w-56"
            aria-label="Filter providers"
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-1" role="tablist" aria-label="Provider category">
          {CATEGORIES.map((c) => {
            const active = c.id === category;
            return (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCategory(c.id)}
                className={`px-3 py-1.5 text-[12px] tracking-wide ${
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        <ul className="mt-6 divide-y divide-border border-y border-border">
          {list.map((p) => {
            const conn = statusOf(p.id);
            const live = Boolean(conn);
            return (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <DitherAvatar
                    name={p.id}
                    size={28}
                    bloom="off"
                    animate={false}
                    className="shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {p.name}
                      {p.viaT3 ? (
                        <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                          via t3
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{p.blurb}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="hidden font-mono text-[11px] text-muted-foreground sm:block">
                    {live
                      ? `${formatTokens(conn!.tokensSynced)} · ${relativeSync(conn!.lastSyncAt)}`
                      : p.category}
                  </p>
                  {live ? (
                    <button
                      type="button"
                      onClick={() => void disconnect(p.id)}
                      disabled={busy !== null}
                      className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void connect(p.id)}
                      disabled={busy !== null}
                      className="border border-border px-3 py-1.5 text-xs hover:border-foreground disabled:opacity-50"
                    >
                      {busy === p.id ? "…" : "Connect"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
          {list.length === 0 ? (
            <li className="py-8 text-sm text-muted-foreground">No providers match.</li>
          ) : null}
        </ul>
      </section>

      {you ? (
        <section>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Your burn
          </p>
          <div className="mt-3 grid grid-cols-2 gap-6 md:grid-cols-4">
            {(
              [
                ["hourly", you.totals.hourly],
                ["daily", you.totals.daily],
                ["weekly", you.totals.weekly],
                ["monthly", you.totals.monthly],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {label}
                </p>
                <p className="mt-1 font-[family-name:var(--font-display)] text-3xl tracking-tight">
                  {formatTokens(value)}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
