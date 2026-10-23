import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";

export function SiteNav() {
  return (
    <header className="relative z-20 flex items-center justify-between px-6 py-5 md:px-12">
      <Link href="/" className="text-foreground transition-opacity hover:opacity-80">
        <BrandMark />
      </Link>
      <nav className="flex items-center gap-6 text-[13px] tracking-wide text-muted-foreground">
        <Link href="/board" className="transition-colors hover:text-foreground">
          Board
        </Link>
        <Link href="/connect" className="transition-colors hover:text-foreground">
          Connect
        </Link>
        <Link
          href="/connect#t3"
          className="bg-foreground px-3.5 py-2 text-background transition-opacity hover:opacity-85"
        >
          T3 linkup
        </Link>
      </nav>
    </header>
  );
}
