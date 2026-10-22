import type { Metadata } from 'next';
import { Flash, type FlashParams } from '@/components/admin/Flash';
import { markHuntPrizePaid, syncHuntsNow, updateHunt } from '@/server/actions/hunts';
import { huntOverlayToken } from '@/server/services/hunt-overlay';
import { currentHunt, guessList, huntStats, huntWinnerName, listHunts } from '@/server/services/hunts';
import { syncStatus } from '@/server/services/sync-status';
import { siteUrl } from '@/lib/env';
import { formatAgo, formatUsd } from '@/lib/format';

export const metadata: Metadata = { title: 'Bonus hunts' };

const money2 = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function HuntsAdmin({ searchParams }: { searchParams: FlashParams }) {
  const flash = await searchParams;
  const [rows, current, sync, token] = await Promise.all([listHunts(true), currentHunt(), syncStatus('bonushunt'), huntOverlayToken()]);
  const target = current ? (huntStats(current).totalWinnings ?? null) : null;
  const [guesses, winners] = await Promise.all([current ? guessList(current.id, target) : [], Promise.all(rows.map(huntWinnerName))]);

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <span className="kicker">Stream games</span>
        <h1 className="admin__title">Bonus hunts</h1>
        <p className="meta">
          Hunts come from bonushunt.gg every 30 seconds. Guessing closes on its own when the opening starts; the closest guess wins
          when the hunt completes.
        </p>
      </div>
      <Flash {...flash} />

      <section className={`notice ${sync?.lastError ? 'notice--danger' : 'notice--ok'} row`} style={{ justifyContent: 'space-between' }}>
        <span>
          bonushunt.gg sync: {sync?.lastOkAt ? `last good pull ${formatAgo(sync.lastOkAt)}` : 'no successful pull yet'}
          {sync?.lastError ? ` · last error: ${sync.lastError}` : ''}
        </span>
        <form action={syncHuntsNow}>
          <button className="btn btn--secondary" type="submit">
            Sync now
          </button>
        </form>
      </section>

      <section className="card stack" style={{ gap: 8 }}>
        <strong>OBS browser source — hunt overlay</strong>
        <code className="hash">{siteUrl(`/overlay/hunt/${token}`)}</code>
        <span className="meta">1920×1080, transparent. Shows the current hunt, the guess count and the leaderboard ticker. Add ?preview=1 to check it in a browser.</span>
      </section>

      <section className="card">
        <strong>Hunts</strong>
        {rows.length === 0 ? <p className="meta" style={{ marginTop: 8 }}>No hunts synced yet.</p> : null}
        {rows.map((h, i) => {
          const s = huntStats(h);
          return (
            <form key={h.id} action={updateHunt} className="admin-row">
              <input type="hidden" name="huntId" value={h.id} />
              <div className="admin-row__body">
                <div style={{ fontWeight: 500 }}>
                  {h.title} {h.id === current?.id ? <span className="tag tag--accent">current</span> : null}{' '}
                  <span className="tag tag--neutral">{h.completed ? 'completed' : h.isOpening ? 'opening' : 'collecting'}</span>
                </div>
                <div className="meta">
                  {h.casino ?? '—'} · {formatUsd(h.startCost)} start · {s.openedBonuses ?? 0}/{s.bonusCount ?? 0} opened · {money2(s.totalWinnings ?? 0)} won
                  {h.settledAt ? ` · closest guess: ${winners[i] ?? 'none'}${h.winnerGuess !== null ? ` (${money2(h.winnerGuess)})` : ''}` : ''}
                </div>
              </div>
              <label className="check">
                <input type="checkbox" name="guessesOpen" defaultChecked={h.guessesOpen} />
                Guessing
              </label>
              <label className="check">
                <input type="checkbox" name="hidden" defaultChecked={h.hidden} />
                Hidden
              </label>
              <label className="visually-hidden" htmlFor={`prize-${h.id}`}>
                Guess prize
              </label>
              <input id={`prize-${h.id}`} name="guessPrize" className="input" placeholder="Guess prize, e.g. $100 tip" defaultValue={h.guessPrize ?? ''} style={{ width: 200 }} />
              <button className="btn btn--secondary" type="submit">
                Save
              </button>
              {h.winnerUserId && h.guessPrize && !h.prizePaidAt ? (
                <button className="btn btn--primary" formAction={markHuntPrizePaid}>
                  Mark prize paid
                </button>
              ) : null}
            </form>
          );
        })}
      </section>

      {current ? (
        <section className="card">
          <strong>
            Guesses on “{current.title}” · {guesses.length}
          </strong>
          <p className="meta" style={{ margin: '4px 0 8px' }}>
            Sorted by distance from the current balance ({money2(target ?? 0)}).
          </p>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Member</th>
                  <th style={{ textAlign: 'right' }}>Guess</th>
                  <th style={{ textAlign: 'right' }}>Off by</th>
                  <th>Via</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {guesses.slice(0, 100).map((g, i) => (
                  <tr key={g.userId}>
                    <td className="meta num">{i + 1}</td>
                    <td>{g.name}</td>
                    <td className="num" style={{ textAlign: 'right' }}>
                      {money2(g.amount)}
                    </td>
                    <td className="num meta" style={{ textAlign: 'right' }}>
                      {money2(Math.abs(g.amount - (target ?? 0)))}
                    </td>
                    <td className="meta">{g.source}</td>
                    <td className="meta">{formatAgo(g.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {guesses.length === 0 ? <p className="meta" style={{ padding: 8 }}>No guesses yet.</p> : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
