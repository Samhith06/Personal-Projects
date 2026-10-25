'use client';

import { useState } from 'react';

/** A private link (e.g. an OBS browser source) with a one-click copy button. */
export function CopyLink({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="copy-link">
      <code className="hash">{value}</code>
      <button
        type="button"
        className="btn btn--secondary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          } catch {
            // Clipboard blocked (e.g. insecure context) — the link is visible to copy by hand.
          }
        }}
      >
        {copied ? 'Copied ✓' : 'Copy'}
      </button>
    </div>
  );
}
