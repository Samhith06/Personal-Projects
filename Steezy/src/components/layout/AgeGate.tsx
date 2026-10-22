'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { confirmAge, declineAge } from '@/server/actions/age';

/**
 * 18+ confirmation shown after each sign-in (from FTDWEBSITE). It can't be
 * dismissed with Esc or a backdrop click — only by confirming or signing out.
 */
export function AgeGate({ name }: { name: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(true);
  const [pending, start] = useTransition();

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    document.documentElement.classList.add('is-locked');
    return () => document.documentElement.classList.remove('is-locked');
  }, []);

  if (!open) return null;

  return (
    <dialog ref={ref} className="age-gate" aria-labelledby="age-gate-title" onCancel={(e) => e.preventDefault()}>
      <div className="age-gate__panel">
        <span className="age-gate__badge" aria-hidden="true">
          18+
        </span>
        <p className="kicker">Welcome, {name}</p>
        <h2 id="age-gate-title">Are you 18 or older?</h2>
        <p className="meta" style={{ fontSize: 15, color: 'var(--color-text-2)' }}>
          This site is about online gambling content and links to a casino partner. You must be of legal gambling age where
          you live.
        </p>
        <div className="age-gate__actions">
          <button
            type="button"
            className="btn btn--primary"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await confirmAge();
                ref.current?.close();
                document.documentElement.classList.remove('is-locked');
                setOpen(false);
              })
            }
          >
            Yes, I&apos;m 18+
          </button>
          <button type="button" className="btn btn--secondary" disabled={pending} onClick={() => start(() => declineAge())}>
            No, sign me out
          </button>
        </div>
        <p className="meta">
          Gambling should be fun. If it isn&apos;t,{' '}
          <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer">
            get support
          </a>
          .
        </p>
      </div>
    </dialog>
  );
}
