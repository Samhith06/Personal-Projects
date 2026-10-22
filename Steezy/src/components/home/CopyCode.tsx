'use client';

import { useState } from 'react';

/** The referral code with a one-click copy button. */
export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="code-box">
      <span className="code-box__label">Code</span>
      <span className="code-box__code">{code}</span>
      <button
        type="button"
        className="code-box__copy"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          } catch {
            // Clipboard blocked (e.g. insecure context) — the code is visible to copy by hand.
          }
        }}
        aria-label={`Copy code ${code}`}
      >
        {copied ? 'Copied ✓' : 'Copy'}
      </button>
    </div>
  );
}
