import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { ChannelFilter } from '@/components/admin/ChannelFilter';
import { Empty, Field, FormGrid, PageTitle, Panel, Select, TextArea } from '@/components/admin/fields';
import { ActionButton, AdminForm, DateTimeField } from '@/components/admin/kit';
import { Icon } from '@/components/ui/Icon';
import { dateLabel, multiplier, usd } from '@/lib/format';
import { db } from '@/server/db';
import { wins } from '@/server/db/schema';
import { deleteWin, saveWin } from '@/server/actions/staff';
import { adminContext, iso, param, resolveChannel } from '../_lib';

export const metadata = { title: 'Wall of Fame' };

const KIND_OPTIONS = [
  { value: 'max-win', label: 'Max win' },
  { value: 'big-win', label: 'Big win' },
  { value: 'legendary', label: 'Legendary' },
  { value: 'community', label: 'Community moment' },
];

export default async function AdminWins({ searchParams }: PageProps<'/admin/wins'>) {
  const ctx = await adminContext();
  const sp = await searchParams;
  const channel = resolveChannel(ctx, sp.channel);
  const editId = param(sp.edit);
  const creating = sp.new === '1';

  const list = await db.select().from(wins).where(channel ? eq(wins.streamerId, channel) : undefined).orderBy(desc(wins.payout));
  const editing = editId ? list.find((w) => w.id === editId) : undefined;
  const showForm = creating || Boolean(editing);
  const suffix = channel && ctx.staff.isMaster ? `channel=${channel}` : '';
  const listHref = `/admin/wins${suffix ? `?${suffix}` : ''}`;

  return (
    <>
      <PageTitle
        eyebrow={ctx.staff.isMaster ? 'Channels' : 'My channel'}
        title="Wall of Fame"
        description="Record the biggest hits. The multiplier is worked out from the bet and payout automatically."
        action={
          !showForm ? (
            <Link className="btn btn--gold btn--sm" href={`/admin/wins?new=1${suffix ? `&${suffix}` : ''}`} scroll={false}>
              <Icon name="crown" /> Add win
            </Link>
          ) : null
        }
      />

      {ctx.staff.isMaster ? <ChannelFilter basePath="/admin/wins" channels={ctx.streamers} active={channel} /> : null}

      {showForm ? (
        <Panel title={editing ? 'Edit win' : 'Add win'} action={<Link className="link-arrow" href={listHref} scroll={false}>Cancel</Link>}>
          <AdminForm action={saveWin} submitLabel={editing ? 'Save changes' : 'Add to Wall of Fame'} doneHref={listHref} key={editing?.id ?? 'new'}>
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
            <FormGrid>
              <Select name="streamerId" label="Channel" value={editing?.streamerId ?? channel ?? ctx.channelOptions[0]?.value} options={ctx.channelOptions} disabled={!ctx.staff.isMaster} required />
              <Select name="kind" label="Type" value={editing?.kind ?? 'big-win'} options={KIND_OPTIONS} required />
              <Field name="game" label="Game" value={editing?.game} required placeholder="Wanted Dead or a Wild" />
              <Field name="provider" label="Provider" value={editing?.provider} placeholder="Hacksaw Gaming" />
              <Field name="bet" label="Bet ($)" value={editing?.bet} type="number" required />
              <Field name="payout" label="Payout ($)" value={editing?.payout} type="number" required />
              <TextArea name="description" label="What happened" value={editing?.description} rows={3} />
              <Field name="url" label="Clip link (optional)" value={editing?.url} type="url" />
              <Field name="mediaUrl" label="Video file URL (optional)" value={editing?.mediaUrl} type="url" hint="A direct .mp4 link plays in the Wall of Fame player." />
              <Field name="thumbnailUrl" label="Thumbnail image (optional)" value={editing?.thumbnailUrl} type="url" />
              <DateTimeField name="occurredAt" label="Date" value={iso(editing?.occurredAt ?? new Date())} required />
            </FormGrid>
          </AdminForm>
        </Panel>
      ) : null}

      <Panel title={`${list.length} wins`}>
        {list.length ? (
          <div className="table-scroll">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Payout</th>
                  <th>Game</th>
                  {ctx.staff.isMaster ? <th>Channel</th> : null}
                  <th>Multiplier</th>
                  <th>Date</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((w) => (
                  <tr key={w.id} className={w.id === editId ? 'is-editing' : ''}>
                    <td>
                      <b className="gold-text tabular">{usd(w.payout)}</b>
                      {w.isFeatured ? <span className="tag tag--gold adm-tag-inline">Homepage</span> : null}
                    </td>
                    <td>{w.game}</td>
                    {ctx.staff.isMaster ? <td>{ctx.names.get(w.streamerId)}</td> : null}
                    <td className="tabular">{multiplier(w.payout, w.bet)}</td>
                    <td>{dateLabel(w.occurredAt, 'UTC')}</td>
                    <td className="adm-table__actions">
                      <Link className="btn btn--ghost btn--sm" href={`/admin/wins?edit=${w.id}${suffix ? `&${suffix}` : ''}`} scroll={false}>
                        Edit
                      </Link>
                      <ActionButton action={deleteWin} id={w.id} label="Delete" confirm="Confirm delete" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No wins recorded yet.</Empty>
        )}
      </Panel>
    </>
  );
}
