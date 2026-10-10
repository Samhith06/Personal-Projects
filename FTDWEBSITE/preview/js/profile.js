/* FGDR streamer profile page (streamer.html?id=<kick username>) */
(function () {
  const API = window.FGDR_API;
  const UI = window.UI;
  const L = window.Layout;
  const { esc, fmt, icon } = UI;
  const $ = (sel) => document.querySelector(sel);

  UI.injectSprite();
  L.renderHeader($('#site-header'), { base: 'index.html' });

  const reminders = new Set((() => { try { return JSON.parse(localStorage.getItem('fgdr:reminders')) || []; } catch { return []; } })());
  const saveReminders = () => { try { localStorage.setItem('fgdr:reminders', JSON.stringify([...reminders])); } catch { /* storage unavailable */ } };

  const id = new URLSearchParams(location.search).get('id');

  function renderHero(s, l, index) {
    const hero = $('[data-mount="p-hero"]');
    hero.className = `p-hero tone-${s.accent}${l?.isLive ? ' is-live' : ''}`;
    hero.removeAttribute('aria-busy');
    hero.innerHTML = `
      <div class="p-hero__bg" aria-hidden="true">
        ${s.bannerUrl ? `<img src="${esc(s.bannerUrl)}" alt="">` : ''}
        <span class="p-hero__word">${esc(s.displayName)}</span>
      </div>
      <div class="container p-hero__inner">
        <a class="p-back" href="index.html#crew">${icon('arrow-right')}The crew</a>
        <div class="p-hero__row">
          <div class="p-hero__id">
            ${UI.Avatar({ ...s, size: 'xl', live: l?.isLive })}
            <div>
              <p class="kicker">${String(index).padStart(2, '0')} — ${esc(s.role)}</p>
              <h1 class="p-hero__name">${esc(s.displayName)}</h1>
              <div class="p-hero__meta">
                ${UI.StatusBadge(l?.isLive)}
                <span>${icon('kick')}kick.com/${esc(s.kick.username)}</span>
                <span>${icon('users')}${fmt.num(s.stats.followers)} followers</span>
              </div>
            </div>
          </div>
          <div class="p-hero__actions">
            <a class="btn ${l?.isLive ? 'btn--gold' : 'btn--ghost'} btn--lg" href="${esc(s.kick.url)}" target="_blank" rel="noopener noreferrer">
              ${l?.isLive ? '<span class="live-dot" aria-hidden="true"></span>Watch live on Kick' : `${icon('kick')}Follow on Kick`}
            </a>
            ${UI.SocialLinks(s, { includeKick: false })}
          </div>
        </div>
      </div>`;
  }

  function renderLiveCard(s, l, next) {
    const el = $('[data-mount="p-live"]');
    el.classList.toggle('is-live', !!l?.isLive);
    if (l?.isLive) {
      el.innerHTML = `
        <div class="p-live__player">${window.KickPlayer.Player(s, l, { autoplay: true })}</div>
        <p class="p-live__title">${esc(l.title)}</p>
        <dl class="p-live__meta">
          <div><dt>Category</dt><dd>${esc(l.category)}</dd></div>
          <div><dt>Live for</dt><dd>${fmt.duration((Date.now() - new Date(l.startedAt).getTime()) / 60e3)}</dd></div>
        </dl>
        <a class="btn btn--gold" href="${esc(s.kick.url)}" target="_blank" rel="noopener noreferrer">Watch on Kick${icon('external')}</a>`;
      window.KickPlayer.setLookup((u) => (u === s.kick.username ? { streamer: s, live: l } : null));
      window.KickPlayer.observe(el);
    } else {
      el.innerHTML = `
        <header class="p-card__head">${UI.StatusBadge(false)}<span class="muted p-live__last">Last live ${esc(fmt.relTime(l?.lastLiveAt || new Date().toISOString()))}</span></header>
        ${next
          ? `<p class="kicker">Next stream</p><p class="p-live__title">${esc(next.title)}</p><p class="muted">${esc(fmt.relDay(next.startsAt))} · ${esc(fmt.time(next.startsAt))} · ${UI.Countdown(next.startsAt, { compact: true })}</p>`
          : '<p class="p-live__title muted">No upcoming stream scheduled</p>'}
        <a class="btn btn--ghost" href="${esc(s.kick.url)}" target="_blank" rel="noopener noreferrer">${icon('bell')}Get live alerts on Kick</a>`;
    }
  }

  function renderSchedule(items) {
    const mount = $('[data-mount="p-schedule"]');
    mount.innerHTML = items.length
      ? `<ol class="p-sched">${items.map((i) => {
          const on = reminders.has(i.id);
          return `<li class="p-sched__item${i.special ? ' is-special' : ''}">
            <time class="sched__date" datetime="${esc(i.startsAt)}"><span>${esc(fmt.day(i.startsAt))}</span><b>${fmt.dayNum(i.startsAt)}</b><span>${esc(fmt.month(i.startsAt))}</span></time>
            <div class="p-sched__main"><p>${esc(i.title)}</p><span>${esc(fmt.time(i.startsAt))} · ${fmt.duration(i.durationMin)} · Kick</span></div>
            <button class="p-sched__remind" type="button" data-remind="${esc(i.id)}" aria-pressed="${on}" aria-label="${on ? 'Remove reminder' : 'Remind me'} for ${esc(i.title)}">${icon(on ? 'check' : 'bell')}</button>
          </li>`;
        }).join('')}</ol>`
      : UI.SectionEmpty({ title: 'Nothing scheduled', body: 'New streams are posted here as soon as they’re announced.', iconName: 'calendar' });
    mount.onclick = (e) => {
      const b = e.target.closest('[data-remind]');
      if (!b) return;
      reminders.has(b.dataset.remind) ? reminders.delete(b.dataset.remind) : reminders.add(b.dataset.remind);
      saveReminders();
      renderSchedule(items);
      L.toast(reminders.has(b.dataset.remind) ? 'Reminder saved.' : 'Reminder removed.');
    };
  }

  async function boot() {
    const [streamers, live, site] = await Promise.all([API.getStreamers(), API.getLiveStatus(), API.getSite()]);
    const index = Math.max(0, streamers.findIndex((s) => s.id === id));
    const s = streamers[index];
    const l = live[s.id];
    document.title = `${s.displayName} — FGDR`;

    const [schedule, streams, challenges, milestones] = await Promise.all([
      API.getSchedule(s.id), API.getRecentStreams(s.id), API.getChallenges(), API.getChannelMilestones(s.id),
    ]);

    const H = window.Highlights;
    H.setStreamers(streamers);
    $('[data-mount="p-upload"]').dataset.streamer = s.id;
    const renderHighlights = async () => {
      const [wins, clips] = await Promise.all([API.getWins({ streamerId: s.id }), API.getClips({ streamerId: s.id })]);
      H.remember({ wins, clips });
      $('[data-mount="p-wins"]').innerHTML = wins.length
        ? wins.slice(0, 3).map((w, i) => H.WinCard(w, i + 1)).join('')
        : UI.SectionEmpty({ title: 'No big wins yet', body: 'Verified wins from this channel will land here.', iconName: 'crown' });
      $('[data-mount="p-clips"]').innerHTML = clips.length
        ? clips.slice(0, 6).map(H.ClipCard).join('')
        : UI.SectionEmpty({ title: 'No clips yet', body: 'Clips from Kick, X, Instagram, YouTube and TikTok will show up here.', iconName: 'film' });
    };
    renderHighlights();
    document.addEventListener('fgdr:highlights-updated', renderHighlights);

    renderHero(s, l, index + 1);
    renderLiveCard(s, l, schedule[0]);
    L.updateLiveUI(streamers, live);

    $('[data-mount="p-about"]').innerHTML = `<p class="p-bio">${esc(s.bio)}</p>`;

    const st = s.stats;
    $('[data-mount="p-stats"]').innerHTML = [
      ['This month', fmt.usd(st.monthWager), true],
      ['All-time community wager', fmt.usd(st.allTimeWager)],
      ['Avg. viewers', fmt.num(st.avgViewers)],
      ['Peak viewers', fmt.num(st.peakViewers)],
      ['Raffles hosted', st.rafflesHosted],
      ['Challenges hosted', st.challengesHosted],
    ].map(([k, v, hi]) => `<div${hi ? ' class="is-hi"' : ''}><dt>${k}</dt><dd>${v}</dd></div>`).join('');

    $('[data-mount="p-streams"]').innerHTML = streams.length
      ? `<ol class="p-streams">${streams.map((v) => `
          <li class="p-stream">
            <span class="p-stream__thumb tone-${s.accent}" aria-hidden="true"><span class="thumb-art"></span>${icon('play')}</span>
            <div class="p-stream__main">
              <p class="p-stream__title">${esc(v.title)}</p>
              <p class="p-stream__meta"><span>${esc(fmt.date(v.at))}</span><span>${fmt.duration(v.durationMin)}</span><span>${esc(v.category)}</span></p>
            </div>
            <span class="p-stream__peak"><b>${fmt.compact(v.peakViewers)}</b><span>peak</span></span>
          </li>`).join('')}</ol>`
      : UI.SectionEmpty({ title: 'No recent streams', body: 'Past broadcasts will appear here.', iconName: 'signal' });

    const hosted = challenges.filter((c) => c.hostId === s.id);
    $('[data-mount="p-challenges"]').innerHTML = hosted.length
      ? hosted.map((c) => UI.ChallengeCard(c, streamers)).join('')
      : UI.SectionEmpty({ title: 'No challenges hosted yet', body: 'Community challenges from this creator will show up here.', iconName: 'flag' });

    $('[data-mount="p-milestones"]').innerHTML = milestones.map((m) => `
      <li>
        <div class="p-ms__row"><span>${esc(m.label)}</span><span><b>${fmt.value(m.current, m.format)}</b> / ${fmt.value(m.target, m.format)}</span></div>
        ${UI.ProgressBar({ value: m.current, max: m.target, label: `${m.label} milestone`, tone: 'gold', size: 'progress--thin' })}
      </li>`).join('');

    $('[data-tz]').textContent = fmt.tz();
    renderSchedule(schedule);

    $('[data-mount="p-crew"]').innerHTML = streamers
      .filter((o) => o.id !== s.id)
      .map((o, i) => UI.CrewRow(o, live[o.id], streamers.indexOf(o) + 1))
      .join('');

    L.renderFooter($('#site-footer'), { streamers, site, base: 'index.html' });
    L.tickCountdowns();
    L.observeReveal();
  }

  boot().catch((err) => console.error('Profile boot failed', err));
})();
