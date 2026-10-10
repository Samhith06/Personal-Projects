'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { Icon } from '@/components/ui/Icon';
import { cancelKickChatCode, requestKickChatCode, type KickCodeState } from '@/server/actions/member';

type Channel = { slug: string; name: string; url: string };

function Submit({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn--ghost" type="submit" disabled={pending}>
      {pending ? 'Generating…' : children}
    </button>
  );
}

function useCountdown(iso?: string) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!iso) return setLeft(null);
    const target = new Date(iso).getTime();
    const tick = () => setLeft(Math.max(0, target - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [iso]);
  return left;
}

/**
 * Second way to link Kick: post a one-time code in any FGDR creator's chat.
 */
export function KickChatVerify({ channels }: { channels: Channel[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<KickCodeState, FormData>(requestKickChatCode, null);
  const [status, setStatus] = useState<'pending' | 'verified' | 'expired' | 'failed'>('pending');
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(null);

  const code = state?.ok && state.code !== dismissed ? state.code : undefined;
  const left = useCountdown(code ? state?.expiresAt : undefined);

  useEffect(() => setStatus('pending'), [code]);

  // Watch for the chat message landing.
  useEffect(() => {
    if (!code || status !== 'pending') return;
    const poll = async () => {
      try {
        const res = await fetch('/api/account/kick-verification', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as { status: string; failureReason: string | null };
        if (data.status === 'verified') {
          setStatus('verified');
          router.refresh();
        } else if (data.status === 'expired') {
          setStatus(data.failureReason === 'already_linked' ? 'failed' : 'expired');
        }
      } catch {
        /* keep polling */
      }
    };
    const t = setInterval(poll, 3000);
    return () => clearInterval(t);
  }, [code, status, router]);

  useEffect(() => {
    if (left === 0 && status === 'pending') setStatus('expired');
  }, [left, status]);

  if (!open) {
    return (
      <button type="button" className="kick-alt" onClick={() => setOpen(true)}>
        <Icon name="signal" />
        <span>
          <b>Prefer not to log in to Kick?</b>
          <span>Verify with a one-time code in any FGDR creator&apos;s chat instead.</span>
        </span>
        <Icon name="arrow-right" />
      </button>
    );
  }

  const mm = left !== null ? Math.floor(left / 60000) : 0;
  const ss = left !== null ? String(Math.floor((left % 60000) / 1000)).padStart(2, '0') : '00';

  return (
    <div className="kick-code">
      <div className="kick-code__head">
        <p className="kicker">Verify with a chat code</p>
        <button
          type="button"
          className="icon-btn"
          aria-label="Close chat verification"
          onClick={async () => {
            if (code) {
              await cancelKickChatCode();
              setDismissed(code);
            }
            setOpen(false);
          }}
        >
          <Icon name="close" />
        </button>
      </div>

      {!code || status === 'expired' || status === 'failed' ? (
        <form action={formAction} className="field">
          {status === 'expired' && code ? (
            <p className="form-note form-note--error" role="alert">
              That code expired. Generate a new one.
            </p>
          ) : null}
          {status === 'failed' ? (
            <p className="form-note form-note--error" role="alert">
              That Kick account is already linked to another FGDR member.
            </p>
          ) : null}
          <label className="field__label" htmlFor="kick-chat-username">
            1. Your Kick username
          </label>
          <div className="account-form">
            <input
              id="kick-chat-username"
              className="input"
              name="kickUsername"
              placeholder="yourkickname"
              autoComplete="off"
              spellCheck={false}
              defaultValue={state?.kickUsername ?? ''}
              required
            />
            <Submit>Get my code</Submit>
          </div>
          <p className="field__hint">Only a message sent from this exact Kick account can use the code.</p>
          {state && !state.ok ? (
            <p className="form-note form-note--error" role="alert">
              {state.message}
            </p>
          ) : null}
        </form>
      ) : status === 'verified' ? (
        <p className="form-note form-note--ok" role="status">
          <Icon name="check" style={{ width: 16, height: 16, display: 'inline', verticalAlign: '-3px' }} /> Verified — @
          {state?.kickUsername} is now linked.
        </p>
      ) : (
        <div className="kick-code__steps">
          <p className="field__label">2. Post this in any FGDR creator&apos;s Kick chat</p>
          <div className="kick-code__code">
            <span className="kick-code__value" aria-live="polite">
              {code}
            </span>
            <button
              type="button"
              className="btn btn--gold btn--sm"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(code);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {
                  /* clipboard blocked */
                }
              }}
            >
              <Icon name={copied ? 'check' : 'link'} />
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="field__hint">
            Send it from <strong>@{state?.kickUsername}</strong>. Expires in{' '}
            <span className="tabular">
              {mm}:{ss}
            </span>
            . The chat doesn&apos;t need to be live.
          </p>
          <ul className="kick-code__channels">
            {channels.map((c) => (
              <li key={c.slug}>
                <a href={c.url} target="_blank" rel="noopener noreferrer" className="chip">
                  <Icon name="kick" />
                  {c.name}
                </a>
              </li>
            ))}
          </ul>
          <p className="kick-code__waiting" role="status">
            <span className="live-dot" aria-hidden="true" /> Waiting for your message… this page updates automatically.
          </p>
          <p className="field__hint">
            If a chat is in followers-only mode, follow the channel first — or use one of the other three.
          </p>
        </div>
      )}
    </div>
  );
}
