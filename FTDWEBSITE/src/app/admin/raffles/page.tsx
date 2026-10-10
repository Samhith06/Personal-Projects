import Link from 'next/link';
import { asc, eq } from 'drizzle-orm';
import { ChannelFilter } from '@/components/admin/ChannelFilter';
import { Empty, Field, FormGrid, PageTitle, Panel, Select, TextArea } from '@/components/admin/fields';
import { ActionButton, AdminForm, DateTimeField } from '@/components/admin/kit';
import { Icon } from '@/components/ui/Icon';
import { dateLabel, num, usd } from '@/lib/format';
import { db } from '@/server/db';
import { raffles } from '@/server/db/schema';
import { deleteRaffle, drawRaffleWinner, saveRaffle } from '@/server/actions/staff';
import { adminContext, iso, param, resolveChannel } from '../_lib';

export const metadata = { title: 'Raffles' };

const ART_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'rig', label: 'Gaming rig' },
  { value: 'console', label: 'Console' },
  { value: 'travel', label: 'Travel' },
  { value: 'chips', label: 'Chip set' },
  { value: 'watch', label: 'Watch' },
];

const STATUS_OPTIONS = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'active', label: 'Active (open for entries)' },
  { value: 'ended', label: 'Ended' },
];

export default async function AdminRaffles({ searchParams }: PageProps<'/admin/raffles'>) {
  const ctx = await adminContext();
  const sp = await searchParams;
  const channel = resolveChannel(ctx, sp.channel);
  const editId = param(sp.edit);
  const creating = sp.new === '1';

  const list = await db.select().from(raffles).where(channel ? eq(raffles.hostId, channel) : undefined).orderBy(asc(raffles.endsAt));
  const editing = editId ? list.find((r) => r.id === editId) : undefined;
  const showForm = creating || Boolean(editing);
  const suffix = channel && ctx.staff.isMaster ? `channel=${channel}` : '';
  const listHref = `/admin/raffles${suffix ? `?${suffix}` : ''}`;

  const hostOptions = ctx.staff.isMaster ? [{ value: '', label: 'Crew-wide (no single host)' }, ...ctx.channelOptions] : ctx.channelOptions;

  return (
    <>
      <PageTitle
        eyebrow={ctx.staff.isMaster ? 'Community' : 'My channel'}
        title="Raffles"
        description="Create draws, then pick a winner at random from verified entrants when you're live."
        action={
          !showForm ? (
            <Link className="btn btn--gold btn--sm" href={`/admin/raffles?new=1${suffix ? `&${suffix}` : ''}`} scroll={false}>
              <Icon name="ticket" /> New raffle
            </Link>
          ) : null
        }
      />

      {ctx.staff.isMaster ? <ChannelFilter basePath="/admin/raffles" channels={ctx.streamers} active={channel} /> : null}

      {showForm ? (
        <Panel title={editing ? 'Edit raffle' : 'New raffle'} action={<Link className="link-arrow" href={listHref} scroll={false}>Cancel</Link>}>
          <AdminForm action={saveRaffle} submitLabel={editing ? 'Save changes' : 'Create raffle'} doneHref={listHref} key={editing?.id ?? 'new'}>
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
            <FormGrid>
              <Select name="hostId" label="Host channel" value={editing?.hostId ?? channel ?? ctx.channelOptions[0]?.value} options={hostOptions} disabled={!ctx.staff.isMaster} />
              <Select name="status" label="Status" value={editing?.status ?? 'upcoming'} options={STATUS_OPTIONS} required />
              <Field name="name" label="Raffle name" value={editing?.name} required placeholder="$1,000 Weekly Cash Drop" />
              <Field name="prize" label="Prize" value={editing?.prize} required placeholder="$1,000 cash" />
              <Field name="value" label="Prize value ($)" value={editing?.value} type="number" required />
              <Field name="requirement" label="Entry requirement" value={editing?.requirement} required placeholder="Wager $1,000+ with the FGDR affiliate this week" />
              <TextArea name="description" label="Description" value={editing?.description} rows={3} />
              <Select name="art" label="Artwork" value={editing?.art ?? 'cash'} options={ART_OPTIONS} hint="Used when no prize photo is set." />
              <Field name="imageUrl" label="Prize photo (optional)" value={editing?.imageUrl} type="url" />
              <DateTimeField name="startsAt" label="Entries open" value={iso(editing?.startsAt ?? new Date())} required />
              <DateTimeField name="endsAt" label="Draw closes" value={iso(editing?.endsAt)} required />
            </FormGrid>
          </AdminForm>
        </Panel>
      ) : null}

      <Panel title={`${list.length} raffles`}>
        {list.length ? (
          <div className="table-scroll">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Raffle</th>
                  <th>Status</th>
                  <th>Entries</th>
                  <th>Closes</th>
                  {ctx.staff.isMaster ? <th>Host</th> : null}
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.id} className={r.id === editId ? 'is-editing' : ''}>
                    <td>
                      <b>{r.name}</b>
                      <br />
                      <span className="muted">
                        {usd(r.value)}
                        {r.winnerHandle ? ` · won by @${r.winnerHandle}` : ''}
                      </span>
                    </td>
                    <td>
                      <span className={`tag ${r.status === 'active' ? 'tag--gold' : r.status === 'ended' ? 'tag--muted' : ''}`}>{r.status}</span>
                    </td>
                    <td className="tabular">{num(r.entries)}</td>
                    <td>{dateLabel(r.endsAt, 'UTC')}</td>
                    {ctx.staff.isMaster ? <td>{r.hostId ? ctx.names.get(r.hostId) : 'Crew'}</td> : null}
                    <td className="adm-table__actions">
                      {r.status !== 'ended' ? (
                        <ActionButton action={drawRaffleWinner} id={r.id} label="Draw winner" confirm="Draw now" tone="gold" icon="trophy" />
                      ) : null}
                      <Link className="btn btn--ghost btn--sm" href={`/admin/raffles?edit=${r.id}${suffix ? `&${suffix}` : ''}`} scroll={false}>
                        Edit
                      </Link>
                      <ActionButton action={deleteRaffle} id={r.id} label="Delete" confirm="Confirm delete" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No raffles yet.</Empty>
        )}
      </Panel>

      <p className="adm-note">
        Drawing a winner picks at random from entrants with a verified Kick account, marks the raffle ended and posts the
        winner to the community feed.
      </p>
    </>
  );
}
