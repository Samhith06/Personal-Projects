/*
 * Shared site shell: header, mobile navigation, footer, and the small set of
 * behaviours every page uses (scroll state, reveal, countdowns, counters, toasts).
 */
(function () {
  const { esc, icon, Logo, fmt } = window.UI;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const NAV = [
    { id: 'home', label: 'Home' },
    { id: 'live', label: 'Live' },
    { id: 'crew', label: 'Streamers' },
    { id: 'wall', label: 'Wall of Fame' },
    { id: 'leaderboard', label: 'Leaderboard' },
    { id: 'raffles', label: 'Raffles' },
    { id: 'challenges', label: 'Challenges' },
    { id: 'milestones', label: 'Milestones' },
  ];

  /* ------------------------------------------------------------------- Header */
  function renderHeader(mount, { base = '' } = {}) {
    mount.innerHTML = `
      <a class="skip-link" href="#main">Skip to content</a>
      <header class="site-header" data-header>
        <div class="container site-header__inner">
          <a class="site-header__brand" href="${base}#home" aria-label="FGDR — FatGuysDontRun, home">
            ${Logo({ className: 'logo-frame--nav', eager: true })}
            <span class="site-header__word" aria-hidden="true">FGDR</span>
          </a>
          <nav class="site-nav" aria-label="Primary">
            <ul>${NAV.map((n) => `<li><a href="${base}#${n.id}" data-nav="${n.id}">${n.label}</a></li>`).join('')}</ul>
          </nav>
          <a class="live-indicator" href="${base}#live" data-live-indicator hidden>
            <span class="live-dot" aria-hidden="true"></span>
            <span class="live-indicator__label">Live now</span>
            <span class="live-indicator__count" data-live-count></span>
          </a>
          <button class="menu-btn" type="button" aria-expanded="false" aria-controls="mobile-nav" data-menu-btn>
            <span class="sr-only">Open menu</span><span class="menu-btn__bars" aria-hidden="true"><span></span><span></span></span>
          </button>
        </div>
      </header>

      <div class="mnav" id="mobile-nav" data-mnav aria-hidden="true">
        <div class="mnav__panel" role="dialog" aria-modal="true" aria-label="Site menu">
          <nav aria-label="Mobile">
            <ol class="mnav__list">${NAV.map((n, i) => `<li style="--i:${i}"><a href="${base}#${n.id}" data-mnav-link><span>${String(i + 1).padStart(2, '0')}</span>${n.label}</a></li>`).join('')}</ol>
          </nav>
          <div class="mnav__live">
            <p class="kicker">On stream right now</p>
            <ul class="mnav__streamers" data-mnav-streamers><li class="muted">Checking Kick…</li></ul>
          </div>
          <div class="mnav__cta">
            <a class="btn btn--gold btn--lg" href="${base}#live" data-mnav-link><span class="live-dot" aria-hidden="true"></span>Watch live</a>
            <a class="btn btn--ghost btn--lg" href="#" data-placeholder>${icon('discord')}Join Discord</a>
          </div>
        </div>
      </div>

      <a class="m-livebar" href="${base}#live" data-livebar hidden>
        <span class="live-dot" aria-hidden="true"></span><span data-livebar-text>Live now</span><span class="m-livebar__cta">Watch${icon('arrow-right')}</span>
      </a>`;

    const header = mount.querySelector('[data-header]');
    const btn = mount.querySelector('[data-menu-btn]');
    const mnav = mount.querySelector('[data-mnav]');

    // Header opacity on scroll
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    // Mobile menu
    const setOpen = (open) => {
      btn.setAttribute('aria-expanded', String(open));
      btn.querySelector('.sr-only').textContent = open ? 'Close menu' : 'Open menu';
      mnav.classList.toggle('is-open', open);
      mnav.setAttribute('aria-hidden', String(!open));
      document.documentElement.classList.toggle('menu-open', open);
      if (open) mnav.querySelector('a')?.focus({ preventScroll: true });
    };
    btn.addEventListener('click', () => setOpen(btn.getAttribute('aria-expanded') !== 'true'));
    mnav.addEventListener('click', (e) => {
      if (e.target === mnav || e.target.closest('[data-mnav-link]')) setOpen(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mnav.classList.contains('is-open')) { setOpen(false); btn.focus(); }
      if (e.key === 'Tab' && mnav.classList.contains('is-open')) {
        const focusables = [btn, ...mnav.querySelectorAll('a, button')];
        const first = focusables[0], last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    window.matchMedia('(min-width: 1240px)').addEventListener('change', (m) => m.matches && setOpen(false));
  }

  /* Live indicator in header, mobile menu and mobile live bar */
  function updateLiveUI(streamers, live) {
    const liveList = streamers.filter((s) => live[s.id]?.isLive);
    const n = liveList.length;
    document.querySelectorAll('[data-live-indicator]').forEach((el) => {
      el.hidden = n === 0;
      el.setAttribute('aria-label', `${n} of ${streamers.length} FGDR creators live now`);
    });
    document.querySelectorAll('[data-live-count]').forEach((el) => (el.textContent = `${n}/${streamers.length}`));
    document.querySelectorAll('[data-livebar]').forEach((el) => (el.hidden = n === 0));
    document.querySelectorAll('[data-livebar-text]').forEach((el) => {
      el.textContent = n === 1 ? `${liveList[0].displayName} is live` : `${n} creators live now`;
    });
    document.querySelectorAll('[data-mnav-streamers]').forEach((ul) => {
      ul.innerHTML = streamers
        .map((s) => {
          const l = live[s.id];
          return `<li><a href="${esc(s.kick.url)}" target="_blank" rel="noopener noreferrer" class="${l?.isLive ? 'is-live' : ''}">
            ${window.UI.Avatar({ ...s, size: 'sm', live: l?.isLive })}
            <span>${esc(s.displayName)}</span>
            <span class="mnav__state">${l?.isLive ? `${fmt.compact(l.viewers)} watching` : 'Offline'}</span></a></li>`;
        })
        .join('');
    });
  }

  /* ------------------------------------------------------------------- Footer */
  function renderFooter(mount, { streamers = [], site = {}, base = '' } = {}) {
    const socials = site.socials || {};
    mount.innerHTML = `
      <footer class="site-footer">
        <div class="container">
          <div class="site-footer__top">
            <div class="site-footer__brand">
              ${Logo({ className: 'logo-frame--footer' })}
              <div>
                <p class="site-footer__word">FGDR</p>
                <p class="site-footer__full">FatGuysDontRun</p>
                <p class="site-footer__line">Four creators. One crew. One community.</p>
              </div>
            </div>
            <div class="site-footer__cols">
              <nav aria-label="The crew">
                <p class="site-footer__h">The crew</p>
                <ul>${streamers.map((s) => `<li><a href="${window.UI.profileHref(s)}">${esc(s.displayName)}</a></li>`).join('')}</ul>
              </nav>
              <nav aria-label="Explore">
                <p class="site-footer__h">Explore</p>
                <ul>${NAV.slice(1).map((n) => `<li><a href="${base}#${n.id}">${n.label}</a></li>`).join('')}<li><a href="${base}#clips">Clips</a></li><li><a href="${base}#schedule">Schedule</a></li></ul>
              </nav>
              <nav aria-label="Community">
                <p class="site-footer__h">Community</p>
                <ul>
                  <li><a ${window.UI.extLink(socials.discord)}>Discord</a></li>
                  <li><a ${window.UI.extLink(socials.x)}>X / Twitter</a></li>
                  <li><a ${window.UI.extLink(socials.instagram)}>Instagram</a></li>
                  <li><a ${window.UI.extLink(socials.youtube)}>YouTube</a></li>
                </ul>
              </nav>
              <nav aria-label="Legal">
                <p class="site-footer__h">Legal</p>
                <ul>
                  <li><a href="#" data-placeholder>Terms of use</a></li>
                  <li><a href="#" data-placeholder>Privacy policy</a></li>
                  <li><a href="#" data-placeholder>Raffle &amp; giveaway rules</a></li>
                  <li><a href="#" data-placeholder>Affiliate disclosure</a></li>
                  <li><a href="#" data-placeholder>Responsible gambling</a></li>
                </ul>
              </nav>
            </div>
          </div>

          <div class="site-footer__legal">
            <div class="age-badge" aria-label="18 plus only"><b>18+</b><span>Only</span></div>
            <div class="site-footer__disclaimer">
              <p><strong>Play responsibly.</strong> Gambling involves real financial risk and can be addictive. Outcomes are never guaranteed, results shown on stream are not typical, and you should only ever gamble with money you can afford to lose. Set limits and take breaks.</p>
              <p>You must be 18+ (or the legal age in your jurisdiction, if higher) to gamble. Online gambling is restricted or illegal in some regions — it is your responsibility to check and follow local laws. FGDR is a group of independent content creators affiliated with Stake and may earn commission through affiliate links. FGDR does not operate a casino, accept wagers or process payments. Raffles, challenges and leaderboard prizes are subject to their published rules; no purchase necessary where required by law.</p>
              <p>Need support? Visit <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer">BeGambleAware.org</a> or, in the US, call <a href="tel:18004262537">1-800-GAMBLER</a>.</p>
            </div>
          </div>

          <div class="site-footer__bottom">
            <p>© ${new Date().getFullYear()} FGDR — FatGuysDontRun. All rights reserved.</p>
            <p class="muted">Design preview · sample data</p>
          </div>
        </div>
        <p class="site-footer__giant" aria-hidden="true">FGDR</p>
      </footer>`;
  }

  /* ------------------------------------------------------------------ Toasts */
  let toastTimer;
  function toast(message) {
    let el = document.querySelector('[data-toast]');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      el.setAttribute('data-toast', '');
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 3200);
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-placeholder]');
    if (a) { e.preventDefault(); toast('Placeholder link — the real URL will be added from the admin dashboard.'); }
  });

  /* ------------------------------------------------------------------ Reveal */
  const revealObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          en.target.classList.add('is-in');
          revealObserver.unobserve(en.target);
          en.target.querySelectorAll('[data-count]').forEach(animateCount);
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 })
    : null;

  function observeReveal(root = document) {
    root.querySelectorAll('.reveal:not(.is-in)').forEach((el) => {
      if (revealObserver) revealObserver.observe(el);
      else el.classList.add('is-in');
    });
  }

  /* ---------------------------------------------------------------- Counters */
  function animateCount(el) {
    if (el.dataset.counted) return;
    el.dataset.counted = '1';
    const target = Number(el.dataset.count);
    const format = el.dataset.format;
    if (reduceMotion.matches) { el.textContent = fmt.value(target, format); return; }
    const dur = 1600;
    const start = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt.value(Math.round(target * eased), format);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* -------------------------------------------------------------- Countdowns */
  function tickCountdowns() {
    const now = Date.now();
    document.querySelectorAll('[data-countdown]').forEach((el) => {
      const diff = Math.max(0, new Date(el.dataset.countdown).getTime() - now);
      const d = Math.floor(diff / 864e5);
      const h = Math.floor((diff % 864e5) / 36e5);
      const m = Math.floor((diff % 36e5) / 6e4);
      const s = Math.floor((diff % 6e4) / 1e3);
      if (el.hasAttribute('data-compact')) {
        el.textContent = diff === 0 ? 'Ended' : d > 0 ? `${d}d ${h}h ${String(m).padStart(2, '0')}m` : `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
        return;
      }
      const vals = { d, h, m, s };
      el.querySelectorAll('[data-u]').forEach((b) => {
        const v = String(vals[b.dataset.u]).padStart(2, '0');
        if (b.textContent !== v) b.textContent = v;
      });
      el.classList.toggle('is-urgent', diff > 0 && diff < 864e5);
    });
  }
  tickCountdowns();
  setInterval(tickCountdowns, 1000);

  window.Layout = { NAV, renderHeader, renderFooter, updateLiveUI, toast, observeReveal, tickCountdowns, reduceMotion };
})();
