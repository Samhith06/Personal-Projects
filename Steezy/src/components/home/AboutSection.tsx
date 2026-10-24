import Image from 'next/image';
import steeze from '../../../public/brand/steeze.png';
import { env } from '@/lib/env';
import { SOCIALS } from '@/lib/socials';

/**
 * "Meet Steeze." from the SteezeSpins Home design. Socials only list the
 * channels we actually have links for (Kick, Discord, Instagram, X, YouTube,
 * Roobet). The photo is served resized and as
 * WebP/AVIF by next/image (the original PNG is ~800 KB).
 */
export function AboutSection() {
  const socials = [
    env.kickChannelSlug ? { name: 'Kick', handle: `kick.com/${env.kickChannelSlug}`, href: `https://kick.com/${env.kickChannelSlug}`, mark: 'K' } : null,
    { name: 'Discord', handle: env.discordInviteUrl.replace(/^https?:\/\//, ''), href: env.discordInviteUrl, mark: 'D' },
    ...SOCIALS,
    { name: 'Roobet', handle: 'code STZY', href: env.roobetReferralUrl, mark: 'R' },
  ].filter((s): s is NonNullable<typeof s> => s !== null);

  return (
    <section className="container home-section about" id="about" aria-labelledby="about-title">
      <div className="stack about__text">
        <span className="kicker">About</span>
        <h2 id="about-title" className="about__title">
          Meet Steeze.
        </h2>
        <p className="about__lede">Slots streamer on Kick. Most nights it&apos;s bonus hunts, slot tournaments and giveaways for the people in chat.</p>
        <p className="meta" style={{ fontSize: 15, lineHeight: 1.7, maxWidth: '56ch' }}>
          Everything on this site ties back to the stream. Wager numbers come straight from Roobet affiliate data under code STZY.
          Watching without signing up is completely fine — join the Discord and hang out.
        </p>
        <ul className="socials">
          {socials.map((s) => (
            <li key={s.name}>
              <a href={s.href} target="_blank" rel={s.name === 'Roobet' ? 'noopener sponsored' : 'noopener'}>
                <span className="socials__mark" aria-hidden="true">
                  {s.mark}
                </span>
                <span className="socials__name">{s.name}</span>
                <span className="socials__handle">{s.handle}</span>
                <span aria-hidden="true">↗</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
      <div className="about__photo">
        <Image
          src={steeze}
          alt="Steeze snowboarding above the clouds"
          placeholder="blur"
          sizes="(max-width: 760px) 100vw, 440px"
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '62% 70%' }}
        />
      </div>
    </section>
  );
}
