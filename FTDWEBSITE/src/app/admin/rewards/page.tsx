import Link from 'next/link';
import { Empty, Field, FormGrid, PageTitle, Panel } from '@/components/admin/fields';
import { ActionButton, AdminForm } from '@/components/admin/kit';
import { Icon } from '@/components/ui/Icon';
import { usd } from '@/lib/format';
import { deleteMilestone, saveMilestone } from '@/server/actions/staff';
import { getMilestones } from '@/server/services/content';
import { masterContext, param } from '../_lib';

export const metadata = { title: 'VIP rewards' };

export default async function AdminRewards({ searchParams }: PageProps<'/admin/rewards'>) {
  await masterContext();
  const editId = param((await searchParams).edit);

  const tiers = await getMilestones();
  const editing = editId ? tiers.find((t) => t.id === editId) : undefined;

  return (
    <>
      <PageTitle
        eyebrow="Site"
        title="VIP rewards"
        description="The monthly wager ladder. Each tier is a wager target and the cash it pays — order them smallest to largest."
        action={
          <Link className="btn btn--ghost btn--sm" href="/rewards" target="_blank">
            View the ladder <Icon name="external" />
          </Link>
        }
      />

      <Panel
        title={editing ? `Edit ${editing.name}` : 'Add a tier'}
        action={
          editing ? (
            <Link className="link-arrow" href="/admin/rewards" scroll={false}>
              Cancel
            </Link>
          ) : null
        }
      >
        <AdminForm
          action={saveMilestone}
          submitLabel={editing ? 'Save tier' : 'Add tier'}
          doneHref={editing ? '/admin/rewards' : undefined}
          resetOnSuccess={!editing}
          key={editing?.id ?? 'new'}
        >
          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
          <FormGrid>
            <Field name="name" label="Tier name" value={editing?.name} required placeholder="Gold" />
            <Field
              name="threshold"
              label="Monthly wager required ($)"
              value={editing?.threshold}
              type="number"
              inputMode="decimal"
              required
            />
            <Field
              name="cashReward"
              label="Cash reward ($)"
              value={editing?.cashReward || ''}
              type="number"
              inputMode="decimal"
              hint="The big number on the tier card."
            />
            <Field name="reward" label="Reward description" value={editing?.reward} required placeholder="$100 cash reward" />
            <Field
              name="perk"
              label="Extra perk"
              value={editing?.perk}
              placeholder="Your own VIP host in the FGDR Discord"
              hint="Optional. Shown as a highlighted line on the tier."
            />
            <Field name="sortOrder" label="Order" value={editing?.sortOrder ?? tiers.length + 1} type="number" required />
          </FormGrid>
        </AdminForm>
      </Panel>

      <Panel title={`${tiers.length} tiers`}>
        {tiers.length ? (
          <div className="table-scroll">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Tier</th>
                  <th>Monthly wager</th>
                  <th>Cash</th>
                  <th>Perk</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {tiers.map((t, i) => (
                  <tr key={t.id} className={t.id === editId ? 'is-editing' : ''}>
                    <td className="tabular muted">{i + 1}</td>
                    <td>
                      <b>{t.name}</b>
                    </td>
                    <td className="tabular">{usd(t.threshold)}</td>
                    <td className="tabular gold-text">{t.cashReward > 0 ? usd(t.cashReward) : t.reward}</td>
                    <td className="muted">{t.perk || '—'}</td>
                    <td className="adm-table__actions">
                      <Link className="btn btn--ghost btn--sm" href={`/admin/rewards?edit=${t.id}`} scroll={false}>
                        Edit
                      </Link>
                      <ActionButton action={deleteMilestone} id={t.id} label="Delete" confirm="Confirm delete" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No reward tiers yet.</Empty>
        )}
      </Panel>
    </>
  );
}
