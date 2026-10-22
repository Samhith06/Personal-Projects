import type { Match } from '@/server/services/tournaments';

type Round = { round: number; name: string; matches: Match[] };

const fmtMulti = (m: number | null) => (m === null ? '' : `${m.toLocaleString('en-US', { maximumFractionDigits: 2 })}×`);

/** Read-only bracket, one column per round. `renderAction` adds admin controls under a match. */
export function Bracket({ rounds, renderAction }: { rounds: Round[]; renderAction?: (m: Match) => React.ReactNode }) {
  return (
    <div className="bracket">
      {rounds.map((r) => (
        <div key={r.round} className="bracket__round">
          <div className="kicker">{r.name}</div>
          {r.matches.map((m) => (
            <div key={m.id} className={`bracket__match${m.winner ? ' is-done' : ''}`}>
              {(['a', 'b'] as const).map((side) => {
                const player = side === 'a' ? m.playerA : m.playerB;
                const slot = side === 'a' ? m.slotA : m.slotB;
                const multi = side === 'a' ? m.multiA : m.multiB;
                const won = m.winner === side;
                const lost = m.winner && !won;
                return (
                  <div key={side} className={`bracket__side${won ? ' is-winner' : ''}${lost ? ' is-loser' : ''}`}>
                    <span className="bracket__player">{player ?? (m.round === 1 ? 'Bye' : 'TBD')}</span>
                    <span className="bracket__slot">{slot ?? ''}</span>
                    <span className="bracket__multi num">{fmtMulti(multi)}</span>
                  </div>
                );
              })}
              {renderAction ? renderAction(m) : null}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
