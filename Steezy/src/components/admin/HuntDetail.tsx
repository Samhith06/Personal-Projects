import { SlotThumb } from '@/components/hall-of-fame/SlotArt';
import { markHuntPrizePaid, updateHunt } from '@/server/actions/hunts';
import { huntBonuses, huntStats, isOpened, type Hunt, type HuntBonus } from '@/server/services/hunts';
import { formatBet, formatUsd } from '@/lib/format';

const money2 = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const multi = (n: number) => `${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}×`;
const multiOf = (b: HuntBonus) => b.multiplier ?? (b.betSize ? (b.payout ?? 0) / b.betSize : 0);

/**
 * Everything staff need about one hunt: the money (start, won, profit, average
 * still required), the best-multiplier and biggest-payout slots, every bonus,
 * and the hunt's settings. Used for the current hunt and for past hunts.
 */
export function HuntDetail({ hunt, winnerName, back }: { hunt: Hunt; winnerName: string | null; back: string }) {
  const s = huntStats(hunt);
  const bonuses = huntBonuses(hunt);
  const opened = bonuses.filter(isOpened);
  const totalBet = bonuses.reduce((sum, b) => sum + (b.betSize ?? 0), 0);
  const won = s.totalWinnings ?? opened.reduce((sum, b) => sum + (b.payout ?? 0), 0);
  const profit = s.profitLoss ?? won - hunt.startCost;
  const bestMulti = opened.reduce<HuntBonus | null>((top, b) => (multiOf(b) > (top ? multiOf(top) : 0) ? b : top), null);
  const topPayout = opened.reduce<HuntBonus | null>((top, b) => ((b.payout ?? 0) > (top?.payout ?? 0) ? b : top), null);
  // What each unopened bonus still has to average for the hunt to break even.
  const left = bonuses.filter((b) => !isOpened(b));
  const leftBet = left.reduce((sum, b) => sum + (b.betSize ?? 0), 0);
  const avgRequired = s.averagePayoutRequired ?? (leftBet > 0 ? Math.max(0, hunt.startCost - won) / leftBet : null);
  const phase = hunt.completed ? 'completed' : hunt.isOpening ? 'opening' : 'collecting';

  return (
    <section className="card stack" style={{ gap: 16 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <strong style={{ fontSize: 18 }}>{hunt.title}</strong>{' '}
          <span className={`tag ${hunt.completed ? 'tag--neutral' : hunt.isOpening ? 'tag--accent' : 'tag--warn'}`}>{phase}</span>{' '}
          {hunt.hidden ? <span className="tag tag--danger">hidden</span> : null}
          <div className="meta">
            {hunt.casino ?? '—'} · started {hunt.remoteCreatedAt.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            {hunt.settledAt ? ` · closest guess: ${winnerName ?? 'nobody'}${hunt.winnerGuess !== null ? ` (${money2(hunt.winnerGuess)})` : ''}` : ''}
          </div>
        </div>
      </div>

      <div className="admin-kpis admin-kpis--3">
        <Kpi label="Starting balance" value={formatUsd(hunt.startCost)} note={totalBet ? `${money2(totalBet)} in bets` : undefined} />
        <Kpi label="Bonuses" value={`${opened.length}/${s.bonusCount ?? bonuses.length}`} note={`${left.length} left to open`} />
        <Kpi label="Won" value={money2(won)} tone="accent" note={`${profit >= 0 ? '+' : '−'}${money2(Math.abs(profit))} profit`} />
        <Kpi
          label="Avg required"
          value={!hunt.completed && avgRequired !== null ? multi(avgRequired) : '—'}
          tone="warn"
          note={hunt.completed ? 'hunt finished' : 'per bonus left, to break even'}
        />
        <Kpi
          label="Best multi"
          value={bestMulti ? multi(multiOf(bestMulti)) : '—'}
          tone="gold"
          note={bestMulti ? `${bestMulti.slotName} · ${money2(bestMulti.payout ?? 0)}` : 'nothing opened yet'}
        />
        <Kpi
          label="Highest payout"
          value={topPayout ? money2(topPayout.payout ?? 0) : '—'}
          tone="gold"
          note={topPayout ? `${topPayout.slotName} · ${multi(multiOf(topPayout))}` : 'nothing opened yet'}
        />
      </div>

      {bonuses.length === 0 ? (
        <div className="emptyq">No bonuses in this hunt yet.</div>
      ) : (
        <div className="table-wrap">
          <table className="table" style={{ minWidth: 640 }}>
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Slot</th>
                <th style={{ textAlign: 'right' }}>Bet</th>
                <th style={{ textAlign: 'right' }}>Payout</th>
                <th style={{ textAlign: 'right' }}>Multi</th>
              </tr>
            </thead>
            <tbody>
              {bonuses.map((b, i) => {
                const now = hunt.isOpening && b.id === hunt.currentOpeningSlot;
                const m = isOpened(b) ? multiOf(b) : null;
                return (
                  <tr key={b.id} className={now ? 'is-now' : undefined}>
                    <td className="meta num">{i + 1}</td>
                    <td>
                      <div className="slotcell">
                        <SlotThumb name={b.slotName} image={b.slotImage ?? null} size={34} />
                        <span>
                          <b>
                            {b.slotName}
                            {now ? <span className="tag tag--accent" style={{ marginLeft: 8 }}>Opening</span> : null}
                            {bestMulti?.id === b.id ? <span className="tag tag--warn" style={{ marginLeft: 8 }}>Best multi</span> : null}
                            {topPayout?.id === b.id ? <span className="tag tag--warn" style={{ marginLeft: 8 }}>Top payout</span> : null}
                          </b>
                          <small>{b.provider || '—'}</small>
                        </span>
                      </div>
                    </td>
                    <td className="num" style={{ textAlign: 'right' }}>
                      {b.betSize ? formatBet(b.betSize) : '—'}
                    </td>
                    <td className="num" style={{ textAlign: 'right' }}>
                      {isOpened(b) ? money2(b.payout ?? 0) : '—'}
                    </td>
                    <td
                      className="num"
                      style={{ textAlign: 'right', fontWeight: 600, color: m === null || m < 20 ? 'var(--color-muted)' : m >= 100 ? 'var(--medal-gold)' : undefined }}
                    >
                      {m === null ? '—' : multi(m)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <form action={updateHunt} className="admin-row" style={{ borderBottom: 0, paddingBottom: 0 }}>
        <input type="hidden" name="huntId" value={hunt.id} />
        <input type="hidden" name="back" value={back} />
        <div className="admin-row__body meta">Settings for this hunt</div>
        <label className="check">
          <input type="checkbox" name="guessesOpen" defaultChecked={hunt.guessesOpen} />
          Guessing
        </label>
        <label className="check">
          <input type="checkbox" name="hidden" defaultChecked={hunt.hidden} />
          Hidden
        </label>
        <label className="visually-hidden" htmlFor={`prize-${hunt.id}`}>
          Guess prize
        </label>
        <input id={`prize-${hunt.id}`} name="guessPrize" className="input" placeholder="Guess prize, e.g. $100 tip" defaultValue={hunt.guessPrize ?? ''} style={{ width: 200 }} />
        <button className="btn btn--secondary" type="submit">
          Save
        </button>
        {hunt.winnerUserId && hunt.guessPrize && !hunt.prizePaidAt ? (
          <button className="btn btn--primary" formAction={markHuntPrizePaid}>
            Mark prize paid
          </button>
        ) : null}
      </form>
    </section>
  );
}

function Kpi({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: 'accent' | 'gold' | 'warn' }) {
  return (
    <div className="kpi">
      <div className="kpi__label">{label}</div>
      <div className={`kpi__value${tone ? ` kpi__value--${tone}` : ''}`}>{value}</div>
      {note ? <div className="kpi__note">{note}</div> : null}
    </div>
  );
}
