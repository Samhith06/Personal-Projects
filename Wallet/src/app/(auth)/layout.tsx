import Link from "next/link";
import { WalletLogoTile } from "@/components/brand/WalletMark";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(600px 400px at 50% 0%, var(--accent-soft), transparent 70%)",
        }}
      />
      <Link
        href="/"
        className="absolute left-6 top-6 text-sm text-muted transition-colors hover:text-foreground"
      >
        &larr; Back to home
      </Link>
      <div className="relative mb-8 flex items-center gap-2.5">
        <WalletLogoTile size={36} className="rounded-xl" />
        <span
          className="text-base tracking-wide text-foreground"
          style={{ fontFamily: "var(--font-archivo-black), sans-serif" }}
        >
          WALLET
        </span>
      </div>
      <div className="relative w-full max-w-sm">{children}</div>
    </div>
  );
}
