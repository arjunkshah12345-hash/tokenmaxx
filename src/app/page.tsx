import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { HeroVisual } from "@/components/HeroVisual";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import { PROVIDERS, T3_AUTOCONNECT } from "@/lib/providers";
import { SITE } from "@/lib/site";
import { getLeaderboard } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const hourly = await getLeaderboard("hourly");
  const top = hourly.rows[0];
  const chartData = hourly.rows.slice(0, 6).map((r) => ({
    name: r.handle,
    tokens: r.tokens,
  }));

  return (
    <div className="flex min-h-full flex-col">
      <div className="relative min-h-screen">
        <div className="absolute inset-0">
          <HeroVisual
            topHandle={top?.handle ?? "—"}
            topTokens={top?.tokens ?? 0}
            chartData={chartData}
          />
        </div>
        <div className="relative z-10 flex min-h-screen flex-col">
          <SiteNav />
          <main className="flex flex-1 flex-col justify-center px-6 pb-24 pt-6 md:px-12 md:pb-32">
            <div className="anim-rise max-w-md">
              <BrandMark size={36} large />
              <h1 className="mt-5 text-xl font-medium leading-snug tracking-tight md:text-2xl">
                {SITE.tagline}
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Connect {PROVIDERS.length} AI coding sources — or T3 Code linkup
                for {T3_AUTOCONNECT.length} at once. Hourly, daily, weekly, monthly.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/connect#t3"
                  className="bg-foreground px-4 py-2.5 text-sm text-background transition-opacity hover:opacity-85"
                >
                  T3 Code linkup
                </Link>
                <Link
                  href="/board"
                  className="border border-border px-4 py-2.5 text-sm transition-colors hover:border-foreground"
                >
                  View board
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>

      <section className="mx-auto w-full max-w-3xl px-6 py-20 md:px-12 md:py-28">
        <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-tight md:text-4xl">
          How it works
        </h2>
        <ol className="mt-10 flex flex-col gap-10">
          {[
            {
              n: "01",
              t: "Claim & link",
              d: "Pick a handle. T3 Code autoconnects every via-T3 provider, or attach IDEs, subscriptions, APIs, agents, and CLIs one by one.",
            },
            {
              n: "02",
              t: "Sync burn",
              d: "Usage lands in hourly, daily, weekly, and monthly windows that reset on the clock.",
            },
            {
              n: "03",
              t: "Climb the board",
              d: "More tokens, higher rank. That is the whole game.",
            },
          ].map((step) => (
            <li key={step.n} className="grid gap-2 border-t border-border pt-6 md:grid-cols-[4rem_1fr]">
              <span className="font-mono text-sm text-muted-foreground">{step.n}</span>
              <div>
                <p className="text-base font-medium">{step.t}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t border-border bg-card/40 px-6 py-16 md:px-12">
        <div className="mx-auto max-w-3xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Open source
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-tight">
            Built to be forked.
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
            MIT licensed. Swap demo sync for real provider meters. Ship your own
            league. Contributions welcome — especially OAuth adapters and new
            providers.
          </p>
          <Link
            href={SITE.github}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-block border border-border px-4 py-2.5 text-sm transition-colors hover:border-foreground"
          >
            Star on GitHub
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
