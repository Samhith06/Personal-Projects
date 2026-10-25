import Image from 'next/image';
import steeze from '../../../public/brand/steeze.png';
import { env } from '@/lib/env';
import type { CSSProperties } from 'react';
import { siDiscord, siKick } from 'simple-icons';
import { SOCIALS, type Social } from '@/lib/socials';

/**
 * "Meet Steezy." from the SteezySpins Home design. Socials are a row of
 * brand icons (simple-icons) for the channels we have links for, plus
 * Roobet. The photo is served resized and as
 * WebP/AVIF by next/image (the original PNG is ~800 KB).
 */
export function AboutSection() {
  const socials: Social[] = [
    ...(env.kickChannelSlug
      ? [{ name: 'Kick', handle: `kick.com/${env.kickChannelSlug}`, href: `https://kick.com/${env.kickChannelSlug}`, icon: siKick }]
      : []),
    { name: 'Discord', handle: env.discordInviteUrl.replace(/^https?:\/\//, ''), href: env.discordInviteUrl, icon: siDiscord },
    ...SOCIALS,
  ];

  return (
    <section className="container home-section about" id="about" aria-labelledby="about-title">
      <div className="stack about__text">
        <span className="kicker">About</span>
        <h2 id="about-title" className="about__title">
          Meet Steezy.
        </h2>
        <p className="about__lede">Slots streamer on Kick. Most nights it&apos;s bonus hunts, slot tournaments and giveaways for the people in chat.</p>
        <p className="meta" style={{ fontSize: 15, lineHeight: 1.7, maxWidth: '56ch' }}>
          Everything on this site ties back to the stream. Wager numbers come straight from Roobet affiliate data under code STZY.
          Watching without signing up is completely fine — join the Discord and hang out.
        </p>
        <ul className="social-icons">
          {socials.map((s) => (
            <li key={s.name}>
              <a
                className="social-icon"
                href={s.href}
                target="_blank"
                rel="noopener"
                title={`${s.name} · ${s.handle}`}
                aria-label={`${s.name} (${s.handle})`}
                // X's brand colour is black; use the text colour so it shows on the dark theme.
                style={{ ['--brand' as string]: s.icon.hex === '000000' ? 'var(--color-text)' : `#${s.icon.hex}` } as CSSProperties}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d={s.icon.path} />
                </svg>
              </a>
            </li>
          ))}
          <li>
            <a
              className="social-icon social-icon--roobet"
              href={env.roobetReferralUrl}
              target="_blank"
              rel="noopener sponsored"
              title="Roobet · code STZY"
              aria-label="Roobet (code STZY)"
            >
              R
            </a>
          </li>
        </ul>
      </div>
      <div className="about__photo">
        <Image
          src={steeze}
          alt="Steezy snowboarding above the clouds"
          placeholder="blur"
          sizes="(max-width: 760px) 100vw, 440px"
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '62% 70%' }}
        />
      </div>
    </section>
  );
}
