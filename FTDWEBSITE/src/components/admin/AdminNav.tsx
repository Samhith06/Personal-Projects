'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';

export type NavItem = { href: string; label: string; icon: IconName };
export type NavGroup = { label: string; items: NavItem[] };

export function AdminNav({
  groups,
  brand,
  identity,
}: {
  groups: NavGroup[];
  brand: ReactNode;
  identity: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));
  const current = groups.flatMap((g) => g.items).find((i) => isActive(i.href));

  return (
    <>
      <div className="adm-topbar">
        <Link href="/admin" className="adm-topbar__brand">
          {brand}
          <span>Control room</span>
        </Link>
        <span className="adm-topbar__page">{current?.label}</span>
        <button type="button" className="icon-btn" aria-expanded={open} aria-controls="adm-sidebar" onClick={() => setOpen((v) => !v)}>
          <Icon name={open ? 'close' : 'menu'} />
          <span className="sr-only">{open ? 'Close admin menu' : 'Open admin menu'}</span>
        </button>
      </div>

      <aside id="adm-sidebar" className={`adm-sidebar ${open ? 'is-open' : ''}`}>
        <Link href="/admin" className="adm-sidebar__brand">
          {brand}
          <span>
            <b>FGDR</b>
            <small>Control room</small>
          </span>
        </Link>

        <div className="adm-sidebar__identity">{identity}</div>

        <nav aria-label="Admin">
          {groups.map((group) => (
            <div key={group.label} className="adm-nav__group">
              <p className="adm-nav__label">{group.label}</p>
              <ul>
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="adm-nav__link" aria-current={isActive(item.href) ? 'page' : undefined}>
                      <Icon name={item.icon} />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="adm-sidebar__foot">
          <Link href="/" className="adm-nav__link">
            <Icon name="external" />
            View site
          </Link>
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="adm-nav__link">
              <Icon name="logout" />
              Sign out
            </button>
          </form>
        </div>
      </aside>
      {open ? <button type="button" className="adm-scrim" aria-label="Close admin menu" onClick={() => setOpen(false)} /> : null}
    </>
  );
}

/** Hides public site chrome (e.g. the footer) inside the admin panel. */
export function HideInAdmin({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Stream overlays are captured into OBS, so they carry no site chrome either.
  if (pathname.startsWith('/admin') || pathname.startsWith('/overlay')) return null;
  return <>{children}</>;
}
