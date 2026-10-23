import type { Metadata } from "next";
import { ConnectPanel } from "@/components/ConnectPanel";
import { HandleClaim } from "@/components/HandleClaim";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import { PROVIDERS, T3_AUTOCONNECT } from "@/lib/providers";

export const metadata: Metadata = {
  title: "Connect",
  description: "Link AI coding subscriptions and T3 Code for TokenMaxx.",
};

export default function ConnectPage() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10 md:px-12 md:py-14">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Sources
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl tracking-tight md:text-5xl">
          Connect the burn
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
          {PROVIDERS.length} providers across IDEs, subscriptions, APIs, agents, and CLIs.
          Prefer one shot? T3 Code linkup autoconnects {T3_AUTOCONNECT.length}.
        </p>
        <div className="mt-8">
          <HandleClaim />
        </div>
        <div className="mt-10">
          <ConnectPanel />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
