import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { env, features } from '@/lib/env';
import { requestKickCode, submitRoobetUsername } from '@/server/actions/account';
import { getCurrentUser } from '@/server/auth/session';
import { latestVerification } from '@/server/kick/chat-verification';
import { getRoobetLink } from '@/server/services/member';

export const metadata: Metadata = { title: 'Link accounts' };

const ERRORS: Record<string, string> = {
  kick_unconfigured: 'Kick login isn’t set up on this server yet — use the chat code instead.',
  kick_denied: 'Kick login was cancelled.',
  kick_taken: 'That Kick account is already linked to another SteezySpins member.',
  kick_failed: 'Kick didn’t let us link that time. Please try again.',
  invalid_state: 'That link expired. Please try again.',
};

export default async function LinkAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; kick?: string; roobet?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?returnTo=/me/link');

  const params = await searchParams;
  const [verification, roobet] = await Promise.all([latestVerification(user.id), getRoobetLink(user.id)]);
  const pendingCode = verification?.status === 'pending' ? verification : null;
  const error = params.error ? (ERRORS[params.error] ?? params.error) : null;
  const roobetFormOpen = !roobet || roobet.status === 'rejected';

  return (
    <div className="container page page--narrow">
      <div className="stack" style={{ gap: 10 }}>
        <span className="kicker">Get set up</span>
        <h1 className="page__title">Link your accounts</h1>
        <p className="meta" style={{ fontSize: 15, maxWidth: '60ch' }}>
          Kick unlocks watch time, streams attended and chat giveaways. Roobet unlocks the leaderboard, milestones and wager
          raffles.
        </p>
      </div>

      {error ? <p className="notice notice--danger">{error}</p> : null}
      {params.kick === 'linked' ? <p className="notice notice--ok">Kick account linked.</p> : null}
      {params.roobet === 'submitted' ? <p className="notice notice--ok">Submitted. An admin will review it soon.</p> : null}
      {params.roobet === 'approved' ? <p className="notice notice--ok">Found under code STZY and approved.</p> : null}

      {/* Login accounts: Discord, Telegram or both, whichever this member has. */}
      {user.discordId ? (
        <section className="card account-row">
          <span className="account-mark account-mark--discord">D</span>
          <div className="account-row__body">
            <div className="account-row__name">Discord</div>
            <div className="meta">Signed in as {user.discordUsername}</div>
          </div>
          <span className="tag tag--accent">Connected</span>
        </section>
      ) : null}
      {user.telegramId ? (
        <section className="card account-row">
          <span className="account-mark account-mark--telegram">T</span>
          <div className="account-row__body">
            <div className="account-row__name">Telegram</div>
            <div className="meta">Signed in as {user.telegramUsername ? `@${user.telegramUsername}` : user.telegramName}</div>
          </div>
          <span className="tag tag--accent">Connected</span>
        </section>
      ) : null}

      <section className="card stack" style={{ gap: 20 }}>
        <div className="account-row">
          <span className="account-mark account-mark--kick">K</span>
          <div className="account-row__body">
            <div className="account-row__name">Kick</div>
            <div className="meta">{user.kickUsername ? `${user.kickUsername} · verified` : 'Not linked yet'}</div>
          </div>
          <span className={user.kickUserId ? 'tag tag--accent' : 'tag tag--neutral'}>{user.kickUserId ? 'Connected' : 'Not linked'}</span>
        </div>
        {user.kickUserId ? null : (
          <div className="option-grid">
            <div className="option">
              <strong>Option A · Log in with Kick</strong>
              <p className="meta">Fastest. Kick asks you to approve read-only access to your username.</p>
              {features.kickAuth ? (
                <a className="btn btn--primary" href="/api/auth/kick" style={{ alignSelf: 'flex-start' }}>
                  Continue with Kick
                </a>
              ) : (
                <span className="meta">Not available yet.</span>
              )}
            </div>
            <div className="option">
              <strong>Option B · Type a code in chat</strong>
              {pendingCode ? (
                <>
                  <p className="meta">Send this in Steezy&apos;s Kick chat within 10 minutes:</p>
                  <code className="verify-code">!verify {pendingCode.code}</code>
                  <span className="meta">
                    Expires {pendingCode.expiresAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}. Refresh
                    this page after sending it.
                  </span>
                </>
              ) : (
                <>
                  <p className="meta">We&apos;ll give you a one-time code to send in Steezy&apos;s Kick chat.</p>
                  <form action={requestKickCode}>
                    <button className="btn btn--secondary" type="submit">
                      Get a code
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="card stack" style={{ gap: 20 }}>
        <div className="account-row">
          <span className="account-mark account-mark--roobet">R</span>
          <div className="account-row__body">
            <div className="account-row__name">Roobet</div>
            <div className="meta">
              {roobet ? `${roobet.requestedUsername} · ${roobet.status === 'approved' ? 'approved and locked' : roobet.status}` : 'Not linked yet'}
            </div>
          </div>
          <span
            className={
              roobet?.status === 'rejected' ? 'tag tag--danger' : roobet ? 'tag tag--warn' : 'tag tag--neutral'
            }
          >
            {roobet?.status === 'approved' ? 'Locked' : roobet?.status === 'pending' ? 'Pending' : roobet ? 'Rejected' : 'Not linked'}
          </span>
        </div>

        {roobet?.status === 'rejected' && roobet.rejectReason ? (
          <p className="notice notice--danger">Not approved: {roobet.rejectReason}</p>
        ) : null}

        {roobetFormOpen ? (
          <form action={submitRoobetUsername} className="stack" style={{ gap: 14 }}>
            <div className="field">
              <label htmlFor="roobet-username">Roobet username</label>
              <input id="roobet-username" name="username" className="input" placeholder="Exactly as it appears on Roobet" required />
            </div>
            <div className="row">
              <button className="btn btn--primary" type="submit">
                Submit for approval
              </button>
              <a className="btn btn--secondary" href={env.roobetReferralUrl} target="_blank" rel="noopener sponsored">
                No account? Sign up with STZY
              </a>
            </div>
            <p className="meta">
              An admin checks it against Roobet&apos;s affiliate data. Once approved it&apos;s locked to your profile and can&apos;t be
              changed.
            </p>
          </form>
        ) : roobet?.status === 'pending' ? (
          <p className="meta">Waiting for approval — usually within 24 hours.</p>
        ) : (
          <p className="meta">Your wagers count toward the leaderboard, milestones and raffles.</p>
        )}
      </section>
    </div>
  );
}
