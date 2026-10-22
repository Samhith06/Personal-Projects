import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

/** Every page reads the database, so nothing is prerendered at build time. */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? 'http://localhost:3000'),
  title: { default: 'SteezeSpins', template: '%s · SteezeSpins' },
  description:
    'The SteezeSpins community hub — Roobet wager leaderboards, milestones, giveaways, raffles, bonus hunts and slot tournaments, tied to your Discord account.',
  applicationName: 'SteezeSpins',
};

export const viewport: Viewport = {
  themeColor: '#0d1310',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

/** Bare document. The site chrome lives in (site)/layout.tsx; OBS overlays render without it. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
