import Link from 'next/link';
import { CopyField } from '@/components/admin/CopyField';
import { FormGrid } from '@/components/admin/fields';
import { siteUrl } from '@/lib/env';

/**
 * A channel's three OBS overlay links, each with a copy button. The links
 * belong to the channel, not a hunt, so they are set up in OBS once and keep
 * working for every hunt after.
 */
export function OverlayLinks({ channel }: { channel: string }) {
  const url = (view?: string) => siteUrl(`/overlay/bonus-hunt/${channel}${view ? `?view=${view}` : ''}`);
  return (
    <FormGrid>
      <CopyField label="Full board" value={url()} hint="Suggested size 420 × 720. Add &rows=12 to the link to show more bonuses at once." />
      <CopyField label="Stats bar" value={url('bar')} hint="Suggested size 1280 × 110. One line of figures for the top or bottom of the screen." />
      <CopyField label="Now opening" value={url('current')} hint="Suggested size 480 × 280. The bonus being opened, with the last result under it." />
    </FormGrid>
  );
}

/** Hunts / History switch shared by the bonus hunt admin pages. */
export function HuntTabs({ current }: { current: 'hunts' | 'history' }) {
  return (
    <nav className="chips adm-filter" aria-label="Bonus hunt sections">
      <Link className="chip" href="/admin/bonus-hunts" aria-current={current === 'hunts' ? 'page' : undefined}>
        Hunts
      </Link>
      <Link className="chip" href="/admin/bonus-hunts/history" aria-current={current === 'history' ? 'page' : undefined}>
        History
      </Link>
    </nav>
  );
}

export const STATUS_LABEL: Record<string, string> = {
  collecting: 'Collecting bonuses',
  guessing: 'Guess the balance',
  opening: 'Opening',
  complete: 'Finished',
};

/** One figure, in the dashboard's tile style but not a link. */
export function HuntTile({ label, value, tone }: { label: string; value: string; tone?: 'up' | 'down' }) {
  return (
    <li className="adm-tile adm-tile--static">
      <span className={`adm-tile__value tabular${tone ? ` hunt-${tone}` : ''}`}>{value}</span>
      <span className="adm-tile__label">{label}</span>
    </li>
  );
}

/** Where a hunt is: set up, collect, guess the balance, open, done. Setup is behind every hunt that exists. */
export function HuntSteps({ status }: { status: string }) {
  const steps = ['setup', 'collecting', 'guessing', 'opening', 'complete'];
  const at = steps.indexOf(status);
  return (
    <ol className="adm-steps">
      {steps.map((s, i) => (
        <li key={s} className={i < at ? 'is-done' : i === at ? 'is-current' : undefined}>
          <span>{i < at ? '✓' : i + 1}</span>
          {s === 'setup' ? 'Setup' : STATUS_LABEL[s]}
        </li>
      ))}
    </ol>
  );
}
