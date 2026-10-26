import type { Metadata } from 'next';
import Link from 'next/link';
import { getCurrentUser } from '@/server/auth/session';
import { getRaffleWinners, getTickets, myRaffleStatus, openRaffles, pastRaffles, type Raffle } from '@/server/services/raffles';
import { formatCountdown, formatUsd, ordinal } from '@/lib/format';
import { LoginButton } from '@/components/LoginButton';

export const metadata: Metadata = { title: 'Raffles' };

const shortDay = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

export default async function RafflesPage() {
  const [open, user, past] = await Promise.all([openRaffles(), getCurrentUser(), pastRaffles()]);
  const pastWinners = await Promise.all(past.map((r) => getRaffleWinners(r.id)));
  const perTicket = open.length && open.every((r) => r.usdPerTicket === open[0].usdPerTicket) ? formatUsd(open[0].usdPerTicket) : '$1,000';

  return (
    <div className="container page">
      <div className="stack" style={{ gap: 10 }}>
        <span className="kicker">Wager raffles</span>
        <h1 className="page__title">Every {perTicket} wagered is a ticket.</h1>
        <p className="meta" style={{ fontSize: 15, maxWidth: '58ch' }}>
          Tickets come automatically from your Roobet wagers under code STZY. No entering, no buying. The draw happens live on
          stream.
        </p>
      </div>

      {open.length ? (
        open.map((r) => <OpenRaffle key={r.id} raffle={r} userId={user?.id ?? null} />)
      ) : (
        <div className="card">
          <p className="meta">No raffle running right now.</p>
        </div>
      )}

      {past.length ? (
        <section className="stack">
          <h2 style={{ fontSize: 24 }}>Past raffles</h2>
          <div className="card-grid">
            {past.map((r, i) => (
              <article key={r.id} className="card stack" style={{ gap: 12 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <strong>{r.name}</strong>
                  <span className="tag tag--neutral">{r.status === 'drawn' ? 'Drawn' : 'Draw on stream soon'}</span>
                </div>
                {pastWinners[i].map((w) => (
                  <div key={w.position} className="row" style={{ justifyContent: 'space-between', fontSize: 14 }}>
                    <span>
                      <span className="meta" style={{ display: 'inline-block', width: 34 }}>
                        {ordinal(w.position)}
                      </span>
                      {w.name}
                    </span>
                    <span className="num" style={{ color: 'var(--color-accent)' }}>
                      {formatUsd(w.prize)}
                    </span>
                  </div>
                ))}
                {r.status === 'drawn' ? (
                  <Link href={`/fair?raffle=${r.id}`} style={{ fontSize: 13 }}>
                    Verify draw · seed revealed
                  </Link>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

/** One open raffle: prizes, countdown, ticket totals, the viewer's own tickets and the seed fingerprint. */
async function OpenRaffle({ raffle, userId }: { raffle: Raffle; userId: string | null }) {
  const [tickets, mine] = await Promise.all([getTickets(raffle), userId ? myRaffleStatus(raffle, userId) : null]);
  const totalTickets = tickets.reduce((s, t) => s + t.tickets, 0);
  // An open raffle whose window hasn't begun: no wager counts yet.
  const upcoming = raffle.startsAt > new Date();
  const user = userId !== null;

  // Chance of at least one prize ≈ 1 − P(no win in any pick), approximated with replacement.
  const chance =
    mine?.linked && mine.tickets && totalTickets
      ? 1 - Math.pow(1 - mine.tickets / totalTickets, Math.min(raffle.prizes.length, tickets.length))
      : null;

  return (
    <>
    <section className="raffle-split">
      <div className="card raffle-hero stack" style={{ gap: 22 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          {upcoming ? (
            <span className="tag tag--neutral">Tickets start counting {shortDay(raffle.startsAt)}</span>
          ) : (
            <span className="tag tag--accent">
              <span className="dot dot--live" aria-hidden="true" />
              Open · tickets counting
            </span>
          )}
          <span style={{ fontSize: 13, color: 'var(--color-accent-300)' }}>
            Closes {raffle.endsAt.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })} UTC
          </span>
        </div>
        <div>
          <h2 style={{ fontSize: 34 }}>{raffle.name}</h2>
          <p style={{ color: 'var(--color-accent-300)', marginTop: 6 }}>
            1 ticket per {formatUsd(raffle.usdPerTicket)} wagered · max {raffle.maxTicketsPerUser} tickets per person
          </p>
        </div>
        <div className="prize-grid">
          {raffle.prizes.map((p, i) => (
            <div key={i} className="prize">
              <span>{ordinal(i + 1)}</span>
              <b className="num">{formatUsd(p)}</b>
            </div>
          ))}
        </div>
        <div className="row" style={{ gap: 28 }}>
          <div>
            <div className="hero-label">{upcoming ? 'Starts in' : 'Ends in'}</div>
            <div className="num hero-value">{formatCountdown(upcoming ? raffle.startsAt : raffle.endsAt) ?? 'Closing'}</div>
          </div>
          <div>
            <div className="hero-label">Tickets issued</div>
            <div className="num hero-value">{totalTickets.toLocaleString('en-US')}</div>
          </div>
          <div>
            <div className="hero-label">Players</div>
            <div className="num hero-value">{tickets.length}</div>
          </div>
        </div>
        {!upcoming && totalTickets === 0 ? (
          <p className="meta">Only members who&apos;ve linked an approved Roobet username earn tickets. Link yours to start counting.</p>
        ) : null}
      </div>

      <div className="card stack" style={{ gap: 18 }}>
        <span className="kicker">Your tickets</span>
        {!user ? (
          <LoginButton label="Log in to see your tickets" returnTo="/raffles" />
        ) : !mine?.linked ? (
          <>
            <p>Link your Roobet username to earn tickets.</p>
            <Link className="btn btn--primary" href="/me/link">
              Link Roobet
            </Link>
          </>
        ) : (
          <>
            <div className="row" style={{ alignItems: 'baseline' }}>
              <span className="num" style={{ fontSize: 64, fontWeight: 600, letterSpacing: '-0.04em', lineHeight: 1 }}>
                {mine.tickets}
              </span>
              <span className="meta">of {raffle.maxTicketsPerUser} max</span>
            </div>
            {mine.capped ? (
              <p className="meta">You&apos;ve hit the ticket cap.</p>
            ) : (
              <div className="stack" style={{ gap: 8 }}>
                <div className="row" style={{ justifyContent: 'space-between', fontSize: 14 }}>
                  <span className="meta">Next ticket</span>
                  <span className="num">
                    {formatUsd(mine.towardNext)} / {formatUsd(raffle.usdPerTicket)}
                  </span>
                </div>
                <div className="bar">
                  <div className="bar__fill" style={{ width: `${(mine.towardNext / raffle.usdPerTicket) * 100}%` }} />
                </div>
              </div>
            )}
            <div className="row" style={{ gap: 12 }}>
              <div className="mini">
                <span className="meta">Chance of a prize</span>
                <b className="num">{chance === null ? '—' : `≈ ${(chance * 100).toFixed(1)}%`}</b>
              </div>
              <div className="mini">
                <span className="meta">Wagered in window</span>
                <b className="num">{formatUsd(mine.wagered)}</b>
              </div>
            </div>
          </>
        )}
        <p className="meta">Updated from Roobet affiliate data every 10 minutes.</p>
      </div>
    </section>

    {raffle.seedHash ? (
      <section className="card row" style={{ gap: 24, alignItems: 'flex-start' }}>
        <div className="stack" style={{ flex: '1 1 380px', gap: 8 }}>
          <strong>Provably fair draw</strong>
          <p className="meta">
            Before tickets close we publish a fingerprint of a secret seed. After the draw we reveal the seed, so anyone can
            re-run the draw and check the winners. <Link href="/fair">How it works</Link>
          </p>
        </div>
        <div className="stack" style={{ flex: '1 1 360px', gap: 6 }}>
          <span className="meta">Seed fingerprint (SHA-256)</span>
          <code className="hash">{raffle.seedHash}</code>
        </div>
      </section>
    ) : null}
    </>
  );
}
