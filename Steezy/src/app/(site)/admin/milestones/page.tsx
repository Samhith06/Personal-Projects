import type { Metadata } from 'next';
import { asc } from 'drizzle-orm';
import { Flash, type FlashParams } from '@/components/admin/Flash';
import { saveMilestone } from '@/server/actions/admin';
import { db } from '@/server/db';
import { milestones } from '@/server/db/schema';

export const metadata: Metadata = { title: 'Milestones' };

type Tier = typeof milestones.$inferSelect;

function TierForm({ tier }: { tier?: Tier }) {
  const key = tier?.id ?? 'new';
  return (
    <form action={saveMilestone} className="admin-row">
      {tier ? <input type="hidden" name="id" value={tier.id} /> : null}
      <div className="field" style={{ flex: '1 1 160px' }}>
        <label htmlFor={`name-${key}`}>Name</label>
        <input id={`name-${key}`} name="name" className="input" defaultValue={tier?.name} required />
      </div>
      <div className="field" style={{ flex: '1 1 140px' }}>
        <label htmlFor={`threshold-${key}`}>Lifetime wager ($)</label>
        <input id={`threshold-${key}`} name="threshold" type="number" min="1" step="1" className="input" defaultValue={tier?.threshold} required />
      </div>
      <div className="field" style={{ flex: '1 1 120px' }}>
        <label htmlFor={`reward-${key}`}>Reward ($)</label>
        <input id={`reward-${key}`} name="reward" type="number" min="0" step="1" className="input" defaultValue={tier?.reward} required />
      </div>
      <label className="check" style={{ alignSelf: 'flex-end', minHeight: 36 }}>
        <input type="checkbox" name="active" defaultChecked={tier?.active ?? true} />
        Active
      </label>
      <button className={tier ? 'btn btn--secondary' : 'btn btn--primary'} type="submit" style={{ alignSelf: 'flex-end' }}>
        {tier ? 'Save' : 'Add tier'}
      </button>
    </form>
  );
}

export default async function MilestonesAdmin({ searchParams }: { searchParams: FlashParams }) {
  const flash = await searchParams;
  const tiers = await db.select().from(milestones).orderBy(asc(milestones.threshold));

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <span className="kicker">Stream games</span>
        <h1 className="admin__title">Milestone tiers</h1>
        <p className="meta">
          Members claim a tier once their lifetime STZY wager reaches it. Turning a tier off hides it; existing claims stay in
          Payouts.
        </p>
      </div>
      <Flash {...flash} />
      <section className="card">
        {tiers.map((t) => (
          <TierForm key={t.id} tier={t} />
        ))}
        <TierForm />
      </section>
    </div>
  );
}
