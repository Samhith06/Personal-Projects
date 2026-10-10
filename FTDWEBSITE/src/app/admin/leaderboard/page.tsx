import Link from 'next/link';
import { Empty, Field, FormGrid, PageTitle, Panel } from '@/components/admin/fields';
import { ActionButton, AdminForm, DateTimeField } from '@/components/admin/kit';
import { CREW_TIME_ZONE, crewDateTimeLabel, usd } from '@/lib/format';
import { deleteLeaderboardEntry, saveBoard, saveLeaderboardEntry } from '@/server/actions/staff';
import {
  DEFAULT_LEADERBOARD_SITE,
  LEADERBOARD_SITES,
  LEADERBOARD_SITE_LABEL,
  getLeaderboard,
  isLeaderboardSite,
  type LeaderboardSite,
} from '@/server/services/content';
import { DEFAULT_PRIZE_LADDER, getLastSyncResult } from '@/server/services/leaderboard-sync';
import { iso, masterContext, param } from '../_lib';

export const metadata = { title: 'Leaderboard' };

export default async function AdminLeaderboard({ searchParams }: PageProps<'/admin/leaderboard'>) {
  await masterContext();
  const sp = await searchParams;
  const period: LeaderboardSite = isLeaderboardSite(param(sp.board)) ? (param(sp.board) as LeaderboardSite) : DEFAULT_LEADERBOARD_SITE;
  const editId = param(sp.edit);

  const { board, entries } = await getLeaderboard(period, 100);
  const editing = editId ? entries.find((e) => e.id === editId) : undefined;
  const base = `/admin/leaderboard?board=${period}`;
  const sync = getLastSyncResult()?.[period];
  const syncNote = !sync
    ? 'No sync has run since the server started.'
    : sync.ok
      ? `Last synced ${crewDateTimeLabel(sync.syncedAt)} from the ${sync.source === 'sheet' ? 'affiliate sheet' : 'Stake API'} — ${sync.entries} players.`
      : `Last sync ${crewDateTimeLabel(sync.syncedAt)} failed: ${sync.skipped ?? sync.error}`
  const apiNote = sync?.apiError && sync.source === 'sheet' ? `The Stake API failed, so the sheet was used: ${sync.apiError}` : null;

  return (
    <>
      <PageTitle
        eyebrow="Site"
        title="Wager leaderboard"
        description="Stake.com and Stake.eu are separate races with their own prizes, each pulled from its site's affiliate API. Masked handles (vi***ro) keep members anonymous in public."
      />

      <nav className="chips adm-filter" aria-label="Stake site">
        {LEADERBOARD_SITES.map((s) => (
          <Link key={s} className="chip" href={`/admin/leaderboard?board=${s}`} aria-current={s === period ? 'page' : undefined} scroll={false}>
            {LEADERBOARD_SITE_LABEL[s]}
          </Link>
        ))}
      </nav>

      <Panel title={`${LEADERBOARD_SITE_LABEL[period]} — board settings`}>
        <p className="adm-note">{syncNote}</p>
        {apiNote ? <p className="adm-note">{apiNote}</p> : null}
        <AdminForm action={saveBoard} submitLabel="Save board" key={`board-${period}`}>
          <input type="hidden" name="period" value={period} />
          <FormGrid>
            <Field name="label" label="Label" value={board?.label ?? LEADERBOARD_SITE_LABEL[period]} required />
            <Field name="subtitle" label="Subtitle" value={board?.subtitle} placeholder="Monthly race · prizes paid on the 1st" />
            <Field
              name="prizeLadder"
              label="Prizes by place ($)"
              value={board ? board.prizeLadder : DEFAULT_PRIZE_LADDER.join(',')}
              placeholder="600,250,170,120,90"
              hint={`1st, 2nd, 3rd… separated by commas. The prize pool is their total${board?.prizePool ? ` — now ${usd(board.prizePool)}` : ''}.`}
            />
            <DateTimeField
              name="startsAt"
              label="Starts (German time)"
              value={board?.customWindow ? iso(board.startsAt) : null}
              timeZone={CREW_TIME_ZONE}
              hint="Leave both empty to follow the calendar month."
            />
            <DateTimeField
              name="endsAt"
              label="Ends (German time)"
              value={board?.customWindow ? iso(board.endsAt) : null}
              timeZone={CREW_TIME_ZONE}
              hint={
                board?.endsAt
                  ? `Now running ${board.startsAt ? crewDateTimeLabel(board.startsAt) : '…'} → ${crewDateTimeLabel(board.endsAt)}${board.customWindow ? '' : ' (calendar month)'}.`
                  : 'Leave empty for an all-time board.'
              }
            />
            <Field name="totalWagered" label="Community total wagered ($)" value={board?.totalWagered ?? 0} type="number" required />
            <Field name="nextTarget" label="Next community target ($)" value={board?.nextTarget ?? 0} type="number" required />
            <Field name="nextReward" label="Next reward" value={board?.nextReward} placeholder="Unlocks a $1,000 bonus prize tier" />
          </FormGrid>
        </AdminForm>
      </Panel>

      <Panel title={editing ? `Edit rank #${editing.rank}` : 'Add a player'} action={editing ? <Link className="link-arrow" href={base} scroll={false}>Cancel</Link> : null}>
        <AdminForm
          action={saveLeaderboardEntry}
          submitLabel={editing ? 'Save row' : 'Add row'}
          doneHref={editing ? base : undefined}
          resetOnSuccess={!editing}
          key={editing?.id ?? `new-${period}`}
        >
          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
          <input type="hidden" name="period" value={period} />
          <FormGrid>
            <Field name="rank" label="Rank" value={editing?.rank ?? entries.length + 1} type="number" required />
            <Field name="username" label="Display handle" value={editing?.username} required placeholder="vi***ro" />
            <Field name="wagered" label="Wagered ($)" value={editing?.wagered} type="number" required />
            <Field name="prize" label="Prize ($)" value={editing?.prize} type="number" hint="Leave empty for no prize." />
            <Field name="movement" label="Movement" value={editing?.movement} type="number" hint="2 = up two places, -1 = down one, empty = new entry." />
          </FormGrid>
        </AdminForm>
      </Panel>

      <Panel title={`${entries.length} players`}>
        {entries.length ? (
          <div className="table-scroll">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>Wagered</th>
                  <th>Prize</th>
                  <th>Move</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className={e.id === editId ? 'is-editing' : ''}>
                    <td className="tabular">#{e.rank}</td>
                    <td>{e.username}</td>
                    <td className="tabular">{usd(e.wagered)}</td>
                    <td className="tabular">{e.prize ? usd(e.prize) : '—'}</td>
                    <td className="tabular">{e.movement === null ? 'new' : e.movement}</td>
                    <td className="adm-table__actions">
                      <Link className="btn btn--ghost btn--sm" href={`${base}&edit=${e.id}`} scroll={false}>
                        Edit
                      </Link>
                      <ActionButton action={deleteLeaderboardEntry} id={e.id} label="Delete" confirm="Confirm delete" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No standings on this board yet.</Empty>
        )}
      </Panel>
    </>
  );
}
