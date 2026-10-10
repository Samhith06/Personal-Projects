'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useRef, useState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { Icon } from '@/components/ui/Icon';
import type { ActionState } from '@/server/actions/member';

type Action = (prev: ActionState, form: FormData) => Promise<ActionState>;

function Submit({ label, className }: { label: string; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? 'Saving…' : label}
    </button>
  );
}

/**
 * Form bound to a staff server action with inline success/error feedback.
 * `doneHref` navigates away after a successful save (e.g. back to the list).
 */
export function AdminForm({
  action,
  children,
  submitLabel = 'Save',
  doneHref,
  resetOnSuccess = false,
  className = '',
  footer,
}: {
  action: Action;
  children: ReactNode;
  submitLabel?: string;
  doneHref?: string;
  resetOnSuccess?: boolean;
  className?: string;
  footer?: ReactNode;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(action, null);

  useEffect(() => {
    if (!state?.ok) return;
    if (resetOnSuccess) formRef.current?.reset();
    if (doneHref) router.push(doneHref, { scroll: false });
  }, [state, doneHref, resetOnSuccess, router]);

  return (
    <form ref={formRef} action={formAction} className={`adm-form ${className}`}>
      {children}
      <div className="adm-form__foot">
        <Submit label={submitLabel} className="btn btn--gold" />
        {footer}
        {state ? (
          <p className={`form-note ${state.ok ? 'form-note--ok' : 'form-note--error'}`} role={state.ok ? 'status' : 'alert'}>
            {state.ok ? <Icon name="check" style={{ width: 14, height: 14, display: 'inline', verticalAlign: '-2px' }} /> : null}{' '}
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}

/** Small inline action button (delete, draw winner…) with a confirm step. */
export function ActionButton({
  action,
  id,
  label,
  confirm,
  tone = 'danger',
  icon,
  quiet = false,
}: {
  action: Action;
  id: string;
  label: string;
  confirm?: string;
  tone?: 'danger' | 'gold' | 'ghost';
  icon?: Parameters<typeof Icon>[0]['name'];
  /** Show errors only. For small repeated actions whose result is visible anyway, like reordering. */
  quiet?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  return (
    <form
      action={formAction}
      className="adm-inline"
      onSubmit={(e) => {
        if (confirm && !armed) {
          e.preventDefault();
          setArmed(true);
        } else if (armed) {
          // One confirm buys one submit. Staying armed would let a double-click
          // fire whatever button renders here next without asking.
          setArmed(false);
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <InlineSubmit
        className={`btn btn--sm ${tone === 'danger' ? 'btn--danger' : tone === 'gold' ? 'btn--gold' : 'btn--ghost'}`}
        label={armed ? (confirm ?? 'Confirm') : label}
        icon={icon}
      />
      {state && !state.ok ? (
        <span className="form-note form-note--error" role="alert">
          {state.message}
        </span>
      ) : null}
      {state?.ok && tone !== 'danger' && !quiet ? (
        <span className="form-note form-note--ok" role="status">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}

function InlineSubmit({ className, label, icon }: { className: string; label: string; icon?: Parameters<typeof Icon>[0]['name'] }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {icon ? <Icon name={icon} /> : null}
      {pending ? '…' : label}
    </button>
  );
}

/** Wall-clock parts of an instant in `timeZone` (or the browser's own zone). */
function wallClock(d: Date, timeZone?: string) {
  if (!timeZone) {
    return { y: d.getFullYear(), mo: d.getMonth() + 1, d: d.getDate(), h: d.getHours(), mi: d.getMinutes() };
  }
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    })
      .formatToParts(d)
      .map((p) => [p.type, Number(p.value)]),
  );
  return { y: parts.year, mo: parts.month, d: parts.day, h: parts.hour, mi: parts.minute };
}

/** `2026-10-01T18:00` read as wall-clock time in `timeZone` -> the exact instant. */
function fromWallClock(local: string, timeZone?: string) {
  if (!timeZone) return new Date(local);
  const [y, mo, d, h, mi] = local.split(/[-T:]/).map(Number);
  const wanted = Date.UTC(y, mo - 1, d, h, mi);
  // Guess, measure how far the zone is off, correct; twice covers DST edges.
  let guess = wanted;
  for (let i = 0; i < 2; i += 1) {
    const w = wallClock(new Date(guess), timeZone);
    guess += wanted - Date.UTC(w.y, w.mo - 1, w.d, w.h, w.mi);
  }
  return new Date(guess);
}

/**
 * Date & time input. The visible value is wall-clock time — in `timeZone` when
 * given (so every admin enters the same German time, wherever they are), else
 * in the admin's own zone. The submitted value is an exact ISO timestamp.
 */
export function DateTimeField({
  name,
  label,
  value,
  required = false,
  hint,
  timeZone,
}: {
  name: string;
  label: string;
  value?: string | null;
  required?: boolean;
  hint?: string;
  timeZone?: string;
}) {
  const toLocal = (iso: string) => {
    const w = wallClock(new Date(iso), timeZone);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${w.y}-${pad(w.mo)}-${pad(w.d)}T${pad(w.h)}:${pad(w.mi)}`;
  };
  const [local, setLocal] = useState('');
  useEffect(() => setLocal(value ? toLocal(value) : ''), [value, timeZone]);
  const iso = local ? fromWallClock(local, timeZone).toISOString() : '';
  const id = `dt-${name}`;

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
        {required ? <span className="adm-req"> *</span> : null}
      </label>
      <input id={id} className="input" type="datetime-local" value={local} onChange={(e) => setLocal(e.target.value)} required={required} />
      <input type="hidden" name={name} value={iso} />
      {hint ? <p className="field__hint">{hint}</p> : null}
    </div>
  );
}
