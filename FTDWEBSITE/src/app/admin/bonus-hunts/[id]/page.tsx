import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AutoRefresh } from '@/components/admin/AutoRefresh';
import { Field, FormGrid, PageTitle, Panel, Select } from '@/components/admin/fields';
import { GameField } from '@/components/admin/GameField';
import { ActionButton, AdminForm } from '@/components/admin/kit';
import { Icon } from '@/components/ui/Icon';
import { BONUS_KIND_OPTIONS, bonusKindLabel } from '@/lib/bonus-hunt';
import { multiplier, relativeTime, usd } from '@/lib/format';
import { assertChannel, PermissionError } from '@/server/auth/permissions';
import {
  beginGuessing,
  beginOpeningHunt,
  confirmHuntCall,
  deleteBonusHuntAndLeave,
  deleteHuntBonus,
  missHuntCall,
  moveHuntBonusDown,
  moveHuntBonusUp,
  openHuntBonus,
  reopenHuntBonus,
  reopenHuntCall,
  saveBonusHunt,
  saveHuntBonus,
} from '@/server/actions/staff';
import { getGameSuggestions, getHunt, getHuntCalls, getHuntGuesses, rankGuesses } from '@/server/services/bonus-hunt';
import { adminContext } from '../../_lib';
import { HuntSteps, HuntTile, OverlayLinks, STATUS_LABEL } from '../_parts';

export const metadata = { title: 'Bonus hunt' };

const STATUS_OPTIONS = Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }));

/**
 * One hunt, run step by step. Collecting shows the `!sr` calls and the add
 * form; guessing shows the `!guess`es coming in; opening shows the next bonus
 * to open; a finished hunt shows its result and the guess-the-balance winner.
 * The rest (settings, delete) waits at the bottom.
 */
export default async function AdminBonusHunt({ params }: PageProps<'/admin/bonus-hunts/[id]'>) {
  const { id } = await params;
  const { staff, channelOptions, streamers, names } = await adminContext();
  const hunt = await getHunt(id);
  if (!hunt) notFound();
  try {
    assertChannel(staff, hunt.streamerId);
  } catch (error) {
    if (error instanceof PermissionError) notFound();
    throw error;
  }

  const [calls, guesses, gameSuggestions] = await Promise.all([getHuntCalls(hunt.id), getHuntGuesses(hunt.id), getGameSuggestions()]);
  const waiting = calls.filter((c) => c.status === 'pending');
  const missed = calls.filter((c) => c.status === 'missed');
  const collecting = hunt.status === 'collecting';
  const guessing = hunt.status === 'guessing';
  const opening = hunt.status === 'opening';
  const done = hunt.status === 'complete';
  const next = hunt.bonuses.find((b) => b.payout === null);
  const kickChannel = streamers.find((s) => s.id === hunt.streamerId)?.kickUsername;
  // Hunts are usually played at one stake, so the last bet is the likeliest next one.
  const lastBet = hunt.bonuses.at(-1)?.bet;
  const { stats } = hunt;
  const ranked = done ? rankGuesses(guesses, stats.won) : [];
  // Only bonuses still to open can be reordered; this is their opening order.
  const unopened = hunt.bonuses.filter((b) => b.payout === null).map((b) => b.id);
  const guessValues = guesses.map((g) => g.guess);

  return (
    <>
      {collecting || guessing ? <AutoRefresh /> : null}

      <PageTitle
        eyebrow={`Bonus hunt · ${names.get(hunt.streamerId) ?? hunt.streamerId}`}
        title={hunt.title}
        description={`${usd(hunt.startBalance)} start · ${stats.total} bonuses · ${usd(stats.totalBet)} in bets`}
        action={
          <div className="adm-title__buttons">
            <a className="btn btn--ghost btn--sm" href="#overlays">
              <Icon name="film" /> Overlays
            </a>
            <Link className="btn btn--ghost btn--sm" href="/admin/bonus-hunts">
              <Icon name="arrow-left" /> All hunts
            </Link>
          </div>
        }
      />

      <HuntSteps status={hunt.status} />

      {/* ------------------------------------------------ step 1: collecting */}
      {collecting || waiting.length || missed.length ? (
        <Panel
          title={waiting.length ? `Calls from chat (${waiting.length} waiting)` : 'Calls from chat'}
          description={
            collecting
              ? `Viewers type !sr and a slot name in ${kickChannel ? `${kickChannel}'s` : 'your'} Kick chat. For each one, say whether you got a bonus, and if you did, on what bet and which kind. This list refreshes on its own.`
              : 'Slot calls closed when collecting finished. These are the ones still waiting from before.'
          }
        >
          {waiting.length ? (
            <div className="adm-calls">
              {waiting.map((c) => (
                <div key={c.id} className="adm-call">
                  <p className="adm-call__who">
                    <strong>@{c.kickUsername}</strong> called <strong>{c.game}</strong>
                  </p>
                  <AdminForm action={confirmHuntCall} submitLabel="Got a bonus">
                    <input type="hidden" name="id" value={c.id} />
                    <FormGrid>
                      <GameField suggestions={gameSuggestions} defaultGame={c.game} />
                      <Field name="bet" label="Bet ($)" value={lastBet} required placeholder="0.20" inputMode="decimal" />
                      <Select name="kind" label="Bonus type" value="normal" options={BONUS_KIND_OPTIONS} />
                    </FormGrid>
                  </AdminForm>
                  <ActionButton action={missHuntCall} id={c.id} label="No bonus" tone="ghost" />
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No calls waiting.</p>
          )}

          {missed.length ? (
            <details className="adm-calls__missed">
              <summary>No bonus on {missed.length}</summary>
              <ul>
                {missed.map((c) => (
                  <li key={c.id}>
                    <span>
                      @{c.kickUsername} · {c.game}
                    </span>
                    <ActionButton action={reopenHuntCall} id={c.id} label="Undo" tone="ghost" />
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </Panel>
      ) : null}

      {collecting ? (
        <>
          <Panel title="Add a bonus yourself" description="For bonuses nobody called. Added to the end, in the order you'll open them.">
            <AdminForm action={saveHuntBonus} submitLabel="Add bonus" resetOnSuccess>
              <input type="hidden" name="huntId" value={hunt.id} />
              <FormGrid>
                <GameField suggestions={gameSuggestions} />
                <Field name="bet" label="Bet ($)" value={lastBet} required placeholder="0.20" inputMode="decimal" />
                <Select name="kind" label="Bonus type" value="normal" options={BONUS_KIND_OPTIONS} />
              </FormGrid>
            </AdminForm>
          </Panel>

          <Panel
            title="Done collecting?"
            description={
              stats.total
                ? `Close slot calls and open guess the balance on these ${stats.total} bonuses (${usd(stats.totalBet)} in bets). Chat can then !guess the final balance.`
                : 'Add at least one bonus first.'
            }
          >
            <ActionButton key="begin-guessing" action={beginGuessing} id={hunt.id} label="Open guess the balance" confirm="Yes, open guessing" tone="gold" icon="play" />
          </Panel>
        </>
      ) : null}

      {/* ------------------------------------------- step 2: guess the balance */}
      {guessing ? (
        <>
          <Panel
            title={`Guess the balance (${guesses.length} ${guesses.length === 1 ? 'guess' : 'guesses'})`}
            description={`Viewers type !guess and an amount in ${kickChannel ? `${kickChannel}'s` : 'your'} Kick chat, e.g. !guess 1250. Guessing again replaces their guess. Closest to the final balance wins. This list refreshes on its own.`}
          >
            {guesses.length ? (
              <>
                <ul className="adm-tiles">
                  <HuntTile label="Lowest" value={usd(Math.min(...guessValues))} />
                  <HuntTile label="Average" value={usd(Math.round((guessValues.reduce((a, b) => a + b, 0) / guessValues.length) * 100) / 100)} />
                  <HuntTile label="Highest" value={usd(Math.max(...guessValues))} />
                </ul>
                <table className="adm-table adm-guesses">
                  <thead>
                    <tr>
                      <th>Viewer</th>
                      <th>Guess</th>
                      <th>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guesses.map((g) => (
                      <tr key={g.id}>
                        <td>@{g.kickUsername}</td>
                        <td>{usd(g.guess)}</td>
                        <td className="muted">{relativeTime(g.guessedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <p className="muted">No guesses yet.</p>
            )}
          </Panel>

          <Panel title="Close guessing?" description="Locks every guess in and starts the opening from the first bonus.">
            <ActionButton key="begin-opening" action={beginOpeningHunt} id={hunt.id} label="Close guessing and start opening" confirm="Yes, close guessing" tone="gold" icon="play" />
          </Panel>
        </>
      ) : null}

      {/* --------------------------------------------------- step 3: opening */}
      {opening && next ? (
        <Panel
          title={`Open #${next.position} — ${next.game}${next.kind !== 'normal' ? ` (${bonusKindLabel(next.kind)})` : ''}`}
          description={`Type what it paid and press the button. A bonus that paid nothing takes a 0.${guesses.length ? ` ${guesses.length} guesses are locked in for guess the balance.` : ''}`}
        >
          <AdminForm action={openHuntBonus} submitLabel="Record payout" resetOnSuccess>
            <input type="hidden" name="id" value={next.id} />
            <FormGrid>
              <Field
                name="payout"
                label={`Payout on ${usd(next.bet)}`}
                placeholder="0.00"
                inputMode="decimal"
                hint={`Average so far ${stats.opened ? multiplier(stats.won, stats.totalBet - stats.remainingBet) : '—'} · still needed ${
                  stats.remainingBet ? multiplier(Math.max(0, hunt.startBalance - stats.won), stats.remainingBet) : '—'
                }`}
              />
            </FormGrid>
          </AdminForm>
        </Panel>
      ) : null}

      {/* ------------------------------------------------------ step 4: done */}
      {done ? (
        <Panel title="Result">
          <ul className="adm-tiles">
            <HuntTile label="Result" value={`${stats.profit >= 0 ? '+' : '−'}${usd(Math.abs(stats.profit))}`} tone={stats.profit >= 0 ? 'up' : 'down'} />
            <HuntTile label="Returned" value={usd(stats.won)} />
            <HuntTile label="Start" value={usd(hunt.startBalance)} />
            <HuntTile label="Average" value={stats.opened ? multiplier(stats.won, stats.totalBet - stats.remainingBet) : '—'} />
            <HuntTile label="Bonuses" value={`${stats.opened}/${stats.total}`} />
          </ul>
        </Panel>
      ) : null}

      {done ? (
        <Panel
          title="Guess the balance"
          description={ranked.length ? `Final balance ${usd(stats.won)}. Closest guess wins; a tie goes to whoever guessed first.` : 'Nobody guessed on this hunt.'}
        >
          {ranked.length ? (
            <>
              <p className="adm-gtb-winner">
                <Icon name="trophy" /> <strong>@{ranked[0].username}</strong> wins with {usd(ranked[0].guess)}
                <span className="muted"> ({ranked[0].off ? `${usd(ranked[0].off)} off` : 'spot on'})</span>
              </p>
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Viewer</th>
                    <th>Guess</th>
                    <th>Off by</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.slice(0, 10).map((g, i) => (
                    <tr key={g.username} className={i === 0 ? 'is-editing' : undefined}>
                      <td>{i + 1}</td>
                      <td>@{g.username}</td>
                      <td>{usd(g.guess)}</td>
                      <td>{usd(g.off)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : null}
        </Panel>
      ) : null}

      <Panel
        title="The board"
        description={`${stats.opened} of ${stats.total} opened. Bonuses open top to bottom; use Up and Down to change the order of the ones still to open.`}
      >
        {hunt.bonuses.length ? (
          <table className="adm-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Game</th>
                <th>Type</th>
                <th>Bet</th>
                <th>Payout</th>
                <th>X</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {hunt.bonuses.map((b) => (
                <tr key={b.id} className={b.id === next?.id && opening ? 'is-editing' : undefined}>
                  <td>{b.position}</td>
                  <td>
                    {b.game}
                    {b.provider ? <span className="muted"> · {b.provider}</span> : null}
                    {b.calledBy ? <span className="muted"> · called by @{b.calledBy}</span> : null}
                  </td>
                  <td>{bonusKindLabel(b.kind)}</td>
                  <td>{usd(b.bet)}</td>
                  <td>{b.payout === null ? '—' : usd(b.payout)}</td>
                  <td>{b.payout === null ? '—' : multiplier(b.payout, b.bet)}</td>
                  <td className="adm-table__actions">
                    {b.payout === null ? (
                      <>
                        {unopened.indexOf(b.id) > 0 ? (
                          <ActionButton action={moveHuntBonusUp} id={b.id} label="Up" icon="caret-up" tone="ghost" quiet />
                        ) : null}
                        {unopened.indexOf(b.id) < unopened.length - 1 ? (
                          <ActionButton action={moveHuntBonusDown} id={b.id} label="Down" icon="caret-down" tone="ghost" quiet />
                        ) : null}
                        <ActionButton action={deleteHuntBonus} id={b.id} label="Remove" confirm="Confirm" tone="ghost" />
                      </>
                    ) : (
                      <ActionButton action={reopenHuntBonus} id={b.id} label="Undo" tone="ghost" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">No bonuses yet. Confirm a chat call or add one above.</p>
        )}
      </Panel>

      <section id="overlays">
        <Panel
          title={`Stream overlays for ${names.get(hunt.streamerId) ?? hunt.streamerId}`}
          description="The same links for every hunt on this channel. If they're already in OBS, there's nothing to change."
        >
          <OverlayLinks channel={hunt.streamerId} />
        </Panel>
      </section>

      <details className="adm-more">
        <summary>Hunt settings and delete</summary>
        <Panel title="Hunt settings" description="Rename it, correct the start balance, or move it between steps by hand.">
          <AdminForm action={saveBonusHunt} submitLabel="Save hunt" key={hunt.id}>
            <input type="hidden" name="id" value={hunt.id} />
            <FormGrid>
              <Field name="title" label="Title" value={hunt.title} required />
              <Select name="streamerId" label="Channel" value={hunt.streamerId} options={channelOptions} />
              <Field name="startBalance" label="Start balance ($)" value={hunt.startBalance} required inputMode="decimal" />
              <Select name="status" label="Step" value={hunt.status} options={STATUS_OPTIONS} />
            </FormGrid>
          </AdminForm>
        </Panel>

        <Panel title="Delete" description="Removes the hunt, every bonus on it and its chat calls. There's no undo.">
          <ActionButton action={deleteBonusHuntAndLeave} id={hunt.id} label="Delete hunt" confirm="Confirm delete" tone="danger" />
        </Panel>
      </details>
    </>
  );
}
