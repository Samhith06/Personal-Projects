import type { Metadata } from 'next';
import Link from 'next/link';
import { enterGiveawayAction } from '@/server/actions/giveaways';
import { getCurrentUser } from '@/server/auth/session';
import {
  describeEligibility,
  entryCount,
  hasEntered,
  publicGiveaways,
  winnersFor,
  type Eligibility,
} from '@/server/services/giveaways';
import { formatAgo, formatCountdown } from '@/lib/format';
import { loginHref } from '@/lib/env';

export const metadata: Metadata = { title: 'Giveaways' };

const RESULT: Record<string, { text: string; ok: boolean }> = {
  entered: { text: 'You’re in! Good luck.', ok: true },
  already: { text: 'You’ve already entered this one.', ok: true },
  closed: { text: 'That giveaway has closed.', ok: false },
  ineligible: { text: 'You can’t enter this one yet.', ok: false },
};

export default async function GiveawaysPage({
  searchParams,
}: {
  searchParams: Promise<{ entry?: string; why?: string }>;
}) {
  const { entry, why } = await searchParams;
  const [{ open, recent }, user] = await Promise.all([publicGiveaways(), getCurrentUser()]);
  const [counts, entered, winners] = await Promise.all([
    Promise.all(open.map((g) => entryCount(g.id))),
    user ? Promise.all(open.map((g) => hasEntered(g.id, user.id))) : Promise.resolve(open.map(() => false)),
    winnersFor(recent.map((g) => g.id)),
  ]);
  const message = entry ? RESULT[entry] : null;

  return (
    <div className="container page">
      <div className="stack" style={{ gap: 10 }}>
        <span className="kicker">Giveaways</span>
        <h1 className="page__title">Open right now</h1>
        <p className="meta" style={{ fontSize: 15, maxWidth: '58ch' }}>
          Enter here or type the keyword in Steezy&apos;s Kick chat. Winners are drawn live on stream with a provably fair draw.
        </p>
      </div>

      {message ? (
        <p className={`notice ${message.ok ? 'notice--ok' : 'notice--danger'}`}>
          {message.text}
          {why ? ` ${why}.` : ''}
          {entry === 'ineligible' && why?.includes('Link') ? (
            <>
              {' '}
              <Link href="/me/link">Link accounts</Link>
            </>
          ) : null}
        </p>
      ) : null}

      {open.length === 0 ? (
        <div className="card">
          <p className="meta">No giveaways open right now — they usually start during the stream.</p>
        </div>
      ) : (
        <div className="card-grid">
          {open.map((g, i) => (
            <article key={g.id} className="card stack" style={{ gap: 12 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="tag tag--accent">Open</span>
                <span className="meta">{g.closesAt ? (formatCountdown(g.closesAt) ? `${formatCountdown(g.closesAt)} left` : 'closing') : 'Until drawn on stream'}</span>
              </div>
              <h2 style={{ fontSize: 22 }}>{g.prize}</h2>
              <ul className="rules">
                {describeEligibility(g.eligibility as Eligibility).map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="meta num">
                  {counts[i].toLocaleString('en-US')} entries
                  {g.entryKeyword ? (
                    <>
                      {' '}
                      · type <code style={{ color: 'var(--color-accent-400)' }}>{g.entryKeyword}</code> in chat
                    </>
                  ) : null}
                </span>
                {!user ? (
                  <a className="btn btn--primary" href={loginHref('/giveaways')}>
                    Log in to enter
                  </a>
                ) : entered[i] ? (
                  <span className="tag tag--accent">Entered</span>
                ) : (
                  <form action={enterGiveawayAction}>
                    <input type="hidden" name="giveawayId" value={g.id} />
                    <button className="btn btn--primary" type="submit">
                      Enter
                    </button>
                  </form>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {recent.length ? (
        <section className="stack">
          <h2 style={{ fontSize: 24 }}>Recent winners</h2>
          <div className="card-grid">
            {recent.map((g) => (
              <article key={g.id} className="card stack" style={{ gap: 8 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <strong>{g.prize}</strong>
                  <span className="meta">{g.drawnAt ? formatAgo(g.drawnAt) : ''}</span>
                </div>
                <span>{(winners.get(g.id) ?? ['No entries']).join(', ')}</span>
                <Link href={`/fair?giveaway=${g.id}`} style={{ fontSize: 13 }}>
                  Verify draw
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
