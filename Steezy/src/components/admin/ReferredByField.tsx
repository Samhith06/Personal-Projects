'use client';

import { useState, useTransition } from 'react';
import { setReferredBy } from '@/server/actions/admin';

/**
 * Inline "Referred by" cell. Saves on Enter or when the field loses focus,
 * and only when the value actually changed.
 */
export function ReferredByField({ userId, value }: { userId: string; value: string | null }) {
  const [text, setText] = useState(value ?? '');
  const [saved, setSaved] = useState(value ?? '');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    const next = text.trim();
    if (next === saved) return;
    const fd = new FormData();
    fd.set('userId', userId);
    fd.set('referredBy', next);
    startTransition(async () => {
      const res = await setReferredBy(fd);
      if (res.error) {
        setError(res.error);
        return;
      }
      setError(null);
      setSaved(next);
      setText(next);
    });
  };

  return (
    <div className="referred-by">
      <input
        className="input input--compact"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.currentTarget.blur();
          }
          if (e.key === 'Escape') setText(saved);
        }}
        placeholder="—"
        maxLength={64}
        aria-label="Referred by"
        disabled={pending}
        title={error ?? 'Who referred them to play under STZY. Enter to save.'}
        aria-invalid={error ? true : undefined}
      />
      {pending ? <span className="meta">Saving…</span> : error ? <span className="referred-by__error">{error}</span> : null}
    </div>
  );
}
