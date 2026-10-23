"use client";

import { BarChart } from "@/components/dither-kit/bar-chart";
import { Bar } from "@/components/dither-kit/bar";
import { XAxis } from "@/components/dither-kit/x-axis";
import { YAxis } from "@/components/dither-kit/y-axis";
import { Tooltip } from "@/components/dither-kit/tooltip";

type Point = { name: string; tokens: number };

export function BoardChart({ data }: { data: Point[] }) {
  const rows = data.slice(0, 8).map((d) => ({
    name: d.name.length > 10 ? `${d.name.slice(0, 9)}…` : d.name,
    tokens: Math.round(d.tokens / 1000),
  }));

  return (
    <div className="h-56 w-full md:h-64">
      <BarChart
        data={rows}
        config={{ tokens: { label: "Tokens (K)", color: "green" } }}
        bloom="low"
        animate
        className="h-full w-full"
        margins={{ top: 10, right: 8, bottom: 28, left: 36 }}
      >
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip labelKey="name" />
        <Bar dataKey="tokens" variant="gradient" />
      </BarChart>
    </div>
  );
}
