import type { Metadata } from 'next';
import Link from 'next/link';
import { CLUBS, champions, clubWins, records } from '@/server/services/hall-of-fame';
import { WinCard } from '@/components/hall-of-fame/SlotArt';
import { formatUsd, ordinal } from '@/lib/format';

export const metadata: Metadata = { title: 'Hall of Fame' };

const MEDAL = ['var(--medal-gold)', 'var(--medal-silver)', 'var(--medal-bronze)'];

const multi = (m: number) => `${m.toLocaleString('en-US', { maximumFractionDigits: 1 })}×`;

function Person({ name, handle }: { name: string; handle: string | null }) {
  return handle ? (
    <Link className="person-link" href={`/u/${encodeURIComponent(handle)}`}>
      {name}
    </Link>
  ) : (
    <>{name}</>
  );
}

export default async function HallOfFamePage() {
  const [champs, clubs, recs] = await Promise.all([
    champions(),
    Promise.all(CLUBS.map(async (club) => ({ club, wins: await clubWins(club.min, club.max) }))),
    records(),
  ]);

  return (
    <div className="container page" style={{ gap: 48 }}>
      <div className="stack" style={{ gap: 10 }}>
        <span className="kicker">Hall of Fame</span>
        <h1 className="hof-title">The ones chat remembers.</h1>
        <p className="meta" style={{ fontSize: 15, maxWidth: '56ch' }}>
          Monthly champions, mega wins and the 2,000×, 1,000× and 500× clubs under code STZY, and the community&apos;s records.
        </p>
      </div>

      <section className="stack">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <h2 style={{ fontSize: 26 }}>Monthly champions</h2>
          <Link href="/leaderboard" style={{ fontSize: 14 }}>
            Current leaderboard
          </Link>
        </div>
        {champs.length ? (
          <div className="card-grid">
            {champs.map((c) => {
              const first = c.podium.find((p) => p.rank === 1);
              return (
                <article key={c.id} className="card stack" style={{ gap: 16 }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="meta">{c.name}</span>
                    <span className="tag tag--neutral">{formatUsd(c.pool)} pool</span>
                  </div>
                  {first ? (
                    <div className="row" style={{ gap: 14 }}>
                      <span
                        className="podium__avatar"
                        style={{ width: 52, height: 52, boxShadow: `0 0 0 2px var(--color-surface), 0 0 0 4px ${MEDAL[0]}` }}
                      >
                        {first.name[0]?.toUpperCase()}
                      </span>
                      <div>
                        <div style={{ fontSize: 20, fontWeight: 600 }}>
                          <Person name={first.name} handle={first.handle} />
                        </div>
                        <div className="num" style={{ fontSize: 14, color: MEDAL[0] }}>
                          1st · {formatUsd(first.prize)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="meta">No entries that month.</p>
                  )}
                  <div className="stack" style={{ gap: 6, fontSize: 14 }}>
                    {c.podium
                      .filter((p) => p.rank > 1)
                      .map((p) => (
                        <div key={p.rank} className="row" style={{ justifyContent: 'space-between' }}>
                          <span>
                            <span style={{ color: MEDAL[p.rank - 1], display: 'inline-block', width: 34 }}>{ordinal(p.rank)}</span>
                            <Person name={p.name} handle={p.handle} />
                          </span>
                          <span className="meta num">{formatUsd(p.prize)}</span>
                        </div>
                      ))}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="card">
            <p className="meta">The first monthly champion is crowned when this month&apos;s leaderboard ends.</p>
          </div>
        )}
      </section>

      {clubs.map(({ club, wins }) => (
        <section key={club.key} className="stack">
          <div>
            <h2 style={{ fontSize: 26, marginBottom: 6 }}>{club.title}</h2>
            <span className="meta">
              {club.max === null
                ? `Every hit of ${multi(club.min)} or more under STZY, newest first`
                : `Every hit from ${multi(club.min)} up to ${multi(club.max)} under STZY, newest first`}
            </span>
          </div>
          {wins.length ? (
            <div className="win-grid">
              {wins.map((w, i) => (
                <WinCard key={i} {...w} />
              ))}
            </div>
          ) : (
            <div className="card">
              <p className="meta">
                {club.key === 'mega' ? 'No mega wins yet.' : `Nobody in the ${multi(club.min)} club yet.`} The first one shows up here within
                minutes of landing.
              </p>
            </div>
          )}
        </section>
      ))}

      {recs.length ? (
        <section className="stat-grid">
          {recs.map((r) => (
            <div key={r.label} className="card stack" style={{ gap: 6 }}>
              <span className="kicker">{r.label}</span>
              <span style={{ fontSize: 20, fontWeight: 600 }}>
                <Person name={r.person.name} handle={r.person.handle} />
              </span>
              <span className="meta num">{r.value}</span>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
