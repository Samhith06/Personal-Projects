'use client';

import { useRef, useState } from 'react';
import { TelegramLogin } from './TelegramLogin';

/**
 * "Log in" button that opens a picker: Discord and/or Telegram, whichever is
 * configured. Without a `returnTo` the member comes back to the page they
 * were on. The Telegram widget only loads once the picker is open.
 */
export function LoginDialog({
  label,
  returnTo,
  discord,
  telegram,
}: {
  label: string;
  returnTo?: string;
  discord: boolean;
  telegram: { bot: string; callbackUrl: string } | null;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [back, setBack] = useState<string | null>(null);

  const open = () => {
    setBack(returnTo ?? `${window.location.pathname}${window.location.search}`);
    ref.current?.showModal();
  };
  const close = () => ref.current?.close();
  const q = back ? `?returnTo=${encodeURIComponent(back)}` : '';

  return (
    <>
      <button type="button" className="btn btn--primary" onClick={open}>
        {label}
      </button>
      <dialog
        ref={ref}
        className="login-dialog"
        aria-labelledby="login-dialog-title"
        onClose={() => setBack(null)}
        onClick={(e) => e.target === e.currentTarget && close()}
      >
        <div className="login-dialog__panel">
          <button type="button" className="login-dialog__close" aria-label="Close" onClick={close}>
            ×
          </button>
          <span className="kicker">Log in</span>
          <h2 id="login-dialog-title">Sign in to SteezySpins</h2>
          <p className="meta" style={{ fontSize: 15, color: 'var(--color-text-2)' }}>
            We only read your name and avatar. Already have an account? Use the one you signed up with, then link the other
            from your profile.
          </p>
          <div className="login-dialog__options">
            {discord ? (
              <a className="btn btn--primary login-dialog__discord" href={`/api/auth/discord${q}`}>
                Log in with Discord
              </a>
            ) : null}
            {telegram && back !== null ? <TelegramLogin bot={telegram.bot} authUrl={`${telegram.callbackUrl}${q}`} /> : null}
            {!discord && !telegram ? <p className="notice notice--danger">Login isn’t set up on this server yet.</p> : null}
          </div>
        </div>
      </dialog>
    </>
  );
}
