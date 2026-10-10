import type { Metadata } from 'next';
import Link from 'next/link';
import { inArray, and, eq } from 'drizzle-orm';
import { RaffleCard } from '@/components/competition';
import { ActionButton } from '@/components/forms/ActionForm';
import { Icon } from '@/components/ui/Icon';
import { EmptyState, PageHero } from '@/components/ui/primitives';
import { db } from '@/server/db';
import { raffleEntries } from '@/server/db/schema';
import { enterRaffle } from '@/server/actions/member';
import { getCurrentUser } from '@/server/auth/session';
import { getRaffles } from '@/server/services/content';

export const metadata: Metadata = {
  title: 'Raffles',
  description: 'Members-only FGDR raffles, drawn live on stream.',
};

export const dynamic = 'force-dynamic';

const TABS = [
  { value: 'active', label: 'Active' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'ended', label: 'Ended' },
] as const;

type Tab = (typeof TABS)[number]['value'];

export default async function RafflesPage({ searchParams }: PageProps<'/raffles'>) {
  const params = await searchParams;
  const status: Tab = TABS.some((t) => t.value === params.status) ? (params.status as Tab) : 'active';

  const [all, user] = await Promise.all([getRaffles(), getCurrentUser()]);
  const list = all.filter((r) => r.status === status);
  const counts = Object.fromEntries(TABS.map((t) => [t.value, all.filter((r) => r.status === t.value).length]));

  const entered = new Set<string>();
  if (user && list.length) {
    const rows = await db
      .select({ raffleId: raffleEntries.raffleId })
      .from(raffleEntries)
      .where(and(eq(raffleEntries.userId, user.id), inArray(raffleEntries.raffleId, list.map((r) => r.id))));
    rows.forEach((r) => entered.add(r.raffleId));
  }

  return (
    <>
      <PageHero
        eyebrow="Prize draws"
        title={
          <>
            FGDR <span className="gold-text">raffles</span>
          </>
        }
        lede="Members-only draws, run live on stream. Link your Kick account, meet the requirement, and you're in."
      >
        <nav className="segmented" aria-label="Raffle status">
          {TABS.map((t) => (
            <Link key={t.value} href={t.value === 'active' ? '/raffles' : `/raffles?status=${t.value}`} aria-current={t.value === status ? 'page' : undefined} scroll={false}>
              {t.label} <span className="muted tabular">{counts[t.value]}</span>
            </Link>
          ))}
        </nav>
      </PageHero>

      <section className="section section--flush-top" style={{ paddingTop: 'clamp(2.5rem, 2rem + 2vw, 4rem)' }}>
        <div className="container">
          {user && !user.kickVerified && status === 'active' ? (
            <p className="notice notice--gold reveal" style={{ marginBottom: '2rem' }}>
              <Icon name="kick" />
              <span>
                Raffle entries are tied to a verified Kick account. <Link href="/account#kick" className="link-arrow">Link Kick</Link>
              </span>
            </p>
          ) : null}

          {list.length ? (
            <div className="grid-3">
              {list.map((r) => (
                <div key={r.id} className="reveal">
                  <RaffleCard
                    raffle={r}
                    entered={entered.has(r.id)}
                    action={
                      r.status === 'active' ? (
                        <ActionButton action={enterRaffle} fields={{ raffleId: r.id }} signedIn={Boolean(user)} returnTo="/raffles">
                          <Icon name="ticket" />
                          Enter raffle
                        </ActionButton>
                      ) : r.status === 'upcoming' ? (
                        <span className="tag">Opens soon</span>
                      ) : (
                        <span className="tag tag--muted">Draw complete</span>
                      )
                    }
                  />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title={`No ${status} raffles`} body="New draws are announced on stream and in the Discord." icon="ticket" />
          )}

          <p className="fineprint">
            No purchase necessary where required by law; a free alternative method of entry is available on request. 18+ only.
            Eligibility, verification and full rules apply. Void where prohibited.
          </p>
        </div>
      </section>
    </>
  );
}
