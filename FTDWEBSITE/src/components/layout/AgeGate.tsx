'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Icon } from '@/components/ui/Icon';
import { confirmAge, declineAge } from '@/server/actions/age';

/**
 * 18+ confirmation shown right after a member signs in. It can't be dismissed
 * with Esc or a backdrop click — only by confirming or signing out.
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
    <dialog
      ref={ref}
      className="age-gate"
      aria-labelledby="age-gate-title"
      aria-describedby="age-gate-body"
      onCancel={(e) => e.preventDefault()}
    >
      <div className="age-gate__panel">
        <div className="age-gate__badge" aria-hidden="true">
          <b>18+</b>
          <span>Only</span>
        </div>

        <p className="eyebrow eyebrow--center">Welcome, {name}</p>
        <h2 className="age-gate__title" id="age-gate-title">
          Are you 18 or older?
        </h2>

        <div className="age-gate__body" id="age-gate-body">
          <p>
            FGDR features real-money gambling content. You must be <strong>18+</strong>, or the legal gambling age where you
            live if that is higher, to take part in raffles, challenges and leaderboards.
          </p>
          <p>
            Gambling involves real risk and is never a way to make money. The wins shown on this site are rare and not typical.
          </p>
        </div>

        <div className="age-gate__actions">
          <button
            type="button"
            className="btn btn--gold btn--lg btn--block"
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
            <Icon name="check" />
            I&apos;m 18 or older
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--lg btn--block"
            disabled={pending}
            onClick={() => start(() => declineAge())}
          >
            I&apos;m under 18 — sign me out
          </button>
        </div>

        <p className="age-gate__help">
          <Icon name="shield" />
          <span>
            Gamble responsibly. Need help? Visit{' '}
            <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer">
              BeGambleAware.org
            </a>{' '}
            or call <a href="tel:18004262537">1-800-GAMBLER</a>.
          </span>
        </p>
      </div>
    </dialog>
  );
}
