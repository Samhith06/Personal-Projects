import Link from 'next/link';
import { desc, eq, sql } from 'drizzle-orm';
import { ChannelFilter } from '@/components/admin/ChannelFilter';
import { Empty, Field, FormGrid, PageTitle, Panel, Select } from '@/components/admin/fields';
import { ActionButton, AdminForm, DateTimeField } from '@/components/admin/kit';
import { Icon } from '@/components/ui/Icon';
import { dateLabel, num, usd } from '@/lib/format';
import { GIVEAWAY_KIND_OPTIONS, giveawayKindLabel } from '@/lib/giveaways';
import { db } from '@/server/db';
import { giveaways } from '@/server/db/schema';
import { deleteGiveaway, saveGiveaway, saveGiveawaySettings } from '@/server/actions/staff';
import { getSiteSettings } from '@/server/services/content';
import { adminContext, iso, param, resolveChannel } from '../_lib';

export const metadata = { title: 'Giveaways' };

export default async function AdminGiveaways({ searchParams }: PageProps<'/admin/giveaways'>) {
  const ctx = await adminContext();
  const sp = await searchParams;
  const channel = resolveChannel(ctx, sp.channel);
  const editId = param(sp.edit);

  const [list, [totals], settings] = await Promise.all([
    db
      .select()
      .from(giveaways)
      .where(channel ? eq(giveaways.streamerId, channel) : undefined)
      .orderBy(desc(giveaways.occurredAt))
      .limit(200),
    db
      .select({ total: sql<number>`coalesce(sum(${giveaways.amount}), 0)`, count: sql<number>`count(*)` })
      .from(giveaways)
      .where(channel ? eq(giveaways.streamerId, channel) : undefined),
    getSiteSettings(),
  ]);

  const editing = editId ? list.find((g) => g.id === editId) : undefined;
  const suffix = channel && ctx.staff.isMaster ? `channel=${channel}` : '';
  const listHref = `/admin/giveaways${suffix ? `?${suffix}` : ''}`;

  const logged = Number(totals?.total ?? 0);
  const hostOptions = ctx.staff.isMaster
    ? [{ value: '', label: 'Crew-wide (no single channel)' }, ...ctx.channelOptions]
    : ctx.channelOptions;

  return (
    <>
      <PageTitle
        eyebrow={ctx.staff.isMaster ? 'Community' : 'My channel'}
        title="Giveaways"
        description="Every payout logged here feeds the giveaway board — the big total and the last-winners slider."
        action={
          <Link className="btn btn--ghost btn--sm" href="/giveaways" target="_blank">
            View the board <Icon name="external" />
          </Link>
        }
      />

      {ctx.staff.isMaster ? <ChannelFilter basePath="/admin/giveaways" channels={ctx.streamers} active={channel} /> : null}

      <ul className="adm-tiles">
        <li>
          <span className="adm-tile">
            <Icon name="gift" />
            <span className="adm-tile__value tabular">{usd(logged)}</span>
            <span className="adm-tile__label">Logged{channel ? ' on this channel' : ''}</span>
          </span>
        </li>
        <li>
          <span className="adm-tile">
            <Icon name="users" />
            <span className="adm-tile__value tabular">{num(Number(totals?.count ?? 0))}</span>
            <span className="adm-tile__label">Payouts</span>
          </span>
        </li>
        {ctx.staff.isMaster ? (
          <li>
            <span className="adm-tile">
              <Icon name="trophy" />
              <span className="adm-tile__value tabular">{usd(settings.giveawayBaseline + logged)}</span>
              <span className="adm-tile__label">Shown on the board</span>
            </span>
          </li>
        ) : null}
      </ul>

      <Panel
        title={editing ? `Edit ${editing.winnerHandle}` : 'Log a giveaway'}
        description="Winner and amount are all you need — everything else is optional."
        action={
          editing ? (
            <Link className="link-arrow" href={listHref} scroll={false}>
              Cancel
            </Link>
          ) : null
        }
      >
        <AdminForm
          action={saveGiveaway}
          submitLabel={editing ? 'Save giveaway' : 'Log giveaway'}
          doneHref={editing ? listHref : undefined}
          resetOnSuccess={!editing}
          key={editing?.id ?? 'new'}
        >
          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
          <FormGrid>
            <Field name="winnerHandle" label="Winner" value={editing?.winnerHandle} required placeholder="sunny" />
            <Field
              name="amount"
              label="Amount ($)"
              value={editing?.amount}
              type="number"
              inputMode="decimal"
              required
              hint="Cents are fine — 0.20 works just as well as 250."
            />
            <Select name="kind" label="Type" value={editing?.kind ?? 'tip'} options={GIVEAWAY_KIND_OPTIONS} />
            <Select
              name="streamerId"
              label="From channel"
              value={editing?.streamerId ?? channel ?? ctx.channelOptions[0]?.value}
              options={hostOptions}
              disabled={!ctx.staff.isMaster}
            />
            <Field name="note" label="Note" value={editing?.note} placeholder="Viewer-picked bonus buy" />
            <DateTimeField name="occurredAt" label="When" value={iso(editing?.occurredAt ?? new Date())} required />
          </FormGrid>
        </AdminForm>
      </Panel>

      {ctx.staff.isMaster ? (
        <Panel
          title="Board settings"
          description="Anything the crew gave away before this page existed. It is added to the logged payouts to make the headline number."
        >
          <AdminForm action={saveGiveawaySettings} submitLabel="Save board settings">
            <FormGrid>
              <Field
                name="giveawayBaseline"
                label="Starting total ($)"
                value={settings.giveawayBaseline || ''}
                type="number"
                inputMode="decimal"
                hint="Leave empty for zero."
              />
              <Field
                name="giveawayNote"
                label="Note under the total"
                value={settings.giveawayNote}
                placeholder="Since January 2026"
              />
            </FormGrid>
          </AdminForm>
        </Panel>
      ) : null}

      <Panel title={`${list.length} logged`}>
        {list.length ? (
          <div className="table-scroll">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Winner</th>
                  <th>Amount</th>
                  <th>Type</th>
                  {ctx.staff.isMaster ? <th>Channel</th> : null}
                  <th>When</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((g) => (
                  <tr key={g.id} className={g.id === editId ? 'is-editing' : ''}>
                    <td>
                      <b>{g.winnerHandle}</b>
                      {g.note ? (
                        <>
                          <br />
                          <span className="muted">{g.note}</span>
                        </>
                      ) : null}
                    </td>
                    <td className="tabular gold-text">{usd(g.amount)}</td>
                    <td>{giveawayKindLabel(g.kind)}</td>
                    {ctx.staff.isMaster ? <td>{g.streamerId ? (ctx.names.get(g.streamerId) ?? '—') : 'Crew'}</td> : null}
                    <td>{dateLabel(g.occurredAt, 'UTC')}</td>
                    <td className="adm-table__actions">
                      <Link className="btn btn--ghost btn--sm" href={`/admin/giveaways?edit=${g.id}${suffix ? `&${suffix}` : ''}`} scroll={false}>
                        Edit
                      </Link>
                      <ActionButton action={deleteGiveaway} id={g.id} label="Delete" confirm="Confirm delete" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>Nothing logged yet. Add the first payout and the board comes to life.</Empty>
        )}
      </Panel>
    </>
  );
}
