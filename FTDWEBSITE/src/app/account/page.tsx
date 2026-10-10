import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { FieldForm } from '@/components/forms/ActionForm';
import { MemberShell } from '@/components/member/MemberShell';
import { Icon } from '@/components/ui/Icon';
import { dateLabel } from '@/lib/format';
import { features } from '@/lib/env';
import { discordAvatarUrl } from '@/server/auth/discord';
import { getCurrentUser } from '@/server/auth/session';
import { saveStakeEuUsername, saveStakeUsername, unlinkKick } from '@/server/actions/member';
import { getStreamers } from '@/server/services/content';
import { KickChatVerify } from '@/components/account/KickChatVerify';

export const metadata: Metadata = { title: 'Account', robots: { index: false } };
export const dynamic = 'force-dynamic';

const KICK_MESSAGES: Record<string, { ok: boolean; text: string }> = {
  linked: { ok: true, text: 'Kick account linked and verified.' },
  denied: { ok: false, text: 'Kick linking was cancelled.' },
  invalid_state: { ok: false, text: 'That Kick link expired. Please try again.' },
  failed: { ok: false, text: 'We couldn’t verify your Kick account. Please try again.' },
  already_linked: { ok: false, text: 'That Kick account is already linked to another FGDR member.' },
  unconfigured: { ok: false, text: 'Kick verification isn’t configured on this server yet.' },
};

export default async function AccountPage({ searchParams }: PageProps<'/account'>) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?returnTo=/account');

  const params = await searchParams;
  const kickMessage = typeof params.kick === 'string' ? KICK_MESSAGES[params.kick] : undefined;

  const channels = (await getStreamers()).map((s) => ({ slug: s.kickUsername, name: s.displayName, url: s.kickUrl }));

  const kickLinkOptions = (
    <div className="kick-options">
      {features.kickAuth ? (
        <a className="btn btn--kick btn--lg" href="/api/auth/kick">
          <Icon name="kick" />
          Log in with Kick
        </a>
      ) : (
        <div className="kick-options__disabled">
          <span className="btn btn--kick btn--lg" aria-disabled="true">
            <Icon name="kick" />
            Log in with Kick
          </span>
          <p className="field__hint">Kick login isn&apos;t switched on for this site yet — use a chat code below.</p>
        </div>
      )}
      <p className="kick-options__or">
        <span>or</span>
      </p>
      <KickChatVerify channels={channels} />
    </div>
  );

  return (
    <MemberShell user={user} active="/account">
      <section className="section section--sm" style={{ paddingTop: 'clamp(2rem, 1.5rem + 2vw, 3.5rem)' }}>
        <div className="container account-grid">
          {/* ------------------------------------------------------ Discord */}
          <article className="panel account-card" id="discord">
            <div className="account-card__head">
              <h2 className="account-card__title">
                <Icon name="discord" style={{ color: '#7984f5' }} />
                Discord
              </h2>
              <span className="tag tag--success">
                <Icon name="check" />
                Connected
              </span>
            </div>
            <div className="account-identity">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={discordAvatarUrl(user.discordId, user.discordAvatar, 128)} alt="" width={52} height={52} />
              <div>
                <p className="account-identity__name">{user.discordGlobalName || user.discordUsername}</p>
                <p className="muted">@{user.discordUsername}</p>
              </div>
            </div>
            <p className="field__hint">
              Your name and avatar update automatically each time you sign in. FGDR stores only your Discord ID, username and
              avatar — no email, servers or messages, and no Discord tokens.
            </p>
          </article>

          {/* --------------------------------------------------------- Kick */}
          <article className="panel account-card" id="kick">
            <div className="account-card__head">
              <h2 className="account-card__title">
                <Icon name="kick" style={{ color: '#53fc18' }} />
                Kick account
              </h2>
              {user.kickUsername ? (
                <span className={`tag ${user.kickVerified ? 'tag--success' : ''}`}>
                  <Icon name={user.kickVerified ? 'verified' : 'info'} />
                  {user.kickVerified ? 'Verified' : 'Unverified'}
                </span>
              ) : (
                <span className="tag tag--muted">Not linked</span>
              )}
            </div>

            {kickMessage ? (
              <p className={`form-note ${kickMessage.ok ? 'form-note--ok' : 'form-note--error'}`} role={kickMessage.ok ? 'status' : 'alert'}>
                {kickMessage.text}
              </p>
            ) : null}

            {user.kickUsername ? (
              <>
                <div className="account-identity">
                  <span className="medallion medallion--md" aria-hidden="true">
                    <span className="medallion__inner">
                      <Icon name="kick" style={{ width: 22, height: 22, color: '#53fc18' }} />
                    </span>
                  </span>
                  <div style={{ flex: 1 }}>
                    <p className="account-identity__name">@{user.kickUsername}</p>
                    <p className="muted" style={{ fontSize: '0.85rem' }}>
                      Linked {user.kickLinkedAt ? dateLabel(user.kickLinkedAt, 'UTC') : ''}
                      {user.kickVerified ? ' · verified' : ' · not verified'}
                    </p>
                  </div>
                  <a className="btn btn--ghost btn--sm" href={`https://kick.com/${encodeURIComponent(user.kickUsername)}`} target="_blank" rel="noopener noreferrer">
                    Profile
                    <Icon name="external" />
                  </a>
                </div>
                <form action={unlinkKick}>
                  <button className="btn btn--danger btn--sm" type="submit">
                    Unlink
                  </button>
                </form>
                {!user.kickVerified ? (
                  <>
                    <p className="notice notice--gold">
                      <Icon name="info" />
                      This link was added before verification existed. Verify it below to use it for raffles and rewards.
                    </p>
                    {kickLinkOptions}
                  </>
                ) : null}
              </>
            ) : (
              <>
                <p className="field__hint">
                  Linking proves which Kick account is yours, so raffle entries, challenges and milestones count for you.
                </p>
                {kickLinkOptions}
              </>
            )}
          </article>

          {/* -------------------------------------------------------- Stake */}
          <article className="panel account-card" id="stake">
            <div className="account-card__head">
              <h2 className="account-card__title">
                <Icon name="spade" style={{ color: 'var(--gold-2)' }} />
                Stake accounts
              </h2>
              <span className="tag">
                <Icon name="lock" />
                Private
              </span>
            </div>
            <FieldForm
              action={saveStakeUsername}
              name="stakeUsername"
              label="Stake.com username"
              defaultValue={user.stakeUsername}
              placeholder="Your Stake.com username"
              hint="Matches your wagers to the Stake.com leaderboard, milestones and raffle eligibility. Leave empty and save to remove it."
            />
            <FieldForm
              action={saveStakeEuUsername}
              name="stakeEuUsername"
              label="Stake.eu username"
              defaultValue={user.stakeEuUsername}
              placeholder="Your Stake.eu username"
              hint="Matches your wagers to the Stake.eu leaderboard. Neither username is ever shown publicly — only you and FGDR staff can see them."
            />
          </article>

          <p className="fineprint" style={{ textAlign: 'left' }}>
            FGDR never asks for your Stake password, balance or payment details. If anyone does, it isn&apos;t us.
          </p>
        </div>
      </section>
    </MemberShell>
  );
}
