import type { CSSProperties } from 'react';
import { x, type Side } from '@/lib/tourney';
import type { MatchView, PlayerView, TourneySummary, TourneyTurn } from '@/server/services/tourney';
import { SlotArt } from './SlotArt';

/**
 * The bracket, drawn the same way on /tournament, the stream overlay and the
 * admin screen: one column per round, each match a pair of rows. Matches in
 * later rounds are spaced to sit between the two they are fed by. The match
 * being played glows; winners are bright and losers fade. (From MattySpins.)
 */
export function TourneyBracket({ s, variant = 'site' }: { s: TourneySummary; variant?: 'site' | 'ovl' }) {
  return (
    <div className={`tb tb--${variant}`} style={{ '--rounds': s.bracket.length } as CSSProperties}>
      {s.bracket.map((r) => (
        <div key={r.round} className="tb-round">
          <span className="tb-round-name">{r.name}</span>
          <div className="tb-matches">
            {r.matches.map((m) => (
              <div key={m.id} className="tb-cell">
                <MatchCard m={m} playing={s.playing} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MatchCard({ m, playing }: { m: MatchView; playing: TourneyTurn | null }) {
  const live = playing?.matchId === m.id ? playing.side : null;
  return (
    <div className={`tb-match${m.current ? ' is-current' : ''}${m.winner ? ' is-done' : ''}`}>
      <Row m={m} side="a" live={live === 'a'} />
      <Row m={m} side="b" live={live === 'b'} />
    </div>
  );
}

function Row({ m, side, live }: { m: MatchView; side: Side; live: boolean }) {
  const p = m[side];
  const legs = m.state.legs[side];
  const state = m.winner ? (m.winner === side ? ' is-won' : ' is-lost') : '';
  if (!p) {
    return (
      <div className="tb-row is-empty">
        <span>{m.bye && side === 'b' ? 'bye' : '—'}</span>
      </div>
    );
  }
  return (
    <div className={`tb-row${state}${live ? ' is-live' : ''}`}>
      <b>{p.kickUsername}</b>
      <span className="tb-score num">{m.decidedBy === 'forfeit' && m.winner !== side ? 'ff' : legs.length ? x(legs[legs.length - 1]) : ''}</span>
    </div>
  );
}

/** The match being played, head to head: each player's slot and score, and whose buy it is. */
export function TourneyVersus({ s, round }: { s: TourneySummary; round?: string }) {
  const m = s.current;
  if (!m || !m.a || !m.b) return null;
  const live = s.playing?.matchId === m.id ? s.playing.side : null;
  return (
    <div className="tv">
      {round ? <span className="tv-round">{round}</span> : null}
      <div className="tv-grid">
        <Contender p={m.a} legs={m.state.legs.a} live={live === 'a'} slot={live === 'a' ? s.playing : null} />
        <span className="tv-vs">VS</span>
        <Contender p={m.b} legs={m.state.legs.b} live={live === 'b'} slot={live === 'b' ? s.playing : null} />
      </div>
      {m.state.tied ? <p className="tv-note">Level — both buy again.</p> : null}
    </div>
  );
}

function Contender({ p, legs, live, slot }: { p: PlayerView; legs: number[]; live: boolean; slot: TourneyTurn | null }) {
  const name = slot?.slotName ?? p.slotName;
  const art = slot ? slot.imageUrl : p.imageUrl;
  return (
    <div className={`tv-side${live ? ' is-live' : ''}`}>
      <SlotArt src={art} name={name} width={60} />
      <div className="tv-body">
        <span className="tv-label">{live ? 'Buying now' : legs.length ? 'Scored' : 'Up next'}</span>
        <b className="tv-who">{p.kickUsername}</b>
        <small className="tv-slot">{name}</small>
        <span className="tv-score num">{legs.length ? legs.map(x).join(' · ') : '—'}</span>
      </div>
    </div>
  );
}
