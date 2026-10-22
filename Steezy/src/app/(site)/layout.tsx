import { AgeGate } from '@/components/layout/AgeGate';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { getCurrentUser, needsAgeConfirmation } from '@/server/auth/session';
import { openSession } from '@/server/kick/sessions';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser().catch((error) => {
    // A database outage shouldn't take down public pages; the page itself will report what it can't load.
    console.error('[layout] could not read session', error);
    return null;
  });
  const showAgeGate = await needsAgeConfirmation(user);
  const live = Boolean(await openSession().catch(() => null));

  return (
    <>
      <SiteHeader user={user} live={live} />
      <main id="main">{children}</main>
      <SiteFooter />
      {showAgeGate && user ? <AgeGate name={user.discordGlobalName || user.discordUsername} /> : null}
    </>
  );
}
