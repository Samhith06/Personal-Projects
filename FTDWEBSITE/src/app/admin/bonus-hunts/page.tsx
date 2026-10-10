import Link from 'next/link';
import { Field, FormGrid, PageTitle, Panel, Select } from '@/components/admin/fields';
import { AdminForm } from '@/components/admin/kit';
import { Icon } from '@/components/ui/Icon';
import { dateLabel, usd } from '@/lib/format';
import { startBonusHunt } from '@/server/actions/staff';
import { getHuntsForAdmin, isLiveStatus } from '@/server/services/bonus-hunt';
import { adminContext, param } from '../_lib';
import { HuntTabs, OverlayLinks, STATUS_LABEL } from './_parts';

export const metadata = { title: 'Bonus hunts' };

/**
 * Step one: start a hunt. Running it — chat calls, bonuses, the opening —
 * happens on the hunt's own page, which starting one leads straight to.
 */
export default async function AdminBonusHunts({ searchParams }: PageProps<'/admin/bonus-hunts'>) {
  const { staff, channelOptions, names } = await adminContext();
  const sp = await searchParams;
  const hunts = await getHuntsForAdmin(staff.isMaster ? undefined : (staff.ownChannel ?? '__none__'));
  const live = hunts.filter((h) => isLiveStatus(h.status));

  // Overlays belong to a channel, not a hunt: set them up once and every hunt shows in them.
  // A master admin can pick any channel's links (`?overlays=`); a creator only has their own.
  const requested = param(sp.overlays);
  const overlayChannel =
    (requested && channelOptions.some((c) => c.value === requested) ? requested : undefined) ??
    staff.ownChannel ??
    channelOptions[0]?.value;

  return (
    <>
      <PageTitle
        eyebrow="Bonus hunts"
        title="Bonus hunts"
        description="Set up a hunt and start it. Chat calls slots with !sr while you collect, then guesses the final balance with !guess before you open."
        action={
          <Link className="btn btn--ghost btn--sm" href="/bonus-hunt" target="_blank">
            View the board <Icon name="external" />
          </Link>
        }
      />

      <HuntTabs current="hunts" />

      {live.length ? (
        <Panel title="Running now" description="Pick up where you left off.">
          <ul className="adm-list">
            {live.map((h) => (
              <li key={h.id}>
                <Link className="adm-hunt-link" href={`/admin/bonus-hunts/${h.id}`}>
                  <span className="adm-list__main">
                    <strong>{h.title}</strong>
                    <span className="muted">
                      {names.get(h.streamerId) ?? h.streamerId} · {STATUS_LABEL[h.status]} · {h.stats.opened}/{h.stats.total} opened ·{' '}
                      {usd(h.startBalance)} start
                    </span>
                  </span>
                  <span className="btn btn--gold btn--sm">
                    Continue <Icon name="arrow-right" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <Panel
        title="Start a new hunt"
        description="Give it a name and what it's funded with. As soon as it starts, viewers can call slots with !sr in your Kick chat."
      >
        <AdminForm action={startBonusHunt} submitLabel="Start hunt">
          <FormGrid>
            <Field name="title" label="Title" required placeholder="Friday night bonus hunt" />
            <Select name="streamerId" label="Channel" options={channelOptions} value={staff.ownChannel ?? undefined} />
            <Field
              name="startBalance"
              label="Start balance ($)"
              required
              placeholder="1000"
              inputMode="decimal"
              hint="What the hunt has to win back."
            />
          </FormGrid>
        </AdminForm>
      </Panel>

      {hunts.some((h) => h.status === 'complete') ? (
        <Panel
          title="Recently finished"
          action={
            <Link className="link-arrow" href="/admin/bonus-hunts/history">
              Full history
            </Link>
          }
        >
          <ul className="adm-list">
            {hunts
              .filter((h) => h.status === 'complete')
              .slice(0, 5)
              .map((h) => (
                <li key={h.id}>
                  <Link className="adm-hunt-link" href={`/admin/bonus-hunts/${h.id}`}>
                    <span className="adm-list__main">
                      <strong>{h.title}</strong>
                      <span className="muted">
                        {names.get(h.streamerId) ?? h.streamerId} · {dateLabel(h.endedAt ?? h.startedAt)} · {h.stats.total} bonuses
                      </span>
                    </span>
                    <span className={h.stats.profit >= 0 ? 'hunt-up' : 'hunt-down'}>
                      {h.stats.profit >= 0 ? '+' : '−'}
                      {usd(Math.abs(h.stats.profit))}
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        </Panel>
      ) : null}

      {overlayChannel ? (
        <section id="overlays">
          <Panel
            title={`Stream overlays for ${names.get(overlayChannel) ?? overlayChannel}`}
            description="Add these in OBS as a Browser source, once. They follow whichever hunt this channel is running, keep a finished hunt on screen for an hour, and show nothing between hunts."
          >
            {channelOptions.length > 1 ? (
              <nav className="chips adm-filter" aria-label="Whose overlays">
                {channelOptions.map((c) => (
                  <Link
                    key={c.value}
                    className="chip"
                    href={`/admin/bonus-hunts?overlays=${c.value}#overlays`}
                    aria-current={c.value === overlayChannel ? 'page' : undefined}
                    scroll={false}
                  >
                    {c.label}
                  </Link>
                ))}
              </nav>
            ) : null}
            <OverlayLinks channel={overlayChannel} />
          </Panel>
        </section>
      ) : null}
    </>
  );
}
