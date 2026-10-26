import { cookies } from 'next/headers';
import { AgeGate } from '@/components/layout/AgeGate';
import { AGE_COOKIE } from '@/lib/age';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { getCurrentUser, needsAgeConfirmation } from '@/server/auth/session';
import { openSession } from '@/server/kick/sessions';
import { liveHunt } from '@/server/services/hunts';
import { liveTourney } from '@/server/services/tourney';
import { displayName } from '@/lib/identity';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser().catch((error) => {
    // A database outage shouldn't take down public pages; the page itself will report what it can't load.
    console.error('[layout] could not read session', error);
    return null;
  });
  // Members confirm after every sign-in; visitors once per browser.
  const showAgeGate = user ? await needsAgeConfirmation(user) : !(await cookies()).has(AGE_COOKIE);
  const [session, hunt, tournament] = await Promise.all([
    openSession().catch(() => null),
    liveHunt().catch(() => null),
    liveTourney().catch(() => null),
  ]);
  const tournamentOn = tournament ? (tournament.status === 'running' ? 'live' : 'signup') : null;

  return (
    <>
      <SiteHeader user={user} live={Boolean(session)} huntOn={Boolean(hunt)} tournamentOn={tournamentOn} />
      <main id="main">{children}</main>
      <SiteFooter />
      {showAgeGate ? <AgeGate name={user ? displayName(user) : null} /> : null}
    </>
  );
}
