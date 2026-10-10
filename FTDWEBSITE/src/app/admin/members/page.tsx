import { desc, like, or, sql } from 'drizzle-orm';
import { Empty, PageTitle, Panel } from '@/components/admin/fields';
import { ActionButton } from '@/components/admin/kit';
import { Icon } from '@/components/ui/Icon';
import { dateLabel } from '@/lib/format';
import { db } from '@/server/db';
import { memberProgress, users } from '@/server/db/schema';
import { unlinkMemberKick } from '@/server/actions/staff';
import { discordAvatarUrl } from '@/server/auth/discord';
import { usd } from '@/lib/format';
import { masterContext, param } from '../_lib';

export const metadata = { title: 'Members' };

export default async function AdminMembers({ searchParams }: PageProps<'/admin/members'>) {
  const ctx = await masterContext();
  const q = param((await searchParams).q);

  const term = `%${(q ?? '').toLowerCase()}%`;
  const rows = await db
    .select({ user: users, wagered: memberProgress.totalWagered })
    .from(users)
    .leftJoin(memberProgress, sql`${memberProgress.userId} = ${users.id}`)
    .where(
      q
        ? or(
            like(sql`lower(${users.discordUsername})`, term),
            like(sql`lower(${users.discordGlobalName})`, term),
            like(sql`lower(${users.kickUsername})`, term),
            like(sql`lower(${users.stakeUsername})`, term),
            like(sql`lower(${users.stakeEuUsername})`, term),
          )
        : undefined,
    )
    .orderBy(desc(users.createdAt))
    .limit(200);

  return (
    <>
      <PageTitle
        eyebrow="Site"
        title="Members"
        description="Everyone who has signed in with Discord. Stake usernames are private — they are only visible here."
      />

      <Panel>
        <form className="adm-search" action="/admin/members">
          <label className="sr-only" htmlFor="member-search">
            Search members
          </label>
          <input id="member-search" className="input" name="q" defaultValue={q ?? ''} placeholder="Search Discord, Kick or Stake username" />
          <button className="btn btn--ghost" type="submit">
            <Icon name="eye" /> Search
          </button>
        </form>
      </Panel>

      <Panel title={`${rows.length} member${rows.length === 1 ? '' : 's'}${q ? ` matching “${q}”` : ''}`}>
        {rows.length ? (
          <div className="table-scroll">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Kick</th>
                  <th>Stake</th>
                  <th>Wagered</th>
                  <th>Joined</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map(({ user, wagered }) => (
                  <tr key={user.id}>
                    <td>
                      <span className="adm-member">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={discordAvatarUrl(user.discordId, user.discordAvatar, 48)} alt="" width={32} height={32} />
                        <span>
                          <b>{user.discordGlobalName || user.discordUsername}</b>
                          <br />
                          <span className="muted">@{user.discordUsername}</span>
                        </span>
                      </span>
                    </td>
                    <td>
                      {user.role === 'member' ? (
                        <span className="muted">Member</span>
                      ) : (
                        <span className="tag tag--gold">
                          {user.role === 'admin' ? 'Master admin' : 'Creator'}
                          {user.streamerId ? ` · ${ctx.names.get(user.streamerId) ?? user.streamerId}` : ''}
                        </span>
                      )}
                    </td>
                    <td>
                      {user.kickUsername ? (
                        <>
                          @{user.kickUsername}
                          <br />
                          <span className={user.kickVerified ? 'form-note form-note--ok' : 'muted'}>
                            {user.kickVerified ? 'Verified' : 'Unverified'}
                          </span>
                        </>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      {user.stakeUsername || user.stakeEuUsername ? (
                        <>
                          {user.stakeUsername ? <>.com {user.stakeUsername}</> : null}
                          {user.stakeUsername && user.stakeEuUsername ? <br /> : null}
                          {user.stakeEuUsername ? <>.eu {user.stakeEuUsername}</> : null}
                        </>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="tabular">{usd(wagered ?? 0)}</td>
                    <td>{dateLabel(user.createdAt, 'UTC')}</td>
                    <td className="adm-table__actions">
                      {user.kickUsername ? (
                        <ActionButton action={unlinkMemberKick} id={user.id} label="Unlink Kick" confirm="Confirm unlink" />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No members found.</Empty>
        )}
      </Panel>

      <p className="adm-note">
        Roles come from the server configuration (ADMIN_DISCORD_IDS and CREATOR_DISCORD_IDS), so nobody can promote
        themselves here. Add a Discord ID there and the role applies the next time that person signs in.
      </p>
    </>
  );
}
