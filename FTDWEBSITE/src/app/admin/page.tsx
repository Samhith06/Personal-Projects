import Link from 'next/link';
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { CrewStatus } from '@/components/admin/CrewStatus';
import { Empty, Panel, PageTitle } from '@/components/admin/fields';
import { Icon } from '@/components/ui/Icon';
import { dateLabel, num, relativeTime, usd } from '@/lib/format';
import { features } from '@/lib/env';
import { db } from '@/server/db';
import { challenges, clips, giveaways, raffleEntries, raffles, users, wins } from '@/server/db/schema';
import { getActivity } from '@/server/services/content';
import { adminContext } from './_lib';

export const metadata = { title: 'Dashboard' };

export default async function AdminOverview() {
  const ctx = await adminContext();
  const { staff, names } = ctx;
  const scope = staff.isMaster ? undefined : (staff.ownChannel ?? '__none__');
  const channelIds = scope ? [scope] : [...names.keys()];

  const [
    recentGiveaways,
    [{ clipCount }],
    [{ winCount }],
    activeRaffles,
    [{ activeChallenges }],
    memberStats,
    activity,
  ] = await Promise.all([
    db
      .select()
      .from(giveaways)
      .where(scope ? eq(giveaways.streamerId, scope) : undefined)
      .orderBy(desc(giveaways.occurredAt))
      .limit(6),
    db.select({ clipCount: count() }).from(clips).where(inArray(clips.streamerId, channelIds)),
    db.select({ winCount: count() }).from(wins).where(inArray(wins.streamerId, channelIds)),
    db
      .select()
      .from(raffles)
      .where(scope ? and(eq(raffles.status, 'active'), eq(raffles.hostId, scope)) : eq(raffles.status, 'active')),
    db
      .select({ activeChallenges: count() })
      .from(challenges)
      .where(scope ? and(eq(challenges.status, 'active'), eq(challenges.hostId, scope)) : eq(challenges.status, 'active')),
    staff.isMaster
      ? Promise.all([
          db.select({ n: count() }).from(users),
          db.select({ n: count() }).from(users).where(eq(users.kickVerified, true)),
          db.select({ n: count() }).from(raffleEntries),
        ])
      : Promise.resolve(null),
    staff.isMaster ? getActivity(6) : Promise.resolve([]),
  ]);

  // The running giveaway total for this admin's scope.
  const [givenRow] = await db
    .select({ total: sql<number>`coalesce(sum(${giveaways.amount}), 0)` })
    .from(giveaways)
    .where(scope ? eq(giveaways.streamerId, scope) : undefined);
  const givenAway = Number(givenRow?.total ?? 0);

  const first = staff.user.discordGlobalName || staff.user.discordUsername;

  const tiles = [
    ...(memberStats
      ? [
          { label: 'Members', value: num(memberStats[0][0].n), icon: 'users' as const, href: '/admin/members' },
          { label: 'Verified Kick', value: num(memberStats[1][0].n), icon: 'verified' as const, href: '/admin/members' },
        ]
      : []),
    { label: 'Given away', value: usd(givenAway), icon: 'gift' as const, href: '/admin/giveaways' },
    { label: 'Active raffles', value: num(activeRaffles.length), icon: 'ticket' as const, href: '/admin/raffles' },
    { label: 'Active challenges', value: num(activeChallenges), icon: 'flag' as const, href: '/admin/challenges' },
    { label: 'Clips', value: num(clipCount), icon: 'film' as const, href: '/admin/clips' },
    { label: 'Wall of Fame', value: num(winCount), icon: 'crown' as const, href: '/admin/wins' },
    ...(memberStats ? [{ label: 'Raffle entries', value: num(memberStats[2][0].n), icon: 'ticket' as const, href: '/admin/raffles' }] : []),
  ];

  return (
    <>
      <PageTitle
        eyebrow="Dashboard"
        title={`Welcome back, ${first}`}
        description={
          staff.isMaster
            ? 'You have full control of every channel and the site.'
            : `You manage ${names.get(staff.ownChannel ?? '') ?? 'your channel'}. Changes go live immediately.`
        }
      />

      <div className="adm-quick">
        <Link className="btn btn--gold btn--sm" href="/admin/giveaways">
          <Icon name="gift" /> Log a giveaway
        </Link>
        <Link className="btn btn--ghost btn--sm" href="/admin/clips?new=1">
          <Icon name="film" /> Add clip
        </Link>
        <Link className="btn btn--ghost btn--sm" href="/admin/wins?new=1">
          <Icon name="crown" /> Add win
        </Link>
        <Link className="btn btn--ghost btn--sm" href="/admin/raffles?new=1">
          <Icon name="ticket" /> New raffle
        </Link>
      </div>

      <ul className="adm-tiles">
        {tiles.map((t) => (
          <li key={t.label}>
            <Link href={t.href} className="adm-tile">
              <Icon name={t.icon} />
              <span className="adm-tile__value tabular">{t.value}</span>
              <span className="adm-tile__label">{t.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="adm-columns">
        <Panel title="Recent giveaways" action={<Link className="link-arrow" href="/admin/giveaways">Manage giveaways <Icon name="arrow-right" /></Link>}>
          {recentGiveaways.length ? (
            <ul className="adm-list">
              {recentGiveaways.map((g) => (
                <li key={g.id}>
                  <span className="adm-list__main">
                    <b>
                      {g.winnerHandle} — {usd(g.amount)}
                    </b>
                    <span>
                      {g.note || g.kind} · {dateLabel(g.occurredAt, 'UTC')}
                    </span>
                  </span>
                  <Link className="btn btn--ghost btn--sm" href={`/admin/giveaways?edit=${g.id}`}>
                    Edit
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Nothing logged yet. Add the first payout so the giveaway board has a number to show.</Empty>
          )}
        </Panel>

        <Panel title={staff.isMaster ? 'Crew status' : 'Channel status'}>
          <CrewStatus channels={ctx.streamers.filter((s) => s.isActive && channelIds.includes(s.id)).map((s) => ({ id: s.id, name: s.displayName }))} />
        </Panel>

        {activeRaffles.length ? (
          <Panel title="Live raffles" action={<Link className="link-arrow" href="/admin/raffles">All raffles <Icon name="arrow-right" /></Link>}>
            <ul className="adm-list">
              {activeRaffles.map((r) => (
                <li key={r.id}>
                  <span className="adm-list__main">
                    <b>{r.name}</b>
                    <span>
                      {num(r.entries)} entries · closes {dateLabel(r.endsAt, 'UTC')}
                    </span>
                  </span>
                  <Link className="btn btn--ghost btn--sm" href={`/admin/raffles?edit=${r.id}`}>
                    Manage
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}

        {staff.isMaster ? (
          <Panel title="Recent activity">
            <ul className="adm-list">
              {activity.map((a) => (
                <li key={a.id}>
                  <span className="adm-list__main">
                    <b>{a.title}</b>
                    <span>
                      {a.tag} · {relativeTime(a.occurredAt)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}

        {staff.isMaster ? (
          <Panel title="Integrations">
            <ul className="adm-list">
              {[
                { label: 'Discord login', ok: features.discordAuth, hint: 'DISCORD_CLIENT_ID / SECRET' },
                { label: 'Kick login', ok: features.kickAuth, hint: 'KICK_CLIENT_ID / SECRET' },
                { label: 'Kick live status', ok: true, hint: features.kickApi ? 'Official Kick API' : 'Kick public data' },
              ].map((i) => (
                <li key={i.label}>
                  <span className="adm-list__main">
                    <b>{i.label}</b>
                    <span>{i.hint}</span>
                  </span>
                  <span className={`tag ${i.ok ? 'tag--success' : ''}`}>{i.ok ? 'Connected' : 'Not set up'}</span>
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}

        {staff.isMaster ? (
          <Panel
            title="Backup"
            description="Everything the crew has entered — profiles, the giveaway log, hunts and uploaded images — is one file on one disk. Download a copy and keep it somewhere that is not this server."
          >
            <a className="btn btn--ghost btn--sm" href="/api/admin/backup" download>
              <Icon name="upload" />
              Download the database
            </a>
            <p className="field__hint">
              A consistent snapshot, taken while the site keeps running. Worth doing before anything risky, and
              regularly once the board is busy.
            </p>
          </Panel>
        ) : null}
      </div>
    </>
  );
}
