import Link from 'next/link';
import { asc, eq } from 'drizzle-orm';
import { ChannelFilter } from '@/components/admin/ChannelFilter';
import { Empty, Field, FormGrid, PageTitle, Panel, Select, TextArea } from '@/components/admin/fields';
import { ActionButton, AdminForm, DateTimeField } from '@/components/admin/kit';
import { Icon } from '@/components/ui/Icon';
import { dateLabel, num, percent, usd } from '@/lib/format';
import { db } from '@/server/db';
import { challenges } from '@/server/db/schema';
import { deleteChallenge, saveChallenge } from '@/server/actions/staff';
import { adminContext, iso, param, resolveChannel } from '../_lib';

export const metadata = { title: 'Challenges' };

const STATUS_OPTIONS = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
];

export default async function AdminChallenges({ searchParams }: PageProps<'/admin/challenges'>) {
  const ctx = await adminContext();
  const sp = await searchParams;
  const channel = resolveChannel(ctx, sp.channel);
  const editId = param(sp.edit);
  const creating = sp.new === '1';

  const list = await db.select().from(challenges).where(channel ? eq(challenges.hostId, channel) : undefined).orderBy(asc(challenges.endsAt));
  const editing = editId ? list.find((c) => c.id === editId) : undefined;
  const showForm = creating || Boolean(editing);
  const suffix = channel && ctx.staff.isMaster ? `channel=${channel}` : '';
  const listHref = `/admin/challenges${suffix ? `?${suffix}` : ''}`;
  const hostOptions = ctx.staff.isMaster ? [{ value: '', label: 'Crew-wide (no single host)' }, ...ctx.channelOptions] : ctx.channelOptions;

  const value = (c: (typeof list)[number], n: number) => (c.goalType === 'currency' ? usd(n) : num(n));

  return (
    <>
      <PageTitle
        eyebrow={ctx.staff.isMaster ? 'Community' : 'My channel'}
        title="Challenges"
        description="Community goals and races. Update the progress figure as the challenge runs."
        action={
          !showForm ? (
            <Link className="btn btn--gold btn--sm" href={`/admin/challenges?new=1${suffix ? `&${suffix}` : ''}`} scroll={false}>
              <Icon name="flag" /> New challenge
            </Link>
          ) : null
        }
      />

      {ctx.staff.isMaster ? <ChannelFilter basePath="/admin/challenges" channels={ctx.streamers} active={channel} /> : null}

      {showForm ? (
        <Panel title={editing ? 'Edit challenge' : 'New challenge'} action={<Link className="link-arrow" href={listHref} scroll={false}>Cancel</Link>}>
          <AdminForm action={saveChallenge} submitLabel={editing ? 'Save changes' : 'Create challenge'} doneHref={listHref} key={editing?.id ?? 'new'}>
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
            <FormGrid>
              <Select name="hostId" label="Host channel" value={editing?.hostId ?? channel ?? ctx.channelOptions[0]?.value} options={hostOptions} disabled={!ctx.staff.isMaster} />
              <Select name="status" label="Status" value={editing?.status ?? 'upcoming'} options={STATUS_OPTIONS} required />
              <Field name="name" label="Name" value={editing?.name} required placeholder="The Weekend Wager" />
              <Field name="prize" label="Prize" value={editing?.prize} required placeholder="$2,000 split between qualifiers" />
              <TextArea name="description" label="Description" value={editing?.description} rows={3} required />
              <Field name="goalLabel" label="Goal label" value={editing?.goalLabel ?? 'Community goal'} required />
              <Select name="goalType" label="Goal type" value={editing?.goalType ?? 'currency'} options={[{ value: 'currency', label: 'Money ($)' }, { value: 'count', label: 'Count' }]} required />
              <Field name="goalTarget" label="Target" value={editing?.goalTarget} type="number" required />
              <Field name="goalCurrent" label="Progress so far" value={editing?.goalCurrent ?? 0} type="number" required />
              <Field name="goalUnit" label="Unit (for counts)" value={editing?.goalUnit} placeholder="days / players" />
              <Field name="participants" label="Participants" value={editing?.participants ?? 0} type="number" required />
              <DateTimeField name="startsAt" label="Starts" value={iso(editing?.startsAt ?? new Date())} required />
              <DateTimeField name="endsAt" label="Ends" value={iso(editing?.endsAt)} required />
            </FormGrid>
          </AdminForm>
        </Panel>
      ) : null}

      <Panel title={`${list.length} challenges`}>
        {list.length ? (
          <div className="table-scroll">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Challenge</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Ends</th>
                  {ctx.staff.isMaster ? <th>Host</th> : null}
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.id} className={c.id === editId ? 'is-editing' : ''}>
                    <td>
                      <b>{c.name}</b>
                      {c.isFeatured ? <span className="tag tag--gold adm-tag-inline">Homepage</span> : null}
                      <br />
                      <span className="muted">{c.prize}</span>
                    </td>
                    <td>
                      <span className={`tag ${c.status === 'active' ? 'tag--gold' : c.status === 'completed' ? 'tag--success' : ''}`}>{c.status}</span>
                    </td>
                    <td className="tabular">
                      {value(c, c.goalCurrent)} / {value(c, c.goalTarget)}
                      <br />
                      <span className="muted">{Math.floor(percent(c.goalCurrent, c.goalTarget))}%</span>
                    </td>
                    <td>{dateLabel(c.endsAt, 'UTC')}</td>
                    {ctx.staff.isMaster ? <td>{c.hostId ? ctx.names.get(c.hostId) : 'Crew'}</td> : null}
                    <td className="adm-table__actions">
                      <Link className="btn btn--ghost btn--sm" href={`/admin/challenges?edit=${c.id}${suffix ? `&${suffix}` : ''}`} scroll={false}>
                        Edit
                      </Link>
                      <ActionButton action={deleteChallenge} id={c.id} label="Delete" confirm="Confirm delete" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No challenges yet.</Empty>
        )}
      </Panel>
    </>
  );
}
