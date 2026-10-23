import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { PROVIDERS } from "@/lib/providers";
import { SITE } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border px-6 py-10 md:px-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div>
          <BrandMark size={22} />
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            {SITE.tagline} Open source. Demo sync — real provider OAuth welcome as PRs.
          </p>
        </div>
        <div className="flex flex-col gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          <span>{PROVIDERS.length} providers</span>
          <Link href={SITE.github} className="hover:text-foreground" target="_blank" rel="noreferrer">
            GitHub
          </Link>
          <Link href="/board" className="hover:text-foreground">
            Board
          </Link>
          <Link href="/connect" className="hover:text-foreground">
            Connect
          </Link>
        </div>
      </div>
    </footer>
  );
}
