"use client";

import { useEffect, useState, useTransition } from "react";
import { DitherAvatar } from "@/components/dither-kit/avatar";
import { BoardChart } from "@/components/BoardChart";
import { formatTokens, formatTokensFull, periodLabel } from "@/lib/format";
import { PERIODS } from "@/lib/providers";
import type { Period } from "@/lib/types";

type Row = {
  rank: number;
  id: string;
  handle: string;
  avatarHue: number;
  isYou: boolean;
  tokens: number;
  lifetime: number;
  providers: string[];
};

type Board = {
  period: Period;
  windowStart: string;
  updatedAt: string;
  rows: Row[];
};

export function Leaderboard({ initialPeriod = "daily" }: { initialPeriod?: Period }) {
  const [period, setPeriod] = useState<Period>(initialPeriod);
  const [board, setBoard] = useState<Board | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const res = await fetch(`/api/leaderboard?period=${period}`, { cache: "no-store" });
      const data = (await res.json()) as Board;
      if (alive) setBoard(data);
    };
    void load();
    const id = setInterval(() => void load(), 4000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [period]);

  const you = board?.rows.find((r) => r.isYou);
  const chartData = (board?.rows ?? []).slice(0, 8).map((r) => ({
    name: r.handle,
    tokens: r.tokens,
  }));

  return (
    <div className="w-full">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Leaderboard
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl tracking-tight md:text-5xl">
            {periodLabel(period)}
          </h1>
        </div>
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Leaderboard period">
          {PERIODS.map((p) => {
            const active = p === period;
            return (
              <button
                key={p}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => startTransition(() => setPeriod(p))}
                className={`px-3 py-1.5 text-[12px] tracking-wide transition-colors ${
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>

      {chartData.length > 0 ? (
        <div className="mb-10 border border-border bg-card px-3 pt-4 pb-2">
          <BoardChart data={chartData} />
        </div>
      ) : null}

      {you ? (
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3 border-b border-border pb-4">
          <p className="text-sm">
            You · <span className="font-medium">#{you.rank}</span> ·{" "}
            <span className="font-mono">{formatTokens(you.tokens)}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            {you.providers.length
              ? `${you.providers.length} sources live`
              : "No sources — open Connect"}
          </p>
        </div>
      ) : null}

      <div className={pending ? "opacity-60" : ""} aria-live="polite">
        <div className="grid grid-cols-[2.5rem_1fr_auto] gap-3 border-b border-border pb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground md:grid-cols-[3rem_1fr_auto_7rem]">
          <span>#</span>
          <span>Player</span>
          <span className="text-right">Tokens</span>
          <span className="hidden text-right md:block">Life</span>
        </div>
        <ul>
          {(board?.rows ?? []).map((row) => (
            <li
              key={row.id}
              className={`grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 border-b border-border py-3 md:grid-cols-[3rem_1fr_auto_7rem] ${
                row.isYou ? "bg-secondary/60" : ""
              }`}
            >
              <span className="font-mono text-sm text-muted-foreground">{row.rank}</span>
              <div className="flex min-w-0 items-center gap-3">
                <DitherAvatar
                  name={row.handle}
                  hue={row.avatarHue}
                  size={28}
                  bloom="off"
                  animate={false}
                  className="shrink-0"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {row.handle}
                    {row.isYou ? (
                      <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        you
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">
                    {row.providers.length
                      ? `${row.providers.length} linked`
                      : "ghost"}
                  </p>
                </div>
              </div>
              <span
                className="text-right font-mono text-sm tabular-nums md:text-base"
                title={formatTokensFull(row.tokens)}
              >
                {formatTokens(row.tokens)}
              </span>
              <span className="hidden text-right font-mono text-sm text-muted-foreground md:block">
                {formatTokens(row.lifetime)}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-4 font-mono text-[11px] text-muted-foreground">
        Windows reset on the clock.
        {board ? ` Tick ${new Date(board.updatedAt).toLocaleTimeString()}.` : ""}
      </p>
    </div>
  );
}
