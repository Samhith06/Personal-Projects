import Link from 'next/link';
import { Empty, PageTitle, Panel } from '@/components/admin/fields';
import { Icon } from '@/components/ui/Icon';
import { crewDateTimeLabel, usd } from '@/lib/format';
import { getStakeUsers, type StakeUserRow } from '@/server/services/stake-users';
import { masterContext, param } from '../_lib';

export const metadata = { title: 'Stake users' };

const SORTS = { lifetime: 'Lifetime', month: 'This month', week: 'This week' } as const;
type Sort = keyof typeof SORTS;

/** `2026-09-15` -> `15 Sept 2026` without a timezone shift. */
const dayLabel = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export default async function AdminStakeUsers({ searchParams }: PageProps<'/admin/stake-users'>) {
  await masterContext();
  const sp = await searchParams;
  const q = param(sp.q)?.toLowerCase();
  const sort: Sort = (param(sp.sort) ?? '') in SORTS ? (param(sp.sort) as Sort) : 'lifetime';

  const { players, starts, trackingSince } = await getStakeUsers();
  const shown = players
    .filter((p) => !q || p.username.toLowerCase().includes(q) || p.member?.name.toLowerCase().includes(q))
    .sort((a, b) => b[sort] - a[sort]);
  const total = (key: Sort) => players.reduce((s, p) => s + p[key], 0);
  const href = (s: Sort) => `/admin/stake-users?sort=${s}${q ? `&q=${encodeURIComponent(q)}` : ''}`;

  return (
    <>
      <PageTitle
        eyebrow="Site"
        title="Stake users"
        description={`Everyone wagering under the crew's code, on Stake.com and Stake.eu. Weeks run Monday–Sunday and months by calendar, in German time.${
          trackingSince ? ` Tracked since ${dayLabel(trackingSince)} — wagers before that are not in these totals.` : ''
        }`}
      />

      <ul className="adm-tiles">
        {[
          { label: 'Stake users', value: String(players.length), icon: 'users' as const },
          { label: `This week · since ${dayLabel(starts.week)}`, value: usd(total('week')), icon: 'calendar' as const },
          { label: 'This month', value: usd(total('month')), icon: 'chart' as const },
          { label: 'Lifetime', value: usd(total('lifetime')), icon: 'trophy' as const },
        ].map((t) => (
          <li key={t.label}>
            <div className="adm-tile">
              <Icon name={t.icon} />
              <span className="adm-tile__value tabular">{t.value}</span>
              <span className="adm-tile__label">{t.label}</span>
            </div>
          </li>
        ))}
      </ul>

      <Panel>
        <form className="adm-search" action="/admin/stake-users">
          <input type="hidden" name="sort" value={sort} />
          <label className="sr-only" htmlFor="stake-search">
            Search Stake users
          </label>
          <input id="stake-search" className="input" name="q" defaultValue={q ?? ''} placeholder="Search Stake username or member" />
          <button className="btn btn--ghost" type="submit">
            <Icon name="eye" /> Search
          </button>
        </form>
      </Panel>

      <nav className="chips adm-filter" aria-label="Sort by">
        {(Object.keys(SORTS) as Sort[]).map((s) => (
          <Link key={s} className="chip" href={href(s)} aria-current={s === sort ? 'page' : undefined} scroll={false}>
            {SORTS[s]}
          </Link>
        ))}
      </nav>

      <Panel title={`${shown.length} Stake user${shown.length === 1 ? '' : 's'}${q ? ` matching “${q}”` : ''}`}>
        {shown.length ? (
          <div className="table-scroll">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Stake user</th>
                  <th>Site member</th>
                  <th>This week</th>
                  <th>This month</th>
                  <th>Lifetime</th>
                  <th>Last update</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((p: StakeUserRow, i) => (
                  <tr key={p.username}>
                    <td className="tabular">{i + 1}</td>
                    <td>
                      <b>{p.username}</b>
                    </td>
                    <td>{p.member ? p.member.name : <span className="muted">—</span>}</td>
                    <td className="tabular">{usd(p.week)}</td>
                    <td className="tabular">{usd(p.month)}</td>
                    <td className="tabular">{usd(p.lifetime)}</td>
                    <td className="muted">{p.lastSeen ? crewDateTimeLabel(p.lastSeen) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>{q ? 'Nobody matches that search.' : 'No Stake users yet — they appear after the next leaderboard sync.'}</Empty>
        )}
      </Panel>
    </>
  );
}
