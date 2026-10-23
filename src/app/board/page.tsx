import type { Metadata } from "next";
import { Leaderboard } from "@/components/Leaderboard";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";

export const metadata: Metadata = {
  title: "Board",
  description: "Live hourly, daily, weekly, and monthly token burn leaderboards.",
};

export default function BoardPage() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10 md:px-12 md:py-14">
        <Leaderboard initialPeriod="daily" />
      </main>
      <SiteFooter />
    </div>
  );
}
