import type { Metadata } from 'next';
import { eq } from 'drizzle-orm';
import { ChallengeCard } from '@/components/competition';
import { ActionButton } from '@/components/forms/ActionForm';
import { Icon } from '@/components/ui/Icon';
import { EmptyState, PageHero, SectionHeader } from '@/components/ui/primitives';
import { db } from '@/server/db';
import { challengeEntries } from '@/server/db/schema';
import { joinChallenge } from '@/server/actions/member';
import { getCurrentUser } from '@/server/auth/session';
import { getChallenges, getFeaturedChallenge, getStreamerMap } from '@/server/services/content';

export const metadata: Metadata = {
  title: 'Challenges',
  description: 'FGDR community challenges — shared goals, streaks and head-to-head races.',
};

export const dynamic = 'force-dynamic';

export default async function ChallengesPage() {
  const [all, featured, streamers, user] = await Promise.all([
    getChallenges(),
    getFeaturedChallenge(),
    getStreamerMap(),
    getCurrentUser(),
  ]);

  const joined = new Set<string>();
  if (user) {
    const rows = await db.select({ id: challengeEntries.challengeId }).from(challengeEntries).where(eq(challengeEntries.userId, user.id));
    rows.forEach((r) => joined.add(r.id));
  }

  const groups = [
    { key: 'active', title: 'Active now', items: all.filter((c) => c.status === 'active' && c.id !== featured?.id) },
    { key: 'upcoming', title: 'Coming up', items: all.filter((c) => c.status === 'upcoming' && c.id !== featured?.id) },
    { key: 'completed', title: 'Completed', items: all.filter((c) => c.status === 'completed' && c.id !== featured?.id) },
  ];

  const joinButton = (id: string, status: string) =>
    status === 'completed' || joined.has(id) ? null : (
      <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
        <ActionButton action={joinChallenge} fields={{ challengeId: id }} signedIn={Boolean(user)} returnTo="/challenges">
          <Icon name="flag" />
          Join challenge
        </ActionButton>
      </div>
    );

  return (
    <>
      <PageHero
        eyebrow="Community competitions"
        title={
          <>
            FGDR <span className="gold-text">challenges</span>
          </>
        }
        lede="Shared goals and head-to-head races. Hit the target together, share the reward."
      />

      <section className="section section--flush-top" style={{ paddingTop: 'clamp(2.5rem, 2rem + 2vw, 4rem)' }}>
        <div className="container">
          {featured ? (
            <div className="reveal" style={{ maxWidth: 880, margin: '0 auto clamp(4rem, 3rem + 4vw, 7rem)' }}>
              <p className="eyebrow" style={{ marginBottom: '1.25rem' }}>
                Featured challenge
              </p>
              <ChallengeCard
                challenge={featured}
                host={featured.hostId ? streamers.get(featured.hostId) : undefined}
                featured
                joined={joined.has(featured.id)}
              />
              {joinButton(featured.id, featured.status)}
            </div>
          ) : null}

          {all.length === 0 ? <EmptyState title="No challenges yet" body="The first challenge is on its way." icon="flag" /> : null}

          {groups
            .filter((g) => g.items.length)
            .map((g) => (
              <div key={g.key} style={{ marginBottom: 'clamp(3.5rem, 3rem + 3vw, 6rem)' }}>
                <SectionHeader eyebrow={g.key === 'completed' ? 'Archive' : 'Challenges'} title={g.title} as="h2" />
                <div className="grid-2">
                  {g.items.map((c) => (
                    <div key={c.id} className="reveal">
                      <ChallengeCard challenge={c} host={c.hostId ? streamers.get(c.hostId) : undefined} joined={joined.has(c.id)} />
                      {joinButton(c.id, c.status)}
                    </div>
                  ))}
                </div>
              </div>
            ))}

          <p className="fineprint">Challenge progress is verified by the FGDR team. Prizes are subject to the published rules. 18+ only.</p>
        </div>
      </section>
    </>
  );
}
