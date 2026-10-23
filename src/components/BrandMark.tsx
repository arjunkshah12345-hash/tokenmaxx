import { cn } from "@/lib/utils";

/** TOKENMAXX wordmark + dither-cell mark */
export function BrandMark({
  className,
  showWord = true,
  size = 28,
  large = false,
}: {
  className?: string;
  showWord?: boolean;
  size?: number;
  large?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        className="shrink-0"
      >
        <rect width="32" height="32" fill="#171717" />
        {/* Bayer-ish 4×4 dither cells */}
        <rect x="2" y="2" width="3" height="3" fill="#28D26E" />
        <rect x="10" y="2" width="3" height="3" fill="#28D26E" opacity="0.35" />
        <rect x="18" y="2" width="3" height="3" fill="#28D26E" />
        <rect x="26" y="2" width="3" height="3" fill="#28D26E" opacity="0.2" />
        <rect x="2" y="10" width="3" height="3" fill="#28D26E" opacity="0.45" />
        <rect x="10" y="10" width="3" height="3" fill="#28D26E" />
        <rect x="18" y="10" width="3" height="3" fill="#28D26E" opacity="0.25" />
        <rect x="26" y="10" width="3" height="3" fill="#28D26E" />
        <rect x="2" y="18" width="3" height="3" fill="#28D26E" />
        <rect x="10" y="18" width="3" height="3" fill="#28D26E" opacity="0.3" />
        <rect x="18" y="18" width="3" height="3" fill="#28D26E" />
        <rect x="26" y="18" width="3" height="3" fill="#28D26E" opacity="0.5" />
        <rect x="2" y="26" width="3" height="3" fill="#28D26E" opacity="0.2" />
        <rect x="10" y="26" width="3" height="3" fill="#28D26E" />
        <rect x="18" y="26" width="3" height="3" fill="#28D26E" opacity="0.4" />
        <rect x="26" y="26" width="3" height="3" fill="#28D26E" />
      </svg>
      {showWord ? (
        <span
          className={cn(
            "font-[family-name:var(--font-display)] tracking-tight",
            large
              ? "text-5xl md:text-6xl"
              : "text-2xl md:text-[1.75rem]",
          )}
        >
          TOKENMAXX
        </span>
      ) : null}
    </span>
  );
}
