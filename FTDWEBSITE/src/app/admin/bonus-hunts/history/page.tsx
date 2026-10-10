import Link from 'next/link';
import { PageTitle, Panel } from '@/components/admin/fields';
import { bonusKindLabel } from '@/lib/bonus-hunt';
import { dateLabel, multiplier, usd } from '@/lib/format';
import { getHuntHistory } from '@/server/services/bonus-hunt';
import { adminContext, param, resolveChannel } from '../../_lib';
import { HuntTabs, HuntTile } from '../_parts';

export const metadata = { title: 'Bonus hunt history' };

const signed = (n: number) => `${n >= 0 ? '+' : '−'}${usd(Math.abs(n))}`;
const x = (n: number | null) => (n === null ? '—' : multiplier(n, 1));

/**
 * Every finished hunt and where the crew stands across all of them. Master
 * admins can narrow it to one channel; creators only ever see their own.
 */
export default async function BonusHuntHistory({ searchParams }: PageProps<'/admin/bonus-hunts/history'>) {
  const ctx = await adminContext();
  const sp = await searchParams;
  const channel = resolveChannel(ctx, param(sp.channel));
  const { hunts, totals } = await getHuntHistory(channel);

  return (
    <>
      <PageTitle
        eyebrow="Bonus hunts"
        title="History"
        description="Every finished hunt, and the running total across all of them."
      />

      <HuntTabs current="history" />

      {ctx.staff.isMaster ? (
        <nav className="chips adm-filter" aria-label="Channel">
          <Link className="chip" href="/admin/bonus-hunts/history" aria-current={!channel ? 'page' : undefined}>
            All channels
          </Link>
          {ctx.streamers.map((s) => (
            <Link
              key={s.id}
              className="chip"
              href={`/admin/bonus-hunts/history?channel=${s.id}`}
              aria-current={channel === s.id ? 'page' : undefined}
            >
              {s.displayName}
            </Link>
          ))}
        </nav>
      ) : null}

      {!hunts.length ? (
        <Panel title="Nothing yet">
          <p className="muted">Finished hunts show up here, with the totals across all of them.</p>
        </Panel>
      ) : (
        <>
          <Panel title="Across all hunts">
            <ul className="adm-tiles">
              <HuntTile label="Profit / loss" value={signed(totals.profit)} tone={totals.profit >= 0 ? 'up' : 'down'} />
              <HuntTile label="Put in" value={usd(totals.invested)} />
              <HuntTile label="Returned" value={usd(totals.returned)} />
              <HuntTile label="Hunts in profit" value={`${totals.inProfit}/${totals.hunts}`} />
              <HuntTile label="Average multiplier" value={x(totals.averageX)} />
              <HuntTile label="Bonuses opened" value={String(totals.bonuses)} />
            </ul>
          </Panel>

          <Panel title="Highlights">
            <ul className="adm-list">
              {totals.best ? (
                <li>
                  <span className="adm-list__main">
                    <strong>Best bonus</strong>
                    <span className="muted">
                      {totals.best.game} — {usd(totals.best.payout)} on {usd(totals.best.bet)} ({totals.best.huntTitle})
                    </span>
                  </span>
                  <strong className="hunt-up">{multiplier(totals.best.payout, totals.best.bet)}</strong>
                </li>
              ) : null}
              {totals.bestHunt ? (
                <li>
                  <span className="adm-list__main">
                    <strong>Best hunt</strong>
                    <span className="muted">{totals.bestHunt.title}</span>
                  </span>
                  <strong className={totals.bestHunt.profit >= 0 ? 'hunt-up' : 'hunt-down'}>{signed(totals.bestHunt.profit)}</strong>
                </li>
              ) : null}
              {totals.worstHunt && totals.hunts > 1 ? (
                <li>
                  <span className="adm-list__main">
                    <strong>Worst hunt</strong>
                    <span className="muted">{totals.worstHunt.title}</span>
                  </span>
                  <strong className={totals.worstHunt.profit >= 0 ? 'hunt-up' : 'hunt-down'}>{signed(totals.worstHunt.profit)}</strong>
                </li>
              ) : null}
            </ul>
          </Panel>

          <div className="adm-columns">
            <Panel title="By bonus type" description="How each kind has paid on average.">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Bonuses</th>
                    <th>Average</th>
                  </tr>
                </thead>
                <tbody>
                  {totals.byKind.map((k) => (
                    <tr key={k.key}>
                      <td>{bonusKindLabel(k.key)}</td>
                      <td>{k.count}</td>
                      <td>{x(k.averageX)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>

            <Panel title="Most played games">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Game</th>
                    <th>Bonuses</th>
                    <th>Average</th>
                  </tr>
                </thead>
                <tbody>
                  {totals.topGames.map((g) => (
                    <tr key={g.key}>
                      <td>{g.key}</td>
                      <td>{g.count}</td>
                      <td>{x(g.averageX)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          </div>

          <Panel title="Every hunt" description={`${hunts.length} finished, newest first.`}>
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Hunt</th>
                  <th>Bonuses</th>
                  <th>Start</th>
                  <th>Returned</th>
                  <th>Average</th>
                  <th>Result</th>
                  <th>GTB winner</th>
                </tr>
              </thead>
              <tbody>
                {hunts.map((h) => (
                  <tr key={h.id}>
                    <td>{dateLabel(h.endedAt ?? h.startedAt)}</td>
                    <td>
                      <Link href={`/admin/bonus-hunts/${h.id}`}>{h.title}</Link>
                      <span className="muted"> · {ctx.names.get(h.streamerId) ?? h.streamerId}</span>
                    </td>
                    <td>{h.stats.opened}</td>
                    <td>{usd(h.startBalance)}</td>
                    <td>{usd(h.stats.won)}</td>
                    <td>{h.stats.opened ? multiplier(h.stats.won, h.stats.totalBet - h.stats.remainingBet) : '—'}</td>
                    <td className={h.stats.profit >= 0 ? 'hunt-up' : 'hunt-down'}>{signed(h.stats.profit)}</td>
                    <td>{h.gtb.winner ? `@${h.gtb.winner.username}` : <span className="muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </>
      )}
    </>
  );
}
