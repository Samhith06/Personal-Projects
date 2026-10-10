'use client';

import { useId, useState } from 'react';
import { Icon } from '@/components/ui/Icon';

/** A read-only value with a copy button — for links that get pasted somewhere else, like OBS. */
export function CopyField({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const id = useId();
  const [copied, setCopied] = useState(false);

  return (
    <div className="field adm-span-2">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className="adm-copy">
        <input id={id} className="input" value={value} readOnly onFocus={(e) => e.currentTarget.select()} />
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              /* clipboard blocked — the box selects on focus for a manual copy */
            }
          }}
        >
          <Icon name={copied ? 'check' : 'link'} />
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {hint ? <p className="field__hint">{hint}</p> : null}
    </div>
  );
}
