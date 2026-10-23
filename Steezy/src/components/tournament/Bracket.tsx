import type { CSSProperties, ReactNode } from 'react';
import { SlotThumb } from '@/components/hall-of-fame/SlotArt';
import { isLevel, type Match, type TournamentSummary } from '@/server/services/tournaments';

const x = (m: number | null) => (m === null ? '' : `${m.toLocaleString('en-US', { maximumFractionDigits: 2 })}×`);

/**
 * The bracket, the same on /tournament and the admin screen: one column per
 * round, each match a pair of rows. Later rounds are spaced to sit between the
 * two matches feeding them. The match being played glows; winners are bright
 * and losers fade. `renderAction` adds admin controls under a match.
 */
export function TournamentBracket({ s, renderAction }: { s: TournamentSummary; renderAction?: (m: Match) => ReactNode }) {
  return (
    <div className="tb" style={{ '--rounds': s.rounds.length } as CSSProperties}>
      {s.rounds.map((r) => (
        <div key={r.round} className="tb-round">
          <span className="tb-round-name">{r.name}</span>
          <div className="tb-matches">
            {r.matches.map((m) => (
              <div key={m.id} className="tb-cell">
                <div className={`tb-match${s.current?.id === m.id ? ' is-current' : ''}${m.winner ? ' is-done' : ''}`}>
                  <Row m={m} side="a" />
                  <Row m={m} side="b" />
                </div>
                {renderAction ? renderAction(m) : null}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Row({ m, side }: { m: Match; side: 'a' | 'b' }) {
  const player = side === 'a' ? m.playerA : m.playerB;
  const multi = side === 'a' ? m.multiA : m.multiB;
  if (!player) {
    // Round 1 byes sit on side B; anywhere else the player isn't known yet.
    return (
      <div className="tb-row is-empty">
        <span>{m.round === 1 ? 'bye' : '—'}</span>
      </div>
    );
  }
  const state = m.winner ? (m.winner === side ? ' is-won' : ' is-lost') : '';
  return (
    <div className={`tb-row${state}`}>
      <b>{player}</b>
      <span className="tb-score num">{x(multi)}</span>
    </div>
  );
}

export type Contender = { player: string; slot: string | null; image: string | null; multi: number | null };

/** The match being played, head to head: each player's slot art, slot and score. */
export function TournamentVersus({ match, round, a, b }: { match: Match; round: string; a: Contender; b: Contender }) {
  return (
    <div className="tv">
      <span className="tv-round">{round}</span>
      <div className="tv-grid">
        <Side c={a} />
        <span className="tv-vs">VS</span>
        <Side c={b} />
      </div>
      {isLevel(match) ? <p className="tv-note">Level at {x(match.multiA)} — both buy again.</p> : null}
    </div>
  );
}

function Side({ c }: { c: Contender }) {
  return (
    <div className="tv-side">
      <SlotThumb name={c.slot ?? c.player} image={c.image} size={72} />
      <div className="tv-body">
        <span className="tv-label">{c.multi !== null ? 'Last buy' : 'Up next'}</span>
        <b className="tv-who">{c.player}</b>
        <small className="tv-slot">{c.slot ?? 'No slot yet'}</small>
        <span className="tv-score num">{c.multi !== null ? x(c.multi) : '—'}</span>
      </div>
    </div>
  );
}
