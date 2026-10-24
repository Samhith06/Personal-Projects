import type { Metadata } from 'next';
import Link from 'next/link';
import { MEMBER_FILTERS, MEMBER_SORTS, searchMembers, type MemberFilter, type MemberSort } from '@/server/services/admin';
import { handleFor } from '@/server/services/profiles';
import { MemberFilters } from '@/components/admin/MemberFilters';
import { ReferredByField } from '@/components/admin/ReferredByField';
import { formatAgo, formatMinutes, formatUsd } from '@/lib/format';

export const metadata: Metadata = { title: 'Members' };

const PAGE = 40;

const FILTER_LABEL: Record<MemberFilter, string> = {
  all: 'All members',
  roobet: 'Roobet linked',
  pending: 'Roobet pending',
  unlinked: 'No Roobet link',
  kick: 'Kick linked',
  staff: 'Staff',
  blocked: 'Blocked',
};

const SORT_LABEL: Record<MemberSort, string> = {
  recent: 'Last seen',
  joined: 'Newest',
  name: 'Name A–Z',
  wager: 'Weighted wager',
  watch: 'Watch time',
};

/** Anything not in the list falls back rather than reaching SQL. */
function pick<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

const shortDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default async function MembersAdmin({ searchParams }: { searchParams: Promise<{ q?: string; filter?: string; sort?: string; page?: string }> }) {
  const params = await searchParams;
  const q = params.q?.trim() ?? '';
  const filter = pick(params.filter, MEMBER_FILTERS, 'all');
  const sort = pick(params.sort, MEMBER_SORTS, 'recent');
  const page = Math.max(1, Number(params.page) || 1);

  const { members, total } = await searchMembers({ query: q, filter, sort, limit: PAGE, offset: (page - 1) * PAGE });
  const pages = Math.max(1, Math.ceil(total / PAGE));

  /** Every link keeps the search and filters; only the page moves. */
  const linkTo = (p: number) =>
    `/admin/members?${new URLSearchParams({
      ...(q ? { q } : {}),
      ...(filter !== 'all' ? { filter } : {}),
      ...(sort !== 'recent' ? { sort } : {}),
      page: String(p),
    })}`;

  return (
    <div className="stack" style={{ gap: 18 }}>
      <div>
        <span className="kicker">
          Data · {total.toLocaleString('en-US')} {filter === 'all' ? 'members' : FILTER_LABEL[filter].toLowerCase()}
        </span>
        <h1 className="admin__title">Members</h1>
        <p className="admin__sub">
          Everyone who has signed in with Discord. Search by Discord, Kick or Roobet name, or by who referred them. Click a name for their public
          profile.
        </p>
      </div>

      <MemberFilters
        q={q}
        filter={filter}
        sort={sort}
        filters={MEMBER_FILTERS.map((f) => ({ value: f, label: FILTER_LABEL[f] }))}
        sorts={MEMBER_SORTS.map((s) => ({ value: s, label: SORT_LABEL[s] }))}
      />

      {members.length === 0 ? (
        <div className="emptyq">{q || filter !== 'all' ? 'No members match that.' : 'No members yet — the list fills as people sign in.'}</div>
      ) : (
        <div className="card" style={{ padding: '6px 12px' }}>
          <div className="table-wrap">
            <table className="table" style={{ minWidth: 1080 }}>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Kick</th>
                  <th>Roobet</th>
                  <th>Referred by</th>
                  <th style={{ textAlign: 'right' }}>Weighted wager</th>
                  <th style={{ textAlign: 'right' }}>Watch time</th>
                  <th>Joined</th>
                  <th>Last seen</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} style={m.blocked ? { opacity: 0.6 } : undefined}>
                    <td>
                      <Link className="person-link" href={`/u/${encodeURIComponent(handleFor(m))}`}>
                        {m.discordGlobalName ?? m.discordUsername}
                      </Link>
                      {m.discordGlobalName ? <span className="meta"> @{m.discordUsername}</span> : null}{' '}
                      {m.blocked ? <span className="tag tag--danger">Blocked</span> : null}
                    </td>
                    <td>
                      <span className={`tag ${m.role === 'member' ? 'tag--neutral' : 'tag--warn'}`}>{m.role}</span>
                    </td>
                    <td className="meta">{m.kickUsername ?? '—'}</td>
                    <td>
                      {m.roobetStatus ? (
                        <span className={`tag ${m.roobetStatus === 'approved' ? 'tag--accent' : m.roobetStatus === 'pending' ? 'tag--warn' : 'tag--danger'}`}>
                          {m.roobetUsername}
                        </span>
                      ) : (
                        <span className="meta">—</span>
                      )}
                    </td>
                    <td>
                      <ReferredByField key={`${m.id}:${m.referredBy ?? ''}`} userId={m.id} value={m.referredBy} />
                    </td>
                    <td className="num" style={{ textAlign: 'right' }}>
                      {/* Null means no approved Roobet link, which isn't the same as wagering nothing under one. */}
                      {m.weighted === null ? <span className="meta">—</span> : formatUsd(m.weighted)}
                    </td>
                    <td className="num meta" style={{ textAlign: 'right' }}>
                      {m.watchMinutes ? formatMinutes(m.watchMinutes) : '—'}
                    </td>
                    <td className="meta">{shortDate(m.createdAt)}</td>
                    <td className="meta">{formatAgo(m.lastSeenAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pages > 1 ? (
        <div className="row" style={{ gap: 8 }}>
          {page > 1 ? (
            <Link className="btn btn--secondary" href={linkTo(page - 1)}>
              ← Previous
            </Link>
          ) : null}
          <span className="meta">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link className="btn btn--secondary" href={linkTo(page + 1)}>
              Next →
            </Link>
          ) : null}
        </div>
      ) : null}

      <p className="meta" style={{ maxWidth: '72ch' }}>
        Roles come from OWNER_DISCORD_IDS, ADMIN_DISCORD_IDS and MOD_DISCORD_IDS and are set again on every login, so nobody can
        grant themselves staff from inside the site. Weighted wager is lifetime, counted only under an approved Roobet link. Referred by is typed by staff — press Enter or click away to save.
      </p>
    </div>
  );
}
