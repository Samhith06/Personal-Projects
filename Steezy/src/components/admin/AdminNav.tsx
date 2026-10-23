'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ADMIN_SECTIONS, GROUP_LABELS } from '@/lib/admin-nav';

/**
 * The staff sidebar. Counts only appear where work is waiting, so a badge
 * means "somebody is waiting on you" rather than "here is a number".
 */
export function AdminNav({ counts }: { counts: { approvals: number; payouts: number; flags: number } }) {
  const pathname = usePathname();
  let lastGroup: string | null = null;

  return (
    <nav className="admin__nav" aria-label="Admin">
      {ADMIN_SECTIONS.map((section) => {
        const n = section.count ? counts[section.count] : 0;
        // Exact match for the index, prefix for the rest, or Overview would light up everywhere.
        const active = section.href === '/admin' ? pathname === '/admin' : pathname.startsWith(section.href);
        const header =
          section.group !== lastGroup ? (
            <span className="admin__group" key={`g-${section.group}`}>
              {GROUP_LABELS[section.group]}
            </span>
          ) : null;
        lastGroup = section.group;
        return [
          header,
          <Link key={section.href} href={section.href} className={active ? 'is-active' : undefined} aria-current={active ? 'page' : undefined}>
            {section.label}
            {n ? <span className={`admin-count${section.count === 'flags' ? ' admin-count--danger' : ''}`}>{n}</span> : null}
          </Link>,
        ];
      })}
    </nav>
  );
}
