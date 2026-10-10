import type { CSSProperties } from "react";
import { WalletMark } from "@/components/brand/WalletMark";

export function GreenMarkChip({ size = 34 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.26,
        background: "var(--green)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <WalletMark
        style={
          {
            width: size * 0.56,
            height: size * 0.56 * 0.8,
            color: "#0a0a09",
            "--gold": "#0a0a09",
          } as CSSProperties
        }
      />
    </div>
  );
}
