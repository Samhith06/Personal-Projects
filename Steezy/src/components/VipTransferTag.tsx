import { env } from '@/lib/env';

/** Gold call-out row for a Roobet perk: icon tile, title, optional line, arrow. */
function PerkTag({ href, icon, title, sub, sponsored }: { href: string; icon: React.ReactNode; title: string; sub?: string; sponsored?: boolean }) {
  return (
    <a className="vip-tag" href={href} target="_blank" rel={sponsored ? 'noopener sponsored' : 'noopener'}>
      <span className="vip-tag__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="vip-tag__text">
        <b>{title}</b>
        {sub ? <span>{sub}</span> : null}
      </span>
      <span className="vip-tag__arrow" aria-hidden="true">
        →
      </span>
    </a>
  );
}

const svg = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

/** "VIP Transfers available" — links to the Discord, where the team arranges the transfer with Roobet. */
export function VipTransferTag() {
  return (
    <PerkTag
      href={env.discordInviteUrl}
      title="VIP Transfers available"
      sub="Bring your VIP status over from another casino"
      icon={
        <svg {...svg}>
          <path d="M7 7h11l-3-3M17 17H6l3 3" />
        </svg>
      }
    />
  );
}

/** "20% monthly loss back available" on Roobet under code STZY. */
export function LossBackTag() {
  return (
    <PerkTag
      href={env.roobetReferralUrl}
      sponsored
      title="20% monthly loss back available"
      sub="On Roobet with code STZY"
      icon={
        <svg {...svg}>
          <path d="M19 5L5 19" />
          <circle cx="7" cy="7" r="2.5" />
          <circle cx="17" cy="17" r="2.5" />
        </svg>
      }
    />
  );
}
