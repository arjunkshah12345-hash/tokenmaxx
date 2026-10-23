"use client";

import { useEffect, useState } from "react";
import type { Player } from "@/lib/types";

export function HandleClaim() {
  const [handle, setHandle] = useState("");
  const [current, setCurrent] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { you: Player }) => {
        setCurrent(d.you.handle);
        if (d.you.handle !== "you") setHandle(d.you.handle);
      });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle }),
      });
      const data = (await res.json()) as { you?: Player; error?: string };
      if (!res.ok) {
        setStatus(data.error ?? "Could not claim handle");
        return;
      }
      setCurrent(data.you!.handle);
      setStatus(`You're on the board as ${data.you!.handle}.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void save(e)} className="flex flex-col gap-3 border border-border bg-card p-5">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Your handle
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Claim a name for the leaderboard
          {current ? (
            <>
              {" "}
              · now <span className="text-foreground">{current}</span>
            </>
          ) : null}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="maxx_burner"
          maxLength={20}
          className="min-w-[12rem] flex-1 border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-foreground"
          aria-label="Handle"
        />
        <button
          type="submit"
          disabled={busy || handle.trim().length < 2}
          className="bg-foreground px-4 py-2 text-sm text-background disabled:opacity-40"
        >
          {busy ? "Saving…" : "Claim"}
        </button>
      </div>
      {status ? (
        <p className="text-sm text-muted-foreground" role="status">
          {status}
        </p>
      ) : null}
    </form>
  );
}
