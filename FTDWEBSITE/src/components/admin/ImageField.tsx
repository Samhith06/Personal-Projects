'use client';

import { useId, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';

/**
 * An image field that accepts an actual file.
 *
 * Pasting a URL still works exactly as it did — the field's value is always a
 * plain string that the same server action validates. Choosing a file just
 * fills that string in for you: the file is uploaded on selection and the
 * returned path replaces whatever was in the box, with a live preview so you
 * can see you picked the right one before saving.
 */
export function ImageField({
  name,
  label,
  value,
  hint,
  required,
}: {
  name: string;
  label: string;
  value?: string | null;
  hint?: string;
  required?: boolean;
}) {
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(value ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch('/api/admin/upload', { method: 'POST', body });
      const result = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error ?? 'That upload failed.');
      setUrl(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That upload failed.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="field adm-image">
      <label className="field__label" htmlFor={`${id}-url`}>
        {label}
        {required ? <span className="adm-req"> *</span> : null}
      </label>

      <div className="adm-image__row">
        <span className="adm-image__preview" aria-hidden="true">
          {url ? (
            // Uploaded and remote images alike — no optimisation needed at this size.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" />
          ) : (
            <Icon name="image" />
          )}
        </span>

        <div className="adm-image__controls">
          <input
            id={`${id}-url`}
            className="input"
            name={name}
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://… or upload a file"
            required={required}
            autoComplete="off"
          />
          <div className="adm-image__actions">
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => fileRef.current?.click()} disabled={busy}>
              <Icon name="upload" />
              {busy ? 'Uploading…' : 'Upload image'}
            </button>
            {url ? (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setUrl('')} disabled={busy}>
                Remove
              </button>
            ) : null}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
            }}
          />
        </div>
      </div>

      {error ? (
        <p className="form-note form-note--error" role="alert">
          {error}
        </p>
      ) : (
        (hint ? <p className="field__hint">{hint}</p> : null)
      )}
    </div>
  );
}
