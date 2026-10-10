/* FGDR homepage: wires data from FGDR_API into components. */
(function () {
  const API = window.FGDR_API;
  const UI = window.UI;
  const L = window.Layout;
  const $ = (sel, root = document) => root.querySelector(sel);

  UI.injectSprite();
  L.renderHeader($('#site-header'));

  const state = { streamers: [], live: {}, schedule: [], period: 'week', raffleTab: 'active', schedFilter: 'all', raffles: [], winSort: 'multiplier', clips: [], clipSource: 'all', clipLimit: 8 };
  const LIVE_POLL_MS = 60e3;

  const reminders = new Set(readStore('fgdr:reminders', []));
  function readStore(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  }
  function writeStore(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
  }

  /* ---------------------------------------------------------------- Hero video */
  function setupHero() {
    const hero = $('.hero');
    const video = $('.hero__video');
    if (!video) return;

    // Brand logo inside the hero
    $('[data-hero-logo]').innerHTML = UI.Logo({ className: 'logo-frame--hero', eager: true });

    const conn = navigator.connection || {};
    const slow = conn.saveData || /(^|-)2g|3g/.test(conn.effectiveType || '');
    const fallbackOnly = () => hero.classList.add('is-poster-only');

    if (L.reduceMotion.matches || slow) return fallbackOnly();

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.loop = true;
    video.autoplay = true;
    video.preload = window.matchMedia('(max-width: 720px)').matches ? 'metadata' : 'auto';
    video.src = video.dataset.src;

    video.addEventListener('playing', () => video.classList.add('is-playing'), { once: true });
    video.addEventListener('error', fallbackOnly, { once: true });
    const tryPlay = () => video.play().catch(fallbackOnly);
    if (video.readyState >= 2) tryPlay(); else video.addEventListener('canplay', tryPlay, { once: true });

    // Pause when off-screen to save battery/CPU
    new IntersectionObserver(([en]) => {
      if (hero.classList.contains('is-poster-only')) return;
      if (en.isIntersecting) video.play().catch(() => {}); else video.pause();
    }, { threshold: 0.05 }).observe(hero);

    L.reduceMotion.addEventListener('change', (m) => { if (m.matches) { video.pause(); fallbackOnly(); } });

    // Ambient particles (desktop gets more, mobile fewer)
    const host = $('.hero__particles');
    const count = window.matchMedia('(max-width: 720px)').matches ? 8 : 18;
    host.innerHTML = Array.from({ length: count }, () => {
      const x = Math.random() * 100, d = 14 + Math.random() * 16, delay = -Math.random() * d, dx = (Math.random() - 0.5) * 80;
      const o = 0.25 + Math.random() * 0.5, size = 1 + Math.random() * 2.2, cyan = Math.random() < 0.35;
      return `<span style="--x:${x}%;--d:${d}s;--delay:${delay}s;--dx:${dx}px;--o:${o};--size:${size}px" class="${cyan ? 'is-cyan' : ''}"></span>`;
    }).join('');
  }

  /* ------------------------------------------------------------------ Live now */
  function nextStreamFor(id) {
    return state.schedule.find((s) => s.streamerId === id);
  }

  let liveSignature = '';

  function renderLive() {
    const mount = $('[data-mount="live"]');
    const { streamers, live } = state;
    // Live creators first, primary channel first within each group
    const ordered = [...streamers].sort((a, b) => (live[b.id]?.isLive ? 1 : 0) - (live[a.id]?.isLive ? 1 : 0) || a.order - b.order);
    const signature = ordered.map((s) => `${s.id}:${live[s.id]?.isLive ? 1 : 0}`).join('|');

    if (signature === liveSignature) {
      // Nobody went live or offline: update numbers in place so running players aren't reloaded
      ordered.forEach((s) => {
        const l = live[s.id];
        const card = mount.querySelector(`[data-streamer="${s.id}"]`);
        if (!card || !l?.isLive) return;
        card.querySelector('[data-viewers]').textContent = UI.fmt.num(l.viewers);
        card.querySelector('[data-uptime]').textContent = UI.liveUptime(l);
        card.querySelector('[data-category]').textContent = l.category;
        card.querySelector('[data-title]').textContent = l.title;
      });
    } else {
      liveSignature = signature;
      let autoplaySlots = window.KickPlayer.MAX_AUTOPLAY;
      mount.innerHTML = ordered
        .map((s) => UI.StreamerCard(s, live[s.id], nextStreamFor(s.id), { autoplay: !!live[s.id]?.isLive && autoplaySlots-- > 0 }))
        .join('');
      window.KickPlayer.observe(mount);
    }

    const liveList = streamers.filter((s) => live[s.id]?.isLive);
    const viewers = liveList.reduce((sum, s) => sum + (live[s.id].viewers || 0), 0);
    $('[data-live-summary]').innerHTML = liveList.length
      ? `<span class="live-summary__n"><span class="live-dot" aria-hidden="true"></span>${liveList.length} of ${streamers.length} live</span><span class="live-summary__v">${UI.fmt.num(viewers)} watching</span>`
      : `<span class="live-summary__n is-off">Nobody is live right now</span><a class="link-arrow" href="#schedule">See the schedule${UI.icon('arrow-right')}</a>`;

    const heroCta = $('[data-hero-watch]');
    if (heroCta) heroCta.classList.toggle('has-live', liveList.length > 0);

    L.updateLiveUI(streamers, live);
  }

  async function pollLive() {
    try {
      state.live = await API.getLiveStatus();
      renderLive();
    } catch (err) {
      console.warn('Live status refresh failed', err);
    }
  }

  /* ---------------------------------------------------------------------- Crew */
  function renderCrew() {
    const [primary, ...rest] = state.streamers;
    $('[data-mount="crew"]').innerHTML = `
      ${UI.CrewFeature(primary, state.live[primary.id])}
      <div class="crew-list">${rest.map((s, i) => UI.CrewRow(s, state.live[s.id], i + 2)).join('')}</div>`;
  }

  /* ------------------------------------------------------ Wall of Fame + Clips */
  const H = window.Highlights;
  const CLIPS_PAGE = 8;

  async function loadWins(sort = state.winSort) {
    state.winSort = sort;
    const mount = $('[data-mount="wins"]');
    mount.classList.add('is-loading');
    try {
      const wins = await API.getWins({ sort });
      if (state.winSort !== sort) return;
      H.remember({ wins });
      const [top, ...rest] = wins;
      mount.innerHTML = top
        ? `${H.WinFeature(top, sort)}<div class="win-grid">${rest.slice(0, 6).map((w, i) => H.WinCard(w, i + 2)).join('')}</div>`
        : UI.SectionEmpty({ title: 'The wall is waiting', body: 'The first verified big win will take the top spot.', iconName: 'crown' });
    } finally {
      mount.classList.remove('is-loading');
    }
  }

  async function loadClips() {
    state.clips = await API.getClips();
    H.remember({ clips: state.clips });
    renderClips();
  }

  function renderClips() {
    const all = state.clips || [];
    const list = all.filter((c) => state.clipSource === 'all' || c.source === state.clipSource);
    const visible = list.slice(0, state.clipLimit);
    $('[data-mount="clip-filters"]').innerHTML = H.SourceChips(all, state.clipSource);
    $('[data-mount="clips"]').innerHTML = visible.length
      ? visible.map(H.ClipCard).join('')
      : UI.SectionEmpty({ title: 'No clips yet', body: 'Clips from this platform will show up here.', iconName: 'film' });
    $('[data-mount="clips-more"]').innerHTML = list.length > visible.length
      ? `<button class="btn btn--ghost" type="button" data-action="clips-more">Show more clips · ${list.length - visible.length} more</button>`
      : '';
  }

  $('[data-mount="clip-filters"]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-source]');
    if (!b) return;
    state.clipSource = b.dataset.source;
    state.clipLimit = CLIPS_PAGE;
    renderClips();
  });

  // Fired when an admin approves a submission: refresh the public lists.
  document.addEventListener('fgdr:highlights-updated', async (e) => {
    state.clipSource = 'all';
    state.clipLimit = CLIPS_PAGE;
    await Promise.all([loadClips(), e.detail.win ? loadWins('latest').then(() => selectTab('wins', 'latest')) : null]);
  });

  function selectTab(group, value) {
    document.querySelectorAll(`[data-tabs="${group}"] [role="tab"]`).forEach((t) => {
      const on = t.dataset.value === value;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
  }

  /* --------------------------------------------------------------------- Stats */
  async function loadStats() {
    const stats = await API.getStats();
    const mount = $('[data-mount="stats"]');
    mount.innerHTML = stats.map(UI.StatCounter).join('');
    mount.querySelectorAll('[data-count]').forEach((el) => (el.textContent = UI.fmt.value(0, el.dataset.format)));
    mount.closest('.reveal')?.classList.contains('is-in') && mount.querySelectorAll('[data-count]').forEach((el) => {
      // Section already revealed before data arrived — trigger manually
      el.dataset.counted = '';
      el.closest('.reveal').classList.remove('is-in');
    });
    L.observeReveal(mount.parentElement);
  }

  /* --------------------------------------------------------------- Leaderboard */
  async function loadLeaderboard(period) {
    state.period = period;
    const panel = $('[data-mount="leaderboard"]');
    panel.classList.add('is-loading');
    panel.setAttribute('aria-busy', 'true');
    try {
      const b = await API.getLeaderboard(period);
      if (state.period !== period) return; // a newer tab was chosen meanwhile
      const top = b.entries.slice(0, 3);
      const rest = b.entries.slice(3);
      panel.innerHTML = `
        <div class="podium-grid">${top.map(UI.PodiumCard).join('')}</div>
        <div class="lb-layout">
          <div class="lb-table">
            <div class="lb-head" aria-hidden="true"><span>Rank</span><span>Player</span><span>Wagered</span><span>Progress</span><span>Prize</span><span>Move</span></div>
            <ol class="lb-rows" start="4">${rest.map((e, i) => UI.LeaderRow(e, b.entries[i + 2])).join('')}</ol>
          </div>
          <aside class="lb-side" aria-label="Prize tier progress">${UI.TierPanel(b)}</aside>
        </div>`;
      L.tickCountdowns();
    } catch (err) {
      panel.innerHTML = UI.SectionEmpty({ title: 'Leaderboard unavailable', body: 'We couldn’t load the standings. Please try again shortly.', iconName: 'chart' });
    } finally {
      panel.classList.remove('is-loading');
      panel.removeAttribute('aria-busy');
    }
  }

  function setupTabs(root, onSelect) {
    const tabs = [...root.querySelectorAll('[role="tab"]')];
    const select = (tab, focus) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
      });
      if (focus) tab.focus();
      onSelect(tab.dataset.value, tab);
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => t.getAttribute('aria-selected') !== 'true' && select(t));
      t.addEventListener('keydown', (e) => {
        const dir = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (dir) { e.preventDefault(); select(tabs[(i + dir + tabs.length) % tabs.length], true); }
        if (e.key === 'Home') { e.preventDefault(); select(tabs[0], true); }
        if (e.key === 'End') { e.preventDefault(); select(tabs[tabs.length - 1], true); }
      });
    });
  }

  /* ------------------------------------------------------------------- Raffles */
  function renderRaffles() {
    const mount = $('[data-mount="raffles"]');
    const list = state.raffles.filter((r) => r.status === state.raffleTab);
    const counts = state.raffles.reduce((acc, r) => ((acc[r.status] = (acc[r.status] || 0) + 1), acc), {});
    document.querySelectorAll('[data-raffle-count]').forEach((el) => (el.textContent = counts[el.dataset.raffleCount] || 0));
    mount.innerHTML = list.length
      ? list.map(UI.RaffleCard).join('')
      : UI.SectionEmpty({ title: `No ${state.raffleTab} raffles`, body: 'New draws are announced on stream and in the Discord first.', iconName: 'ticket' });
    L.tickCountdowns();
  }

  /* ---------------------------------------------------------------- Challenges */
  async function loadChallenges() {
    const list = await API.getChallenges();
    $('[data-mount="challenges"]').innerHTML = list.map((c) => UI.ChallengeCard(c, state.streamers)).join('');
    L.tickCountdowns();
  }

  /* ---------------------------------------------------------------- Milestones */
  async function loadMilestones() {
    const { member, tiers } = await API.getMilestones();
    const w = member.wagered;
    const next = tiers.find((t) => w < t.threshold);
    $('[data-mount="milestones-summary"]').innerHTML = `
      <div class="ms-summary__who"><span class="kicker">${UI.esc(member.label)}</span><strong>${UI.fmt.usd(w)}</strong><span class="muted">wagered to date</span></div>
      ${next ? `<div class="ms-summary__next"><span class="kicker">Next unlock</span><strong>${UI.esc(next.name)}</strong><span class="muted">${UI.fmt.usd(next.threshold - w)} to go</span></div>` : ''}
      <button class="btn btn--ghost btn--sm" type="button" data-action="link-account">Track my progress</button>`;
    let prev = 0;
    $('[data-mount="milestones"]').innerHTML = tiers
      .map((t, i) => { const html = UI.MilestoneStep(t, prev, w, i + 1); prev = t.threshold; return html; })
      .join('');
  }

  /* ------------------------------------------------------------------ Activity */
  async function loadActivity() {
    const [items, ann] = await Promise.all([API.getActivity(), API.getAnnouncement()]);
    $('[data-mount="activity"]').innerHTML = items.length
      ? `<ol class="feed">${items.map(UI.ActivityItem).join('')}</ol>`
      : UI.SectionEmpty({ title: 'Quiet for now', body: 'Community updates will show up here.', iconName: 'megaphone' });

    const crew = state.streamers.filter((s) => ann.streamerIds.includes(s.id));
    $('[data-mount="announcement"]').innerHTML = `
      <p class="kicker">${UI.icon('megaphone')}${UI.esc(ann.kicker)}</p>
      <h3 class="announce__title">${UI.esc(ann.title)}</h3>
      <p class="announce__body">${UI.esc(ann.body)}</p>
      <div class="announce__crew">${crew.map((s) => UI.Avatar({ ...s, size: 'md', label: s.displayName })).join('')}</div>
      <div class="announce__when">
        <div><span class="kicker">Goes live</span><strong>${UI.esc(UI.fmt.relDay(ann.at))} · ${UI.esc(UI.fmt.time(ann.at))}</strong></div>
        ${UI.Countdown(ann.at, { label: 'Special stream starts in' })}
      </div>`;
    L.tickCountdowns();
  }

  /* ------------------------------------------------------------------ Schedule */
  function renderSchedule() {
    const mount = $('[data-mount="schedule"]');
    const byId = Object.fromEntries(state.streamers.map((s) => [s.id, s]));
    const list = state.schedule.filter((i) => state.schedFilter === 'all' || i.streamerId === state.schedFilter);
    const LIMIT = 6;
    const visible = state.schedExpanded ? list : list.slice(0, LIMIT);
    mount.innerHTML = list.length
      ? `<ol class="sched-list">${visible.map((i) => UI.ScheduleRow(i, byId[i.streamerId], { reminded: reminders.has(i.id) })).join('')}</ol>
         ${list.length > LIMIT ? `<div class="sched-more"><button class="btn btn--ghost" type="button" data-action="sched-toggle" aria-expanded="${!!state.schedExpanded}">${state.schedExpanded ? 'Show less' : `View full week · ${list.length} streams`}</button></div>` : ''}`
      : UI.SectionEmpty({ title: 'No streams scheduled', body: 'This creator hasn’t posted upcoming streams yet. Follow on Kick to get notified.', iconName: 'calendar' });
  }

  function renderScheduleFilters() {
    const wrap = $('[data-mount="schedule-filters"]');
    const opts = [{ id: 'all', label: 'All creators' }, ...state.streamers.map((s) => ({ id: s.id, label: s.displayName }))];
    wrap.innerHTML = opts
      .map((o) => `<button type="button" class="chip${o.id === state.schedFilter ? ' is-active' : ''}" aria-pressed="${o.id === state.schedFilter}" data-filter="${UI.esc(o.id)}">${UI.esc(o.label)}</button>`)
      .join('');
    wrap.onclick = (e) => {
      const b = e.target.closest('[data-filter]');
      if (!b) return;
      state.schedFilter = b.dataset.filter;
      renderScheduleFilters();
      renderSchedule();
    };
    $('[data-tz]').textContent = UI.fmt.tz();
  }

  /* -------------------------------------------------------- Delegated actions */
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;
    if (action === 'remind') {
      const id = el.dataset.id;
      reminders.has(id) ? reminders.delete(id) : reminders.add(id);
      writeStore('fgdr:reminders', [...reminders]);
      renderSchedule();
      L.toast(reminders.has(id) ? 'Reminder saved. Notifications connect to your account in the full build.' : 'Reminder removed.');
    } else if (action === 'sched-toggle') {
      state.schedExpanded = !state.schedExpanded;
      renderSchedule();
      if (!state.schedExpanded) document.getElementById('schedule').scrollIntoView({ block: 'start' });
    } else if (action === 'clips-more') {
      state.clipLimit += CLIPS_PAGE;
      renderClips();
    } else if (action === 'enter-raffle') {
      L.toast('Raffle entry opens the verified entry flow in the full build.');
    } else if (action === 'notify') {
      const on = el.getAttribute('aria-pressed') !== 'true';
      el.setAttribute('aria-pressed', String(on));
      el.innerHTML = `${UI.icon(on ? 'check' : 'bell')}${on ? 'We’ll notify you' : 'Notify me'}`;
    } else if (action === 'link-account') {
      L.toast('Account linking arrives with member sign-in in the full build.');
    }
  });

  /* ------------------------------------------------------- Active nav on scroll */
  function setupActiveNav() {
    const links = new Map([...document.querySelectorAll('[data-nav]')].map((a) => [a.dataset.nav, a]));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((a) => a.removeAttribute('aria-current'));
        links.get(en.target.id)?.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach((_, id) => { const sec = document.getElementById(id); if (sec) io.observe(sec); });

    const bar = $('[data-livebar]');
    const hero = $('.hero');
    if (bar && hero) {
      new IntersectionObserver(([en]) => document.documentElement.classList.toggle('past-hero', !en.isIntersecting), { threshold: 0 }).observe(hero);
    }
  }

  /* ---------------------------------------------------------------------- Boot */
  async function boot() {
    setupHero();
    setupActiveNav();
    L.observeReveal();

    // Skeletons while the first requests resolve
    $('[data-mount="live"]').innerHTML = UI.Skeleton('live', 4);
    $('[data-mount="crew"]').innerHTML = UI.Skeleton('crew', 1);
    $('[data-mount="wins"]').innerHTML = UI.Skeleton('board', 1);
    $('[data-mount="clips"]').innerHTML = UI.Skeleton('clip', 4);
    $('[data-mount="leaderboard"]').innerHTML = UI.Skeleton('board', 1);
    $('[data-mount="raffles"]').innerHTML = UI.Skeleton('card', 3);
    $('[data-mount="challenges"]').innerHTML = UI.Skeleton('card', 4);
    $('[data-mount="schedule"]').innerHTML = UI.Skeleton('row', 4);

    const [streamers, live, schedule, site] = await Promise.all([API.getStreamers(), API.getLiveStatus(), API.getSchedule(), API.getSite()]);
    Object.assign(state, { streamers, live, schedule });
    window.KickPlayer.setLookup((username) => {
      const streamer = state.streamers.find((s) => s.kick.username === username);
      return streamer ? { streamer, live: state.live[streamer.id] } : null;
    });
    H.mountQueue($('[data-mount="queue"]'));
    H.setStreamers(streamers);

    renderLive();
    renderCrew();
    renderScheduleFilters();
    renderSchedule();
    L.renderFooter($('#site-footer'), { streamers, site });
    document.querySelectorAll('[data-community-link]').forEach((a) => (a.outerHTML = a.outerHTML.replace('href="#"', UI.extLink(site.communityUrl))));

    setupTabs($('[data-tabs="leaderboard"]'), (v) => loadLeaderboard(v));
    setupTabs($('[data-tabs="raffles"]'), (v) => { state.raffleTab = v; renderRaffles(); });
    setupTabs($('[data-tabs="wins"]'), (v) => loadWins(v));

    await Promise.all([
      loadWins(),
      loadClips(),
      loadStats(),
      loadLeaderboard(state.period),
      API.getRaffles().then((r) => { state.raffles = r; renderRaffles(); }),
      loadChallenges(),
      loadMilestones(),
      loadActivity(),
    ]);
    L.observeReveal();

    setInterval(pollLive, LIVE_POLL_MS);
  }

  boot().catch((err) => console.error('FGDR boot failed', err));
})();
