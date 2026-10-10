'use client';

import Link from 'next/link';
import { useActionState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import type { ActionState } from '@/server/actions/member';

type Action = (prev: ActionState, form: FormData) => Promise<ActionState>;

function SubmitButton({ children, className }: { children: ReactNode; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? 'Working…' : children}
    </button>
  );
}

/** A single-button form bound to a server action, with inline feedback. */
export function ActionButton({
  action,
  fields,
  children,
  className = 'btn btn--gold btn--sm',
  signedIn,
  returnTo,
}: {
  action: Action;
  fields: Record<string, string>;
  children: ReactNode;
  className?: string;
  signedIn: boolean;
  returnTo: string;
}) {
  const [state, formAction] = useActionState(action, null);

  if (!signedIn) {
    return (
      <Link className={className} href={`/login?returnTo=${encodeURIComponent(returnTo)}`}>
        {children}
      </Link>
    );
  }

  return (
    <form action={formAction} className="action-form">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {state?.ok ? (
        <span className="tag tag--success" role="status">
          {state.message.length > 28 ? 'Done' : state.message}
        </span>
      ) : (
        <SubmitButton className={className}>{children}</SubmitButton>
      )}
      {state && !state.ok ? (
        <p className="form-note form-note--error" role="alert">
          {state.message}
        </p>
      ) : null}
      {state?.ok && state.message.length > 28 ? (
        <p className="form-note form-note--ok" role="status">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

/** Text field + save button bound to a server action. */
export function FieldForm({
  action,
  name,
  label,
  hint,
  defaultValue,
  placeholder,
  submitLabel = 'Save',
  autoComplete = 'off',
}: {
  action: Action;
  name: string;
  label: string;
  hint?: string;
  defaultValue?: string | null;
  placeholder?: string;
  submitLabel?: string;
  autoComplete?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const id = `field-${name}`;
  return (
    <form action={formAction} className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className="account-form">
        <input
          id={id}
          className="input"
          name={name}
          defaultValue={defaultValue ?? ''}
          placeholder={placeholder}
          autoComplete={autoComplete}
          spellCheck={false}
          aria-describedby={hint ? `${id}-hint` : undefined}
        />
        <SubmitButton className="btn btn--gold">{submitLabel}</SubmitButton>
      </div>
      {hint ? (
        <p className="field__hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      {state ? (
        <p className={`form-note ${state.ok ? 'form-note--ok' : 'form-note--error'}`} role={state.ok ? 'status' : 'alert'}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
