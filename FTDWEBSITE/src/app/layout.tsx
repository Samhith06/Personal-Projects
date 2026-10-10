import type { Metadata, Viewport } from 'next';
import { Archivo, JetBrains_Mono, Manrope } from 'next/font/google';
import { Logo } from '@/components/brand/Logo';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { LiveProvider } from '@/components/live/LiveProvider';
import { MediaPlayerProvider } from '@/components/media/MediaPlayer';
import { RevealObserver } from '@/components/ui/client';
import { hasLogoAsset } from '@/lib/brand';
import { HideInAdmin } from '@/components/admin/AdminNav';
import { AgeGate } from '@/components/layout/AgeGate';
import { getCurrentUser, needsAgeConfirmation } from '@/server/auth/session';
import { toSessionView } from '@/server/auth/view';
import { getSiteSettings, getStreamers } from '@/server/services/content';
import { getLiveStatus } from '@/server/services/live';
import './globals.css';

const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
  axes: ['wdth'],
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

/**
 * Every page reads the database through this layout — the header needs the
 * signed-in user, the crew and the live badge. That makes the whole tree
 * request-time work, including the 404, which Next would otherwise try to
 * prerender against a database the build host cannot reach.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? 'http://localhost:3000'),
  title: {
    default: "FGDR — FatGuysDontRun",
    template: "%s · FGDR",
  },
  description:
    "One crew. Every creator. One community. The official home of FGDR — FatGuysDontRun: live streams on Kick, clips, the Wall of Fame, wager leaderboards, raffles and challenges.",
  applicationName: 'FGDR',
  openGraph: {
    type: 'website',
    siteName: "FGDR — FatGuysDontRun",
    images: ['/brand/hero2-poster.jpg'],
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#05060a',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, streamers, settings, live] = await Promise.all([
    getCurrentUser(),
    getStreamers(),
    getSiteSettings(),
    getLiveStatus(),
  ]);

  const showAgeGate = await needsAgeConfirmation(user);

  const navStreamers = streamers.map((s) => ({
    id: s.id,
    displayName: s.displayName,
    monogram: s.monogram,
    accent: s.accent,
  }));

  return (
    <html lang="en" className={`${archivo.variable} ${manrope.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        {/* Flag JS early so reveal animations never hide content without it. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <div className="page-texture" aria-hidden="true" />
        <LiveProvider initial={live}>
          <MediaPlayerProvider>
            <SiteHeader
              logo={<Logo hasLogoAsset={hasLogoAsset} size={44} priority />}
              session={toSessionView(user)}
              streamers={navStreamers}
            />
            <main id="main">{children}</main>
            <HideInAdmin>
              <SiteFooter logo={<Logo hasLogoAsset={hasLogoAsset} size={96} />} streamers={streamers} settings={settings} />
            </HideInAdmin>
            <RevealObserver />
            {showAgeGate && user ? <AgeGate name={user.discordGlobalName || user.discordUsername} /> : null}
          </MediaPlayerProvider>
        </LiveProvider>
      </body>
    </html>
  );
}
