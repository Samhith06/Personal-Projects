import Link from 'next/link';

/** Channel chips for master admins (creators only ever see their own). */
export function ChannelFilter({
  basePath,
  channels,
  active,
}: {
  basePath: string;
  channels: { id: string; displayName: string }[];
  active?: string;
}) {
  return (
    <nav className="chips adm-filter" aria-label="Filter by channel">
      <Link className="chip" href={basePath} aria-current={!active ? 'page' : undefined} scroll={false}>
        All channels
      </Link>
      {channels.map((c) => (
        <Link
          key={c.id}
          className="chip"
          href={`${basePath}?channel=${c.id}`}
          aria-current={active === c.id ? 'page' : undefined}
          scroll={false}
        >
          {c.displayName}
        </Link>
      ))}
    </nav>
  );
}
