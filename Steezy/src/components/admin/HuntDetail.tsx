import { SlotThumb } from '@/components/hall-of-fame/SlotArt';
import { markHuntPrizePaid, removeBonusAction, setPayoutAction, updateHunt } from '@/server/actions/hunts';
import { isLocalHunt } from '@/server/services/hunt-admin';
import { huntBonuses, huntStats, isOpened, type Hunt, type HuntBonus } from '@/server/services/hunts';
import { formatBet, formatUsd } from '@/lib/format';

const money2 = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const signed = (n: number) => `${n < 0 ? '−' : ''}${money2(Math.abs(n))}`;
const multi = (n: number) => `${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}×`;
const multiOf = (b: HuntBonus) => b.multiplier ?? (b.betSize ? (b.payout ?? 0) / b.betSize : 0);

export const huntPhase = (h: Hunt) => (h.completed ? 'finished' : h.isOpening ? 'opening' : 'collecting');

/** The hunt's numbers, worked out from its bonuses when bonushunt.gg didn't send them. */
export function huntNumbers(hunt: Hunt) {
  const s = huntStats(hunt);
  const bonuses = huntBonuses(hunt);
  const opened = bonuses.filter(isOpened);
  const left = bonuses.filter((b) => !isOpened(b));
  const totalBet = bonuses.reduce((sum, b) => sum + (b.betSize ?? 0), 0);
  const openedBet = opened.reduce((sum, b) => sum + (b.betSize ?? 0), 0);
  const leftBet = left.reduce((sum, b) => sum + (b.betSize ?? 0), 0);
  const won = s.totalWinnings ?? opened.reduce((sum, b) => sum + (b.payout ?? 0), 0);
  return {
    bonuses,
    opened,
    left,
    totalBet,
    won,
    profit: s.profitLoss ?? won - hunt.startCost,
    average: s.currentAverageMultiplier ?? (openedBet > 0 ? won / openedBet : null),
    // What each unopened bonus still has to average for the hunt to break even.
    breakEven: s.averagePayoutRequired ?? (leftBet > 0 ? Math.max(0, hunt.startCost - won) / leftBet : null),
    bestMulti: opened.reduce<HuntBonus | null>((top, b) => (multiOf(b) > (top ? multiOf(top) : 0) ? b : top), null),
    topPayout: opened.reduce<HuntBonus | null>((top, b) => ((b.payout ?? 0) > (top?.payout ?? 0) ? b : top), null),
  };
}

/** Start, bonuses, won, profit, average and break-even — the MattySpins six. */
export function HuntKpis({ hunt }: { hunt: Hunt }) {
  const n = huntNumbers(hunt);
  return (
    <div className="admin-kpis hunt-kpis">
      <Kpi label="Start" value={formatUsd(hunt.startCost)} />
      <Kpi label="Bonuses" value={`${n.opened.length}/${n.bonuses.length}`} note={`${money2(n.totalBet)} in bets`} />
      <Kpi label="Won" value={money2(n.won)} tone="gold" />
      <Kpi label="Profit" value={signed(n.profit)} tone={n.profit >= 0 ? 'accent' : 'warn'} />
      <Kpi label="Average" value={n.average === null ? '—' : multi(n.average)} />
      <Kpi label="Break-even" value={!hunt.completed && n.breakEven !== null ? multi(n.breakEven) : '—'} note="needed per $ left" />
    </div>
  );
}

/**
 * Every bonus. On a hunt run here, bonuses can be removed while collecting and
 * payouts typed in while opening (Enter saves); bonushunt.gg hunts are read-only.
 */
export function BonusTable({ hunt }: { hunt: Hunt }) {
  const n = huntNumbers(hunt);
  const local = isLocalHunt(hunt);
  const canRemove = local && huntPhase(hunt) === 'collecting';
  const canPay = local && huntPhase(hunt) === 'opening';

  if (n.bonuses.length === 0) return <div className="emptyq">No bonuses yet.{local ? ' Add them above, or from chat requests below.' : ''}</div>;
  return (
    <div className="table-wrap">
      <table className="table" style={{ minWidth: 640 }}>
        <thead>
          <tr>
            <th style={{ width: 40 }}>#</th>
            <th>Slot</th>
            <th style={{ textAlign: 'right' }}>Bet</th>
            <th style={{ textAlign: 'right' }}>Payout</th>
            <th style={{ textAlign: 'right' }}>Multi</th>
            {canRemove ? <th /> : null}
          </tr>
        </thead>
        <tbody>
          {n.bonuses.map((b, i) => {
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
                        {n.bestMulti?.id === b.id ? <span className="tag tag--warn" style={{ marginLeft: 8 }}>Best multi</span> : null}
                        {n.topPayout?.id === b.id ? <span className="tag tag--warn" style={{ marginLeft: 8 }}>Top payout</span> : null}
                      </b>
                      <small>
                        {b.provider || '—'}
                        {b.requestedBy ? ` · !sr ${b.requestedBy}` : ''}
                      </small>
                    </span>
                  </div>
                </td>
                <td className="num" style={{ textAlign: 'right' }}>
                  {b.betSize ? formatBet(b.betSize) : '—'}
                </td>
                <td className="num" style={{ textAlign: 'right' }}>
                  {canPay ? (
                    <form action={setPayoutAction} className="payout-form">
                      <input type="hidden" name="huntId" value={hunt.id} />
                      <input type="hidden" name="bonusId" value={b.id} />
                      <label className="visually-hidden" htmlFor={`payout-${b.id}`}>
                        Payout for {b.slotName}
                      </label>
                      <input
                        id={`payout-${b.id}`}
                        name="payout"
                        className="input"
                        inputMode="decimal"
                        placeholder="0.00"
                        defaultValue={isOpened(b) ? String(b.payout) : ''}
                        autoFocus={now}
                      />
                      <button className="btn btn--secondary" type="submit">
                        Save
                      </button>
                    </form>
                  ) : isOpened(b) ? (
                    money2(b.payout ?? 0)
                  ) : (
                    '—'
                  )}
                </td>
                <td
                  className="num"
                  style={{ textAlign: 'right', fontWeight: 600, color: m === null || m < 20 ? 'var(--color-muted)' : m >= 100 ? 'var(--medal-gold)' : undefined }}
                >
                  {m === null ? '—' : multi(m)}
                </td>
                {canRemove ? (
                  <td style={{ textAlign: 'right' }}>
                    <form action={removeBonusAction}>
                      <input type="hidden" name="huntId" value={hunt.id} />
                      <input type="hidden" name="bonusId" value={b.id} />
                      <button className="btn btn--secondary" type="submit">
                        Remove
                      </button>
                    </form>
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * A past hunt in full: its numbers, every bonus, and its guessing settings.
 * The current hunt's screen is laid out by the hunts page itself.
 */
export function HuntDetail({ hunt, winnerName, back }: { hunt: Hunt; winnerName: string | null; back: string }) {
  const phase = huntPhase(hunt);
  return (
    <section className="card stack" style={{ gap: 16 }}>
      <div>
        <strong style={{ fontSize: 18 }}>{hunt.title}</strong>{' '}
        <span className={`tag ${hunt.completed ? 'tag--neutral' : hunt.isOpening ? 'tag--accent' : 'tag--warn'}`}>{phase}</span>{' '}
        {hunt.hidden ? <span className="tag tag--danger">hidden</span> : null}
        <div className="meta">
          {isLocalHunt(hunt) ? 'run on the site' : (hunt.casino ?? 'bonushunt.gg')} · started{' '}
          {hunt.remoteCreatedAt.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          {hunt.settledAt ? ` · closest guess: ${winnerName ?? 'nobody'}${hunt.winnerGuess !== null ? ` (${money2(hunt.winnerGuess)})` : ''}` : ''}
        </div>
      </div>

      <HuntKpis hunt={hunt} />
      <BonusTable hunt={hunt} />

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

export function Kpi({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: 'accent' | 'gold' | 'warn' }) {
  return (
    <div className="kpi">
      <div className="kpi__label">{label}</div>
      <div className={`kpi__value${tone ? ` kpi__value--${tone}` : ''}`}>{value}</div>
      {note ? <div className="kpi__note">{note}</div> : null}
    </div>
  );
}
