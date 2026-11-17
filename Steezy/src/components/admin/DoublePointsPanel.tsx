import { BoostCountdown, LocalTime } from '@/components/boost/BoostClock';
import { extendDoublePoints, startDoublePointsNow, turnOffDoublePoints } from '@/server/actions/boosts';
import { boostEnd, boostLabel, boostState, boostSummaries, currentBoost, recentBoosts } from '@/server/services/wager-boosts';
import { formatUsd } from '@/lib/format';
import { ConfirmSubmit } from './ConfirmSubmit';
import { DoublePointsForm } from './DoublePointsForm';

const fmtSpan = (ms: number) => {
  const min = Math.round(ms / 60_000);
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ''}`;
};

/** Admin card: the on/off switch for double points, its timer, and the last few windows. */
export async function DoublePointsPanel() {
  const now = new Date();
  const [boost, recent] = await Promise.all([currentBoost(now), recentBoosts(6)]);
  const summaries = await boostSummaries(recent.map((b) => b.id));
  const state = boost ? boostState(boost, now) : null;
  const end = boost ? boostEnd(boost) : null;
  const past = recent.filter((b) => boostState(b, now) === 'ended');
  const serverNow = now.toISOString();

  return (
    <section className={`card stack boost-admin${state === 'live' ? ' is-live' : ''}`} style={{ gap: 14 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>Double points</strong>
        {state === 'live' ? (
          <span className="tag tag--accent">
            <span className="dot dot--live" /> ON
          </span>
        ) : state === 'upcoming' ? (
          <span className="tag tag--warn">Scheduled</span>
        ) : (
          <span className="tag tag--neutral">Off</span>
        )}
      </div>

      {boost && state === 'live' ? (
        <>
          <p className="boost-admin__status">
            <b>{boostLabel(boost.multiplier)}</b> is on: every wager under code STZY counts {boost.multiplier}× on the leaderboard.{' '}
            {end ? (
              <>
                Ends in <BoostCountdown to={end.toISOString()} serverNow={serverNow} /> (<LocalTime at={end.toISOString()} />).
              </>
            ) : (
              'Runs until you turn it off.'
            )}
          </p>
          <div className="row" style={{ gap: 8 }}>
            <form action={turnOffDoublePoints}>
              <input type="hidden" name="id" value={boost.id} />
              <ConfirmSubmit className="btn btn--danger" message="Turn double points off now? Wagers from this moment count normally.">
                Turn off now
              </ConfirmSubmit>
            </form>
            {end
              ? [30, 60].map((m) => (
                  <form key={m} action={extendDoublePoints}>
                    <input type="hidden" name="id" value={boost.id} />
                    <input type="hidden" name="minutes" value={m} />
                    <button className="btn btn--secondary" type="submit">
                      +{m === 60 ? '1 hour' : `${m} min`}
                    </button>
                  </form>
                ))
              : null}
          </div>
        </>
      ) : boost && state === 'upcoming' ? (
        <>
          <p className="boost-admin__status">
            <b>{boostLabel(boost.multiplier)}</b> starts in <BoostCountdown to={boost.startsAt.toISOString()} serverNow={serverNow} /> (
            <LocalTime at={boost.startsAt.toISOString()} />){end ? ` and runs ${fmtSpan(end.getTime() - boost.startsAt.getTime())}` : ' and runs until you turn it off'}. The
            leaderboard already shows the countdown.
          </p>
          <div className="row" style={{ gap: 8 }}>
            <form action={startDoublePointsNow}>
              <input type="hidden" name="id" value={boost.id} />
              <button className="btn btn--primary" type="submit">
                Start now
              </button>
            </form>
            <form action={turnOffDoublePoints}>
              <input type="hidden" name="id" value={boost.id} />
              <ConfirmSubmit className="btn btn--danger" message="Cancel the scheduled double points?">
                Cancel
              </ConfirmSubmit>
            </form>
          </div>
        </>
      ) : (
        <>
          <p className="meta">
            While it&apos;s on, every wager under code STZY counts double (or 1.5× / 3×) on the live leaderboard, and a banner at the top of the
            leaderboard tells players to start wagering. Wagers are counted for the exact minutes it&apos;s on; the extra shows up with the next Roobet
            sync (every ~10 min).
          </p>
          <DoublePointsForm />
        </>
      )}

      {past.length ? (
        <div className="stack" style={{ gap: 4 }}>
          <span className="meta">Recent</span>
          {past.map((b) => {
            const e = boostEnd(b)!;
            const s = summaries.get(b.id);
            return (
              <div key={b.id} className="admin-row">
                <div className="admin-row__body">
                  <span>
                    {b.multiplier}× · <LocalTime at={b.startsAt.toISOString()} /> · {fmtSpan(e.getTime() - b.startsAt.getTime())}
                    {b.stoppedAt && (!b.endsAt || b.stoppedAt < b.endsAt) ? ' (turned off early)' : ''}
                  </span>
                  <div className="meta">
                    {s?.players ?? 0} player{s?.players === 1 ? '' : 's'} · {formatUsd(s?.wagered ?? 0)} wagered during it
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
