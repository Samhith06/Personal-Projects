import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * The "Slot" mark — a card sliding out of a slot in the wallet. The wallet
 * is stroke-only (no fill) so the card reads underneath it on any
 * background; the wallet's top edge is painted after the card and visually
 * cuts across it, which is what sells the "emerging from a slot" read at
 * small sizes. Sourced from the "1B" concept in the logo exploration
 * (claude.ai/design project f24bd8c7-be1d-465e-936a-98c3d16ab77a).
 */
export function WalletMark({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 40 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      style={style}
      aria-hidden="true"
    >
      <rect x="7" y="0" width="26" height="11" rx="2.5" fill="var(--gold, #d4af6a)" />
      <rect
        x="1.25"
        y="7"
        width="37.5"
        height="23.5"
        rx="6.5"
        stroke="currentColor"
        strokeWidth="2.75"
      />
    </svg>
  );
}

export function WalletLogoTile({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg bg-accent text-white",
        className
      )}
      style={{ width: size, height: size }}
    >
      <WalletMark style={{ width: size * 0.56, height: size * 0.56 * 0.8 }} />
    </div>
  );
}
