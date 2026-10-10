/*
 * Kick mini players for live streams.
 *
 * Uses Kick's official embed: https://player.kick.com/<channel>?autoplay=true&muted=true
 *
 * Performance rules (video iframes are heavy):
 *   - Desktop/tablet: the first MAX_AUTOPLAY live cards autoplay MUTED, and only
 *     while at least 40% on screen. Others show a "Watch here" facade.
 *   - Mobile, data-saver, slow connections and reduced-motion: never autoplay;
 *     the player loads only when the viewer taps "Watch here".
 *   - A player that has been off screen for UNLOAD_AFTER_MS is removed to free
 *     bandwidth and CPU; it reloads when scrolled back into view.
 *   - Theater mode opens one large player with sound and unloads the inline copy.
 */
(function () {
  const UI = window.UI;
  const L = window.Layout;
  const { esc, icon } = UI;

  const MAX_AUTOPLAY = 2;
  const UNLOAD_AFTER_MS = 20000;

  const embedUrl = (username, { muted = true } = {}) =>
    `https://player.kick.com/${encodeURIComponent(username)}?autoplay=true&muted=${muted ? 'true' : 'false'}`;

  function canAutoplay() {
    const c = navigator.connection || {};
    return !L.reduceMotion.matches && !c.saveData && !/(^|-)(2g|3g)$/.test(c.effectiveType || '') && window.matchMedia('(min-width: 721px)').matches;
  }

  function createFrame(username, name, muted) {
    const f = document.createElement('iframe');
    f.className = 'kick-frame';
    f.src = embedUrl(username, { muted });
    f.title = `${name} live on Kick`;
    f.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media';
    f.allowFullscreen = true;
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    f.addEventListener('load', () => f.classList.add('is-loaded'), { once: true });
    return f;
  }

  /* ------------------------------------------------------------- Markup */
  // The inline player area for a live card. Badges sit on top without blocking the player's controls.
  const Player = (s, live, { autoplay = false } = {}) => `
    <div class="player tone-${esc(s.accent)}" data-player="${esc(s.kick.username)}" data-name="${esc(s.displayName)}" data-autoplay="${autoplay ? '1' : ''}">
      <div class="player__frame" data-player-frame></div>
      <button type="button" class="player__facade" data-player-play aria-label="Watch ${esc(s.displayName)} live here">
        ${live.thumbnailUrl ? `<img src="${esc(live.thumbnailUrl)}" alt="" loading="lazy">` : `<span class="live-slate">${UI.Avatar({ ...s, size: 'lg', live: true })}</span>`}
        <span class="player__cta"><span class="play-btn play-btn--sm">${icon('play')}</span><span>Watch here</span></span>
      </button>
      <span class="player__badges" aria-hidden="true">
        ${UI.StatusBadge(true)}
        <span class="pill">${icon('eye')}<span data-viewers>${UI.fmt.num(live.viewers || 0)}</span></span>
      </span>
      <button type="button" class="player__expand" data-player-theater aria-label="Open ${esc(s.displayName)}'s stream in theater mode" title="Theater mode">${icon('expand')}</button>
    </div>`;

  /* ----------------------------------------------------- Inline control */
  function load(el, { muted = true } = {}) {
    if (el.classList.contains('is-playing')) return;
    clearTimeout(el._unloadTimer);
    el.querySelector('[data-player-frame]').replaceChildren(createFrame(el.dataset.player, el.dataset.name, muted));
    el.classList.add('is-playing');
  }

  function unload(el) {
    clearTimeout(el._unloadTimer);
    el.querySelector('[data-player-frame]').replaceChildren();
    el.classList.remove('is-playing');
  }

  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => entries.forEach((en) => {
        const el = en.target;
        el._visible = en.isIntersecting;
        clearTimeout(el._unloadTimer);
        if (en.isIntersecting) {
          if (el.dataset.autoplay === '1' && canAutoplay() && theaterUser !== el.dataset.player) load(el);
        } else if (el.classList.contains('is-playing')) {
          el._unloadTimer = setTimeout(() => unload(el), UNLOAD_AFTER_MS);
        }
      }), { threshold: 0.4 })
    : null;

  function observe(root = document) {
    root.querySelectorAll('[data-player]').forEach((el) => {
      if (el._observed) return;
      el._observed = true;
      io?.observe(el);
    });
  }

  /* ------------------------------------------------------------ Theater */
  let theater;
  let theaterUser = null;

  function ensureTheater() {
    if (theater) return theater;
    theater = document.createElement('dialog');
    theater.className = 'lightbox theater';
    theater.setAttribute('aria-labelledby', 'theater-title');
    theater.innerHTML = `
      <div class="lightbox__panel">
        <button class="icon-btn lightbox__close" type="button" data-close aria-label="Close theater mode">${icon('close')}</button>
        <div class="lightbox__stage" data-stage></div>
        <div class="lightbox__info" data-info></div>
      </div>`;
    document.body.appendChild(theater);
    theater.addEventListener('click', (e) => { if (e.target === theater || e.target.closest('[data-close]')) theater.close(); });
    theater.addEventListener('close', () => {
      theater.querySelector('[data-stage]').innerHTML = '';
      const user = theaterUser;
      theaterUser = null;
      // Bring the inline muted preview back if it's still on screen
      document.querySelectorAll('[data-player]').forEach((el) => {
        if (el.dataset.player === user && el._visible && el.dataset.autoplay === '1' && canAutoplay()) load(el);
      });
    });
    return theater;
  }

  function openTheater(s, live) {
    const dlg = ensureTheater();
    theaterUser = s.kick.username;
    document.querySelectorAll('[data-player]').forEach((el) => { if (el.dataset.player === theaterUser) unload(el); });
    dlg.querySelector('[data-stage]').replaceChildren(createFrame(s.kick.username, s.displayName, false));
    dlg.querySelector('[data-info]').innerHTML = `
      <div class="lightbox__badges">${UI.StatusBadge(!!live?.isLive)}${live?.isLive ? `<span class="pill">${icon('eye')}${UI.fmt.num(live.viewers || 0)}</span>` : ''}</div>
      <a class="win__who" href="${UI.profileHref(s)}">${UI.Avatar({ ...s, size: 'md', live: !!live?.isLive })}<span>${esc(s.displayName)}</span></a>
      <h2 class="lightbox__title" id="theater-title">${esc(live?.title || `${s.displayName} on Kick`)}</h2>
      ${live?.isLive ? `<p class="muted lightbox__meta">${esc(live.category)} · live for ${UI.fmt.duration((Date.now() - new Date(live.startedAt).getTime()) / 60e3)}</p>` : ''}
      <div class="lightbox__actions">
        <a class="btn btn--gold btn--sm" href="${esc(s.kick.url)}" target="_blank" rel="noopener noreferrer">${icon('kick')}Open on Kick</a>
        <p class="theater__note">Chat, follows and subs happen on Kick.</p>
      </div>`;
    dlg.showModal();
    dlg.querySelector('[data-close]').focus({ preventScroll: true });
  }

  /* ------------------------------------------------------ Global wiring */
  let lookup = () => null; // (username) => { streamer, live }

  document.addEventListener('click', (e) => {
    const play = e.target.closest('[data-player-play]');
    if (play) {
      // Explicit tap: load with sound (the browser may still start muted; Kick's controls can unmute)
      load(play.closest('[data-player]'), { muted: false });
      return;
    }
    const th = e.target.closest('[data-player-theater]');
    if (th) {
      const data = lookup(th.closest('[data-player]').dataset.player);
      if (data) openTheater(data.streamer, data.live);
    }
  });

  L.reduceMotion.addEventListener?.('change', (m) => {
    if (m.matches) document.querySelectorAll('[data-player].is-playing').forEach(unload);
  });

  window.KickPlayer = {
    MAX_AUTOPLAY,
    Player,
    observe,
    load,
    unload,
    openTheater,
    embedUrl,
    setLookup: (fn) => { lookup = fn; },
  };
})();
