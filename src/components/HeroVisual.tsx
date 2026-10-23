"use client";

import { DitherGradient } from "@/components/dither-kit/gradient";
import { BarChart } from "@/components/dither-kit/bar-chart";
import { Bar } from "@/components/dither-kit/bar";
import { XAxis } from "@/components/dither-kit/x-axis";
import { YAxis } from "@/components/dither-kit/y-axis";
import { formatTokens } from "@/lib/format";

type Point = { name: string; tokens: number };

export function HeroVisual({
  topHandle,
  topTokens,
  chartData,
}: {
  topHandle: string;
  topTokens: number;
  chartData: Point[];
}) {
  const data = chartData.map((d) => ({
    name: d.name.length > 8 ? `${d.name.slice(0, 7)}…` : d.name,
    tokens: Math.round(d.tokens / 1000),
  }));

  return (
    <div className="relative flex h-full min-h-[48vh] w-full flex-col justify-end overflow-hidden md:min-h-screen">
      <DitherGradient
        from="green"
        to="transparent"
        direction="up"
        cell={3}
        opacity={0.55}
        bloom="off"
        className="absolute inset-0"
      />
      <div className="relative z-10 mx-auto mb-8 w-full max-w-3xl px-6 md:mb-16 md:px-12">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Hourly lead · {topHandle}
        </p>
        <p className="mt-2 font-[family-name:var(--font-display)] text-[clamp(3rem,10vw,6.5rem)] leading-none tracking-tight">
          {formatTokens(topTokens)}
        </p>
        <div className="mt-6 h-44 w-full md:h-56">
          <BarChart
            data={data}
            config={{ tokens: { label: "Tokens (K)", color: "green" } }}
            bloom="off"
            animate
            className="h-full w-full"
            margins={{ top: 8, right: 4, bottom: 28, left: 28 }}
          >
            <XAxis dataKey="name" />
            <YAxis />
            <Bar dataKey="tokens" variant="hatched" />
          </BarChart>
        </div>
      </div>
    </div>
  );
}
