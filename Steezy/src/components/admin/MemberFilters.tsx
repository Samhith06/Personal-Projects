'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

type Option = { value: string; label: string };

/**
 * Members search that filters as you type. The URL stays the source of truth
 * (so results are shareable and the server does the search); typing just
 * rewrites it after a short pause. Changing a search or filter goes back to page 1.
 */
export function MemberFilters({
  q,
  filter,
  sort,
  filters,
  sorts,
}: {
  q: string;
  filter: string;
  sort: string;
  filters: Option[];
  sorts: Option[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [text, setText] = useState(q);
  const [pending, startTransition] = useTransition();
  const first = useRef(true);

  const go = (next: { q?: string; filter?: string; sort?: string }) => {
    const v = { q: text.trim(), filter, sort, ...next };
    const params = new URLSearchParams({
      ...(v.q ? { q: v.q } : {}),
      ...(v.filter !== 'all' ? { filter: v.filter } : {}),
      ...(v.sort !== 'recent' ? { sort: v.sort } : {}),
    });
    startTransition(() => router.replace(params.size ? `${pathname}?${params}` : pathname, { scroll: false }));
  };

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => go({ q: text.trim() }), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <form
      className="members-filters"
      onSubmit={(e) => {
        e.preventDefault();
        go({});
      }}
      aria-busy={pending}
    >
      <input
        className="input"
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Search names…"
        aria-label="Search members"
        autoComplete="off"
      />
      <select className="input" value={filter} onChange={(e) => go({ filter: e.target.value })} aria-label="Filter">
        {filters.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>
      <select className="input" value={sort} onChange={(e) => go({ sort: e.target.value })} aria-label="Sort">
        {sorts.map((s) => (
          <option key={s.value} value={s.value}>
            Sort: {s.label}
          </option>
        ))}
      </select>
      {q || filter !== 'all' || sort !== 'recent' ? (
        <Link className="btn btn--secondary" href={pathname} onClick={() => setText('')}>
          Clear
        </Link>
      ) : null}
      {pending ? <span className="meta members-filters__busy">Searching…</span> : null}
    </form>
  );
}
