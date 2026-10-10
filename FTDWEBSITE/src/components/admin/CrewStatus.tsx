'use client';

import { useLive } from '@/components/live/LiveProvider';
import { StatusBadge } from '@/components/ui/primitives';
import { compact } from '@/lib/format';

export function CrewStatus({ channels }: { channels: { id: string; name: string }[] }) {
  const live = useLive();
  return (
    <ul className="adm-list">
      {channels.map((c) => {
        const s = live[c.id];
        return (
          <li key={c.id}>
            {s?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="adm-list__avatar" src={s.avatarUrl} alt="" width={36} height={36} />
            ) : null}
            <span className="adm-list__main">
              <b>{c.name}</b>
              <span>{s?.isLive ? `${s.title ?? 'Live'} · ${s.viewers ? compact(s.viewers) : 0} watching` : 'Offline'}</span>
            </span>
            <StatusBadge live={Boolean(s?.isLive)} />
          </li>
        );
      })}
    </ul>
  );
}
