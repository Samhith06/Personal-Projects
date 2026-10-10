'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import { LiveDot, Medallion } from '@/components/ui/primitives';
import { useLive } from '@/components/live/LiveProvider';
import { CONTENT_NAV, PRIMARY_NAV, SECONDARY_NAV, type SessionView } from '@/lib/nav';
import { compact } from '@/lib/format';

type NavStreamer = { id: string; displayName: string; monogram: string; accent: string };

export function SiteHeader({
  logo,
  session,
  streamers,
}: {
  logo: ReactNode;
  session: SessionView;
  streamers: NavStreamer[];
}) {
  const pathname = usePathname();
  const live = useLive();
  const liveList = streamers.filter((s) => live[s.id]?.isLive);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLDivElement>(null);

  const isHome = pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the drawer on navigation.
  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    document.documentElement.classList.toggle('is-locked', menuOpen);
    if (!menuOpen) return;

    drawer.current?.querySelector<HTMLElement>('a, button')?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        menuBtn.current?.focus();
      }
      if (e.key === 'Tab' && drawer.current) {
        const focusables = [menuBtn.current, ...drawer.current.querySelectorAll<HTMLElement>('a, button')].filter(
          Boolean,
        ) as HTMLElement[];
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    const mq = window.matchMedia('(min-width: 1200px)');
    const onMq = () => mq.matches && setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    mq.addEventListener('change', onMq);
    return () => {
      document.removeEventListener('keydown', onKey);
      mq.removeEventListener('change', onMq);
      document.documentElement.classList.remove('is-locked');
    };
  }, [menuOpen]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  // The admin panel has its own navigation; stream overlays have none at all.
  if (pathname.startsWith('/admin') || pathname.startsWith('/overlay')) return null;

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header
        className={`site-header ${scrolled || !isHome ? 'is-solid' : ''} ${menuOpen ? 'is-menu-open' : ''}`}
        data-header
      >
        <div className="container site-header__inner">
          <Link href="/" className="site-header__brand" aria-label="FGDR — FatGuysDontRun, home">
            {logo}
            <span className="site-header__word">
              <span className="site-header__fgdr">FGDR</span>
              <span className="site-header__full">FatGuysDontRun</span>
            </span>
          </Link>

          <nav className="site-nav" aria-label="Primary">
            <ul>
              {PRIMARY_NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} aria-current={isActive(item.href) ? 'page' : undefined}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="site-header__end">
            <Link
              href="/live"
              className={`live-indicator ${liveList.length ? 'is-on' : ''}`}
              aria-label={
                liveList.length
                  ? `${liveList.length} of ${streamers.length} FGDR creators live now`
                  : 'No FGDR creators are live right now'
              }
            >
              {liveList.length ? <LiveDot /> : <span className="live-indicator__off" aria-hidden="true" />}
              <span className="live-indicator__label">{liveList.length ? 'Live now' : 'Offline'}</span>
              {liveList.length ? (
                <span className="live-indicator__count tabular">
                  {liveList.length}/{streamers.length}
                </span>
              ) : null}
            </Link>

            {session ? (
              <UserMenu session={session} />
            ) : (
              <Link href="/login" className="btn btn--discord btn--sm site-header__login">
                <Icon name="discord" />
                <span className="site-header__login-long">Login with Discord</span>
                <span className="site-header__login-short">Login</span>
              </Link>
            )}

            <button
              ref={menuBtn}
              type="button"
              className="menu-btn"
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span className="sr-only">{menuOpen ? 'Close menu' : 'Open menu'}</span>
              <span className="menu-btn__bars" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------ Drawer */}
      <div
        className={`mnav ${menuOpen ? 'is-open' : ''}`}
        id="mobile-nav"
        aria-hidden={!menuOpen}
        inert={!menuOpen}
        onClick={(e) => {
          if (e.target === e.currentTarget) setMenuOpen(false);
        }}
      >
        <div ref={drawer} className="mnav__panel" role="dialog" aria-modal="true" aria-label="Site menu">
          <nav aria-label="Mobile">
            <ol className="mnav__list">
              {PRIMARY_NAV.map((item, i) => (
                <li key={item.href} style={{ ['--i' as string]: i }}>
                  <Link href={item.href} aria-current={isActive(item.href) ? 'page' : undefined}>
                    <span className="mnav__num">{String(i + 1).padStart(2, '0')}</span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ol>
            <ul className="mnav__secondary">
              {[...CONTENT_NAV, ...SECONDARY_NAV].map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mnav__live">
            <p className="kicker">On Kick right now</p>
            <ul>
              {streamers.map((s) => {
                const state = live[s.id];
                return (
                  <li key={s.id}>
                    <Link href={`/streamers/${s.id}`} className={state?.isLive ? 'is-live' : ''}>
                      <Medallion monogram={s.monogram} accent={s.accent} size="sm" live={state?.isLive} />
                      <span className="mnav__name">{s.displayName}</span>
                      <span className="mnav__state">
                        {state?.isLive ? `${state.viewers ? compact(state.viewers) : ''} watching` : 'Offline'}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mnav__cta">
            <Link className="btn btn--gold btn--lg btn--block" href="/live">
              <LiveDot />
              Watch live
            </Link>
            {session ? (
              <Link className="btn btn--ghost btn--lg btn--block" href="/dashboard">
                <Icon name="dashboard" />
                My dashboard
              </Link>
            ) : (
              <Link className="btn btn--discord btn--lg btn--block" href="/login">
                <Icon name="discord" />
                Login with Discord
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function UserMenu({ session }: { session: NonNullable<SessionView> }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="user-menu" ref={wrap}>
      <button
        type="button"
        className="user-menu__btn"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={session.avatarUrl} alt="" width={36} height={36} className="user-menu__avatar" />
        <span className="user-menu__name">{session.name}</span>
        <Icon name="chevron-down" className="user-menu__caret" />
      </button>

      <div className={`user-menu__panel ${open ? 'is-open' : ''}`} role="menu" hidden={!open}>
        <div className="user-menu__head">
          <p className="user-menu__title">{session.name}</p>
          <p className="muted">@{session.handle}</p>
          {session.role !== 'member' ? <span className="tag tag--gold">{session.role}</span> : null}
        </div>
        <Link role="menuitem" href="/dashboard">
          <Icon name="dashboard" />
          Dashboard
        </Link>
        <Link role="menuitem" href="/account">
          <Icon name="settings" />
          Account &amp; linked accounts
        </Link>
        {session.role === 'admin' ? (
          <Link role="menuitem" href="/admin">
            <Icon name="shield" />
            Admin
          </Link>
        ) : null}
        <form action="/api/auth/logout" method="post">
          <button role="menuitem" type="submit">
            <Icon name="logout" />
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
