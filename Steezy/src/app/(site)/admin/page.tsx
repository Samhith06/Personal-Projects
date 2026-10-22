import Link from 'next/link';
import { Flash, type FlashParams } from '@/components/admin/Flash';
import { getCurrentUser, hasRole } from '@/server/auth/session';
import { getBotAccount } from '@/server/kick/bot';
import { lastSession } from '@/server/kick/sessions';
import { overviewStats, queueCounts } from '@/server/services/admin';
import { currentLeaderboard, getStandings } from '@/server/services/leaderboards';
import { syncStatus } from '@/server/services/sync-status';
import { formatAgo, formatCountdown, formatUsd } from '@/lib/format';

export default async function AdminOverview({ searchParams }: { searchParams: FlashParams }) {
  const flash = await searchParams;
  const [stats, counts, sync, board, bot, stream, me] = await Promise.all([
    overviewStats(),
    queueCounts(),
    syncStatus('roobet'),
    currentLeaderboard(),
    getBotAccount(),
    lastSession(),
    getCurrentUser(),
  ]);
  const top = board ? (await getStandings(board)).slice(0, 5) : [];

  const kpis = [
    { label: 'Members', value: stats.users.toLocaleString('en-US') },
    { label: 'Kick linked', value: stats.kickLinked.toLocaleString('en-US') },
    { label: 'Roobet approved', value: stats.roobetApproved.toLocaleString('en-US') },
    { label: 'Wagered this month', value: formatUsd(stats.monthWagered), sub: `${stats.monthPlayers} players under STZY` },
  ];

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <span className="kicker">Overview</span>
        <h1 className="admin__title">Dashboard</h1>
      </div>

      <Flash {...flash} />

      <p className={`notice ${sync?.lastError ? 'notice--danger' : 'notice--ok'}`}>
        Roobet sync:{' '}
        {sync?.lastOkAt ? `last good pull ${formatAgo(sync.lastOkAt)}` : 'no successful pull yet'}
        {sync?.lastError ? ` · last error: ${sync.lastError}` : ''}
      </p>

      <section className="admin-kpis">
        {kpis.map((k) => (
          <div key={k.label} className="card stack" style={{ gap: 4, padding: 16 }}>
            <span className="meta">{k.label}</span>
            <span className="num" style={{ fontSize: 24, fontWeight: 600 }}>
              {k.value}
            </span>
            {k.sub ? <span className="meta">{k.sub}</span> : null}
          </div>
        ))}
      </section>

      <section className="admin-split">
        <div className="card stack">
          <strong>Needs attention</strong>
          <Link href="/admin/approvals">{counts.approvals} Roobet username(s) waiting for approval</Link>
          <Link href="/admin/payouts">{counts.payouts} payout(s) to send</Link>
          <span className="meta">{counts.flags} open abuse flag(s)</span>
        </div>
        <div className="card stack">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <strong>{board ? board.name : 'No leaderboard'}</strong>
            <Link href={board ? `/admin/leaderboards/${board.id}` : '/admin/leaderboards'}>Manage</Link>
          </div>
          {top.map((s) => (
            <div key={s.rank} className="row" style={{ justifyContent: 'space-between', fontSize: 14 }}>
              <span>
                <span className="meta num" style={{ display: 'inline-block', width: 24 }}>
                  {s.rank}
                </span>
                {s.displayName}
              </span>
              <span className="num">{formatUsd(s.wagered)}</span>
            </div>
          ))}
          {board ? (
            <span className="meta">
              {board.status} · {formatCountdown(board.endsAt) ? `ends in ${formatCountdown(board.endsAt)}` : 'ended'}
            </span>
          ) : null}
        </div>
        <div className="card stack">
          <strong>Stream &amp; chat bot</strong>
          <span className="meta">
            {stream
              ? stream.endedAt
                ? `Last stream ended ${formatAgo(stream.endedAt)}${stream.title ? ` · ${stream.title}` : ''}`
                : `Live now since ${formatAgo(stream.startedAt)}${stream.title ? ` · ${stream.title}` : ''}`
              : 'No streams recorded yet — check the Kick webhook subscription (npm run kick:subscribe).'}
          </span>
          <span className="meta">
            {bot
              ? `Bot replies as ${bot.username} (connected ${formatAgo(new Date(bot.connectedAt))}).`
              : 'No bot account connected — commands are answered in the server log only.'}
          </span>
          {hasRole(me, 'owner') ? (
            <a className="btn btn--secondary" href="/api/auth/kick/bot" style={{ alignSelf: 'flex-start' }}>
              {bot ? 'Reconnect bot account' : 'Connect bot account'}
            </a>
          ) : null}
        </div>
      </section>
    </div>
  );
}
