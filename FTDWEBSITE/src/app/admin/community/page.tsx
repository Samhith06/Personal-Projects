import Link from 'next/link';
import { Empty, Field, FormGrid, PageTitle, Panel, Select } from '@/components/admin/fields';
import { ActionButton, AdminForm } from '@/components/admin/kit';
import { formatValue, relativeTime } from '@/lib/format';
import {
  deleteActivityItem,
  deleteCommunityStat,
  saveActivityItem,
  saveCommunityStat,
} from '@/server/actions/staff';
import { getActivity, getCommunityStats } from '@/server/services/content';
import { masterContext, param } from '../_lib';

export const metadata = { title: 'Community' };

const TYPE_OPTIONS = [
  { value: 'update', label: 'Community update' },
  { value: 'winner', label: 'Raffle winner' },
  { value: 'leaderboard', label: 'Leaderboard' },
  { value: 'stream', label: 'Stream' },
  { value: 'challenge', label: 'Challenge' },
  { value: 'fame', label: 'Wall of Fame' },
];

export default async function AdminCommunity({ searchParams }: PageProps<'/admin/community'>) {
  await masterContext();
  const editKey = param((await searchParams).edit);

  const [stats, feed] = await Promise.all([getCommunityStats(), getActivity(30)]);
  const editing = editKey ? stats.find((s) => s.key === editKey) : undefined;

  return (
    <>
      <PageTitle
        eyebrow="Site"
        title="Community"
        description="The counters on the Community page and the activity feed shown there and on the homepage."
      />

      <Panel
        title={editing ? `Edit ${editing.label}` : 'Add or update a statistic'}
        description="Counters animate as visitors scroll. Use the same key to overwrite an existing one."
        action={editing ? <Link className="link-arrow" href="/admin/community" scroll={false}>Cancel</Link> : null}
      >
        <AdminForm
          action={saveCommunityStat}
          submitLabel={editing ? 'Save statistic' : 'Add statistic'}
          doneHref={editing ? '/admin/community' : undefined}
          resetOnSuccess={!editing}
          key={editing?.key ?? 'new-stat'}
        >
          <FormGrid>
            <Field name="key" label="Key" value={editing?.key} required placeholder="totalWager" hint="Internal name — letters, numbers, underscores." />
            <Field name="label" label="Label" value={editing?.label} required placeholder="Total community wager" />
            <Field name="value" label="Value" value={editing?.value} type="number" required />
            <Select name="format" label="Format" value={editing?.format ?? 'number'} options={[{ value: 'currency', label: 'Money ($)' }, { value: 'number', label: 'Plain number' }]} required />
            <Field name="sortOrder" label="Order" value={editing?.sortOrder ?? stats.length + 1} type="number" required />
          </FormGrid>
        </AdminForm>
      </Panel>

      <Panel title={`${stats.length} statistics`}>
        {stats.length ? (
          <div className="table-scroll">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Value</th>
                  <th>Key</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.key} className={s.key === editKey ? 'is-editing' : ''}>
                    <td>
                      <b>{s.label}</b>
                    </td>
                    <td className="tabular">{formatValue(s.value, s.format)}</td>
                    <td className="muted">{s.key}</td>
                    <td className="adm-table__actions">
                      <Link className="btn btn--ghost btn--sm" href={`/admin/community?edit=${s.key}`} scroll={false}>
                        Edit
                      </Link>
                      <ActionButton action={deleteCommunityStat} id={s.key} label="Delete" confirm="Confirm delete" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No statistics yet.</Empty>
        )}
      </Panel>

      <Panel title="Post to the activity feed" description="Most entries are added automatically when you publish content or draw a winner.">
        <AdminForm action={saveActivityItem} submitLabel="Post update" resetOnSuccess key="new-activity">
          <FormGrid>
            <Select name="type" label="Type" value="update" options={TYPE_OPTIONS} required />
            <Field name="tag" label="Label" value="Community" required />
            <Field name="title" label="Message" required placeholder="The VIP lounge is now open to First Chip members" />
            <Field name="href" label="Link" type="url" placeholder="/milestones" />
          </FormGrid>
        </AdminForm>
      </Panel>

      <Panel title={`Activity feed (${feed.length})`}>
        {feed.length ? (
          <ul className="adm-list">
            {feed.map((a) => (
              <li key={a.id}>
                <span className="adm-list__main">
                  <b>{a.title}</b>
                  <span>
                    {a.tag} · {relativeTime(a.occurredAt)}
                  </span>
                </span>
                <ActionButton action={deleteActivityItem} id={a.id} label="Remove" confirm="Confirm remove" />
              </li>
            ))}
          </ul>
        ) : (
          <Empty>The feed is empty.</Empty>
        )}
      </Panel>
    </>
  );
}
