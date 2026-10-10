import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import { ExternalLink } from '@/components/ui/primitives';
import { CONTENT_NAV, LEGAL_NAV, PRIMARY_NAV, SECONDARY_NAV } from '@/lib/nav';
import type { SiteSettings, Streamer } from '@/server/db/schema';

export function SiteFooter({
  logo,
  streamers,
  settings,
}: {
  logo: ReactNode;
  streamers: Streamer[];
  settings: SiteSettings;
}) {
  const year = new Date().getFullYear();

  const socials: [Parameters<typeof Icon>[0]['name'], string, string][] = [
    ['discord', settings.discordUrl, 'Discord'],
    ['kick', 'https://www.kick.com/fatguysdontrun', 'Kick'],
    ['x', settings.xUrl, 'X'],
    ['instagram', settings.instagramUrl, 'Instagram'],
    ['youtube', settings.youtubeUrl, 'YouTube'],
  ];

  return (
    <footer className="site-footer">
      <div className="site-footer__glow" aria-hidden="true" />

      <div className="container">
        <div className="site-footer__cta">
          <div>
            <p className="eyebrow">Members club</p>
            <p className="site-footer__cta-title">
              Join the <span className="gold-text">FGDR</span> community
            </p>
          </div>
          <div className="site-footer__cta-actions">
            <Link className="btn btn--discord btn--lg" href="/login">
              <Icon name="discord" />
              Login with Discord
            </Link>
            <a className="btn btn--ghost btn--lg" href="https://www.kick.com/fatguysdontrun" target="_blank" rel="noopener noreferrer">
              <Icon name="kick" />
              Follow on Kick
            </a>
          </div>
        </div>

        <hr className="hairline" />

        <div className="site-footer__top">
          <div className="site-footer__brand">
            {logo}
            <div>
              <p className="site-footer__word">FGDR</p>
              <p className="site-footer__full">FatGuysDontRun</p>
              <p className="site-footer__line">One crew. Every creator. One community.</p>
            </div>
            <ul className="socials">
              {socials.map(([icon, url, label]) => (
                <li key={icon}>
                  <ExternalLink href={url} className={`social social--${icon}`} label={`FGDR on ${label}`}>
                    <Icon name={icon} />
                  </ExternalLink>
                </li>
              ))}
            </ul>
          </div>

          <div className="site-footer__cols">
            <nav aria-label="The crew">
              <p className="site-footer__h">The crew</p>
              <ul>
                {streamers.map((s) => (
                  <li key={s.id}>
                    <Link href={`/streamers/${s.id}`}>{s.displayName}</Link>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label="Explore">
              <p className="site-footer__h">Explore</p>
              <ul>
                {[...PRIMARY_NAV, ...CONTENT_NAV].map((n) => (
                  <li key={n.href}>
                    <Link href={n.href}>{n.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label="Community">
              <p className="site-footer__h">Community</p>
              <ul>
                {SECONDARY_NAV.map((n) => (
                  <li key={n.href}>
                    <Link href={n.href}>{n.label}</Link>
                  </li>
                ))}
                <li>
                  <Link href="/dashboard">Member dashboard</Link>
                </li>
                <li>
                  <ExternalLink href={settings.discordUrl}>Discord server</ExternalLink>
                </li>
              </ul>
            </nav>
            <nav aria-label="Legal">
              <p className="site-footer__h">Legal</p>
              <ul>
                {LEGAL_NAV.map((n) => (
                  <li key={n.href}>
                    <Link href={n.href}>{n.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        <section className="gamble-banner" aria-labelledby="gamble-responsibly">
          <div className="gamble-banner__head">
            <span className="gamble-banner__icon" aria-hidden="true">
              <Icon name="shield" />
            </span>
            <div>
              <h2 className="gamble-banner__title" id="gamble-responsibly">
                Gamble responsibly
              </h2>
              <p className="gamble-banner__line">Gambling is entertainment, never a way to make money.</p>
            </div>
          </div>
          <ul className="gamble-banner__tips">
            <li>Set a budget and a time limit</li>
            <li>Never chase losses</li>
            <li>Only play with money you can afford to lose</li>
            <li>Take regular breaks</li>
          </ul>
          <div className="gamble-banner__links">
            <a className="btn btn--ghost btn--sm" href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer">
              BeGambleAware.org
              <Icon name="external" />
            </a>
            <a className="btn btn--ghost btn--sm" href="tel:18004262537">
              1-800-GAMBLER
            </a>
            <Link className="link-arrow" href="/legal/responsible-gambling">
              Responsible gambling
              <Icon name="arrow-right" />
            </Link>
          </div>
        </section>

        <div className="site-footer__legal">
          <div className="age-badge" role="img" aria-label="18 plus only">
            <b>18+</b>
            <span>Only</span>
          </div>
          <div className="site-footer__disclaimer">
            <p>
              <strong>Play responsibly.</strong> Gambling involves real financial risk and can be addictive. Outcomes are
              never guaranteed, the wins shown on this site are rare and not typical, and most sessions lose money. Only
              gamble with money you can afford to lose, set limits, and take breaks.
            </p>
            <p>
              You must be 18+ (or the legal age in your jurisdiction, if higher) to gamble. Online gambling is restricted
              or illegal in some regions — it is your responsibility to check and follow your local laws. FGDR is a group
              of independent content creators affiliated with Stake and may earn commission through affiliate links. FGDR
              does not operate a casino, accept wagers or process payments. Raffles, challenges and leaderboard prizes are
              subject to their published rules; no purchase necessary where required by law.
            </p>
            <p>
              Need support? Visit{' '}
              <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer">
                BeGambleAware.org
              </a>
              , or in the US call{' '}
              <a href="tel:18004262537">1-800-GAMBLER</a>.
            </p>
          </div>
        </div>

        <div className="site-footer__bottom">
          <p>© {year} FGDR — FatGuysDontRun. All rights reserved.</p>
          <p className="site-footer__rg">
            <b>18+</b> · Gamble responsibly · <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer">BeGambleAware.org</a>
          </p>
          <p className="muted">Not affiliated with Kick, Discord or any platform shown beyond the stated Stake affiliation.</p>
        </div>
      </div>

      <p className="site-footer__giant" aria-hidden="true">
        FGDR
      </p>
    </footer>
  );
}
