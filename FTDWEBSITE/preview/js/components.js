/*
 * FGDR UI components.
 * Small pure functions: data in, HTML string out. Each maps to a component
 * in the production build (React/Next.js) with the same props.
 */
(function () {
  /* ------------------------------------------------------------------ Helpers */
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const usdFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const numFmt = new Intl.NumberFormat('en-US');
  const compactFmt = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

  const fmt = {
    usd: (n) => usdFmt.format(n),
    num: (n) => numFmt.format(n),
    compact: (n) => compactFmt.format(n),
    value: (n, format) => (format === 'currency' ? usdFmt.format(n) : numFmt.format(n)),
    mult: (payout, bet) => {
      const m = bet ? payout / bet : 0;
      return `x${m >= 100 ? numFmt.format(Math.round(m)) : m.toFixed(2).replace(/\.?0+$/, '')}`;
    },
    clock: (sec) => (sec == null ? '' : `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`),
    pct: (cur, target) => Math.max(0, Math.min(100, target ? (cur / target) * 100 : 0)),
    relTime(isoStr) {
      const diff = Date.now() - new Date(isoStr).getTime();
      const past = diff >= 0;
      const m = Math.round(Math.abs(diff) / 60e3);
      let s;
      if (m < 1) return 'just now';
      if (m < 60) s = `${m}m`;
      else if (m < 60 * 24) s = `${Math.round(m / 60)}h`;
      else s = `${Math.round(m / 1440)}d`;
      return past ? `${s} ago` : `in ${s}`;
    },
    duration(min) {
      const h = Math.floor(min / 60), m = Math.round(min % 60);
      return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
    },
    day: (isoStr) => new Date(isoStr).toLocaleDateString('en-US', { weekday: 'short' }),
    dayNum: (isoStr) => new Date(isoStr).getDate(),
    month: (isoStr) => new Date(isoStr).toLocaleDateString('en-US', { month: 'short' }),
    date: (isoStr) => new Date(isoStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    time: (isoStr) => new Date(isoStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    tz: () => new Date().toLocaleTimeString('en-US', { timeZoneName: 'short' }).split(' ').pop(),
    relDay(isoStr) {
      const d = new Date(isoStr); const t = new Date();
      const a = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const b = new Date(t.getFullYear(), t.getMonth(), t.getDate());
      const diff = Math.round((a - b) / 864e5);
      if (diff === 0) return 'Today';
      if (diff === 1) return 'Tomorrow';
      return d.toLocaleDateString('en-US', { weekday: 'long' });
    },
  };

  const icon = (name, cls = '') => `<svg class="icon ${cls}" aria-hidden="true" focusable="false"><use href="#i-${name}"></use></svg>`;
  const isPlaceholder = (url) => !url || url === '#';
  const extLink = (url) => (isPlaceholder(url) ? 'href="#" data-placeholder' : `href="${esc(url)}" target="_blank" rel="noopener noreferrer"`);

  /* ------------------------------------------------------------------ Sprite */
  const SPRITE = `
  <svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">
    <defs>
      <linearGradient id="g-gold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fff4cf"/><stop offset=".35" stop-color="#e9c878"/><stop offset=".62" stop-color="#a97f33"/><stop offset="1" stop-color="#f0d690"/>
      </linearGradient>
      <linearGradient id="g-gold-stroke" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f3dfa2"/><stop offset=".5" stop-color="#c9a24a"/><stop offset="1" stop-color="#8d6a2a"/>
      </linearGradient>
      <radialGradient id="g-ruby" cx=".4" cy=".35" r=".7">
        <stop offset="0" stop-color="#ff7d93"/><stop offset=".55" stop-color="#c4163a"/><stop offset="1" stop-color="#5c0716"/>
      </radialGradient>
    </defs>

    <symbol id="i-kick" viewBox="0 0 24 24"><path fill="currentColor" d="M3 3h6v5h2V6h2V4h2V3h6v6h-2v2h-2v2h2v2h2v6h-6v-1h-2v-2h-2v-2H9v5H3V3Z"/></symbol>
    <symbol id="i-x" viewBox="0 0 24 24"><path fill="currentColor" d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.78L17.75 3Zm-1.08 16.18h1.7L7.41 4.73H5.59l11.08 14.45Z"/></symbol>
    <symbol id="i-instagram" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5"/><circle cx="12" cy="12" r="4"/></g><circle cx="17.4" cy="6.6" r="1.15" fill="currentColor"/></symbol>
    <symbol id="i-youtube" viewBox="0 0 24 24"><path fill="currentColor" fill-rule="evenodd" d="M21.6 7.2a2.5 2.5 0 0 0-1.77-1.77C18.27 5 12 5 12 5s-6.27 0-7.83.43A2.5 2.5 0 0 0 2.4 7.2C2 8.77 2 12 2 12s0 3.23.4 4.8a2.5 2.5 0 0 0 1.77 1.77C5.73 19 12 19 12 19s6.27 0 7.83-.43a2.5 2.5 0 0 0 1.77-1.77c.4-1.57.4-4.8.4-4.8s0-3.23-.4-4.8ZM10 15.02 15.2 12 10 8.98v6.04Z"/></symbol>
    <symbol id="i-discord" viewBox="0 0 24 24"><path fill="currentColor" d="M19.3 5.34A16.5 16.5 0 0 0 15.2 4l-.52 1.06a15.3 15.3 0 0 0-5.36 0L8.8 4a16.5 16.5 0 0 0-4.1 1.34C2.1 9.2 1.4 12.98 1.75 16.7a16.6 16.6 0 0 0 5.03 2.55l1.08-1.76c-.6-.22-1.16-.5-1.7-.82l.42-.33a11.8 11.8 0 0 0 10.84 0l.42.33c-.54.32-1.1.6-1.7.82l1.08 1.76a16.6 16.6 0 0 0 5.03-2.55c.42-4.32-.7-8.07-2.95-11.36ZM8.52 14.43c-.98 0-1.79-.9-1.79-2.02 0-1.11.79-2.02 1.79-2.02s1.8.91 1.79 2.02c0 1.12-.8 2.02-1.8 2.02Zm6.96 0c-.98 0-1.79-.9-1.79-2.02 0-1.11.79-2.02 1.8-2.02 1 0 1.8.91 1.78 2.02 0 1.12-.79 2.02-1.79 2.02Z"/></symbol>
    <symbol id="i-eye" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></g></symbol>
    <symbol id="i-clock" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></g></symbol>
    <symbol id="i-users" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 4.7a3.5 3.5 0 0 1 0 6.6M18.5 14.8c1.7.8 2.8 2.5 3.1 5.2"/></g></symbol>
    <symbol id="i-ticket" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5V10a2 2 0 0 0 0 4v2.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.5V14a2 2 0 0 0 0-4V7.5Z"/><path d="M14.5 6v12" stroke-dasharray="2 2"/></g></symbol>
    <symbol id="i-trophy" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 14v3M8.5 20h7M9.5 17h5"/></g></symbol>
    <symbol id="i-lock" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></g></symbol>
    <symbol id="i-check" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="m5 12.5 4.5 4.5L19 7.5"/></symbol>
    <symbol id="i-bell" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16Z"/><path d="M10 20.5a2 2 0 0 0 4 0"/></g></symbol>
    <symbol id="i-arrow-right" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M4 12h15m-5-5 5 5-5 5"/></symbol>
    <symbol id="i-arrow-down" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M12 4v15m-5-5 5 5 5-5"/></symbol>
    <symbol id="i-external" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></symbol>
    <symbol id="i-caret-up" viewBox="0 0 24 24"><path fill="currentColor" d="M12 6.5 19 16H5l7-9.5Z"/></symbol>
    <symbol id="i-caret-down" viewBox="0 0 24 24"><path fill="currentColor" d="M12 17.5 5 8h14l-7 9.5Z"/></symbol>
    <symbol id="i-megaphone" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10v4a1 1 0 0 0 1 1h3l8 5V4L7 9H4a1 1 0 0 0-1 1Z"/><path d="M19 9a4 4 0 0 1 0 6M7 15l1.5 5"/></g></symbol>
    <symbol id="i-signal" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="2"/><path d="M8.2 8.2a5.4 5.4 0 0 0 0 7.6M15.8 8.2a5.4 5.4 0 0 1 0 7.6M5.3 5.3a9.5 9.5 0 0 0 0 13.4M18.7 5.3a9.5 9.5 0 0 1 0 13.4"/></g></symbol>
    <symbol id="i-chart" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19h16"/><path d="m5 15 4.5-4.5 3.5 3 6-6.5"/><path d="M15 7h4v4"/></g></symbol>
    <symbol id="i-flag" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/></g></symbol>
    <symbol id="i-calendar" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></g></symbol>
    <symbol id="i-expand" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/></symbol>
    <symbol id="i-tiktok" viewBox="0 0 24 24"><path fill="currentColor" d="M16.6 3c.37 2.2 1.75 3.62 3.9 3.9v3.12a7.1 7.1 0 0 1-3.86-1.16v6.36A5.78 5.78 0 1 1 10.86 9.5v3.2a2.66 2.66 0 1 0 2.66 2.66V3h3.08Z"/></symbol>
    <symbol id="i-upload" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M12 15.5V4m-4.5 4.5L12 4l4.5 4.5M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15"/></symbol>
    <symbol id="i-close" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M6 6l12 12M18 6 6 18"/></symbol>
    <symbol id="i-link" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 1 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 1 0 5.66 5.66l1-1"/></symbol>
    <symbol id="i-crown" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" d="M3 8.5 7.5 12 12 5l4.5 7L21 8.5 19 19H5L3 8.5Z"/></symbol>
    <symbol id="i-film" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="4.5" width="18" height="15" rx="2"/><path d="M7 4.5v15M17 4.5v15M3 9h4M3 15h4M17 9h4M17 15h4"/></g></symbol>
    <symbol id="i-verified" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 19 6v5.5c0 4.3-3 7.7-7 9.5-4-1.8-7-5.2-7-9.5V6l7-3Z"/><path d="m8.8 12 2.2 2.2 4.2-4.4"/></g></symbol>
    <symbol id="i-play" viewBox="0 0 24 24"><path fill="currentColor" d="M8 5.5v13a.8.8 0 0 0 1.2.7l10.3-6.5a.8.8 0 0 0 0-1.4L9.2 4.8A.8.8 0 0 0 8 5.5Z"/></symbol>

    <!-- Prize artwork (line illustrations until real prize photography is uploaded) -->
    <symbol id="p-rig" viewBox="0 0 120 120"><g fill="none" stroke="url(#g-gold-stroke)" stroke-width="1.6" stroke-linejoin="round"><rect x="14" y="28" width="62" height="42" rx="3"/><path d="M36 82h18M45 70v12"/><rect x="84" y="24" width="24" height="62" rx="3"/><circle cx="96" cy="38" r="5"/><circle cx="96" cy="56" r="5"/><path d="M89 76h14"/><path d="M22 60l12-14 10 8 14-16 10 6" stroke="#4fd8ff" stroke-opacity=".8"/></g></symbol>
    <symbol id="p-cash" viewBox="0 0 120 120"><g fill="none" stroke="url(#g-gold-stroke)" stroke-width="1.6" stroke-linejoin="round"><rect x="18" y="46" width="72" height="38" rx="3"/><rect x="26" y="38" width="72" height="38" rx="3"/><rect x="34" y="30" width="72" height="38" rx="3"/><circle cx="70" cy="49" r="9"/><path d="M70 43v12M67 46h5a2 2 0 0 1 0 4h-4a2 2 0 0 0 0 4h5"/><path d="M42 38h8M90 60h8" stroke="#4fd8ff" stroke-opacity=".8"/></g></symbol>
    <symbol id="p-console" viewBox="0 0 120 120"><g fill="none" stroke="url(#g-gold-stroke)" stroke-width="1.6" stroke-linejoin="round"><path d="M30 42h60c9 0 14 6 16 16l4 20c2 9-8 14-14 7l-9-10H33l-9 10c-6 7-16 2-14-7l4-20c2-10 7-16 16-16Z"/><path d="M36 54v14M29 61h14"/><circle cx="80" cy="56" r="3"/><circle cx="89" cy="64" r="3"/><path d="M52 50h16" stroke="#4fd8ff" stroke-opacity=".8"/></g></symbol>
    <symbol id="p-travel" viewBox="0 0 120 120"><g fill="none" stroke="url(#g-gold-stroke)" stroke-width="1.6" stroke-linejoin="round"><path d="M14 92h92"/><path d="M22 92V70h10v22M38 92V56h12v36M56 92V62h8v30M70 92V44h14v48M90 92V66h10v26"/><path d="M76 44V36M77 36h-2"/><path d="M26 34l34 6 20-12c4-2 8 1 5 4L68 44l-8 16-5-1 3-14-20-3-6 6-4-1 4-9Z" stroke="#4fd8ff" stroke-opacity=".85"/></g></symbol>
    <symbol id="p-chips" viewBox="0 0 120 120"><g fill="none" stroke="url(#g-gold-stroke)" stroke-width="1.6"><ellipse cx="46" cy="80" rx="24" ry="8"/><path d="M22 80v-8M70 80v-8"/><ellipse cx="46" cy="72" rx="24" ry="8"/><path d="M22 72v-8M70 72v-8"/><ellipse cx="46" cy="64" rx="24" ry="8"/><ellipse cx="82" cy="52" rx="22" ry="22"/><ellipse cx="82" cy="52" rx="14" ry="14" stroke="#4fd8ff" stroke-opacity=".8"/><path d="M82 30v6M82 68v6M60 52h6M98 52h6M66.4 36.4l4.2 4.2M93.4 63.4l4.2 4.2M66.4 67.6l4.2-4.2M93.4 40.6l4.2-4.2"/></g></symbol>
    <symbol id="p-watch" viewBox="0 0 120 120"><g fill="none" stroke="url(#g-gold-stroke)" stroke-width="1.6" stroke-linejoin="round"><path d="M46 16h28l4 20H42l4-20ZM46 104h28l4-20H42l4 20Z"/><circle cx="60" cy="60" r="26"/><circle cx="60" cy="60" r="20" stroke="#4fd8ff" stroke-opacity=".7"/><path d="M60 46v14l9 6"/><path d="M86 56h5v8h-5"/><circle cx="52" cy="70" r="3"/><circle cx="68" cy="50" r="3"/></g></symbol>

    <!-- Placeholder crest: only visible until assets/fgdr-logo.png is added -->
    <symbol id="logo-fallback" viewBox="0 0 200 200">
      <rect x="0" y="0" width="200" height="200" fill="#07090f"/>
      <rect x="7" y="7" width="186" height="186" rx="4" fill="none" stroke="url(#g-gold-stroke)" stroke-width="2.4"/>
      <rect x="13" y="13" width="174" height="174" rx="3" fill="none" stroke="#4fd8ff" stroke-opacity=".55" stroke-width="1"/>
      <path d="M100 34 152 50v46c0 34-22 56-52 70-30-14-52-36-52-70V50l52-16Z" fill="#10141d" stroke="url(#g-gold-stroke)" stroke-width="2.4"/>
      <circle cx="100" cy="38" r="12" fill="url(#g-ruby)" stroke="#f3dfa2" stroke-width="1.6"/>
      <text x="100" y="113" text-anchor="middle" font-family="Archivo, Arial Black, sans-serif" font-weight="900" font-size="44" fill="url(#g-gold)" stroke="#4a360f" stroke-width=".8" style="font-stretch:112%">FGDR</text>
      <ellipse cx="100" cy="150" rx="46" ry="10" fill="none" stroke="#4fd8ff" stroke-opacity=".75" stroke-width="1.4"/>
      <ellipse cx="100" cy="150" rx="30" ry="6" fill="none" stroke="url(#g-gold-stroke)" stroke-width="1.4"/>
    </symbol>
  </svg>`;

  function injectSprite() {
    if (document.getElementById('fgdr-sprite')) return;
    const wrap = document.createElement('div');
    wrap.id = 'fgdr-sprite';
    wrap.innerHTML = SPRITE;
    document.body.prepend(wrap);
  }

  /* -------------------------------------------------------------------- Brand */
  const Logo = ({ className = '', eager = false } = {}) => `
    <span class="logo-frame ${className}">
      <svg class="logo-frame__fallback" viewBox="0 0 200 200" aria-hidden="true"><use href="#logo-fallback"></use></svg>
      <img src="assets/fgdr-logo.png" alt="" width="516" height="516" decoding="async" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} onerror="this.remove()">
      <span class="logo-frame__sweep" aria-hidden="true"></span>
    </span>`;

  /* --------------------------------------------------------------- Primitives */
  const LiveDot = () => '<span class="live-dot" aria-hidden="true"></span>';

  const StatusBadge = (isLive) =>
    isLive
      ? `<span class="status status--live">${LiveDot()}Live</span>`
      : '<span class="status status--off">Offline</span>';

  const Avatar = ({ monogram, avatarUrl, accent = 'gold', size = 'md', live = false, ring = 'gold', label = '' }) => `
    <span class="avatar avatar--${size} ring-${ring} tone-${accent}${live ? ' is-live' : ''}"${label ? ` role="img" aria-label="${esc(label)}"` : ' aria-hidden="true"'}>
      <span class="avatar__inner">${avatarUrl ? `<img src="${esc(avatarUrl)}" alt="" loading="lazy">` : esc(monogram)}</span>
    </span>`;

  const SocialLinks = (s, { includeKick = true, size = '' } = {}) => {
    const items = [];
    if (includeKick) items.push(['kick', s.kick.url, 'Kick']);
    items.push(['x', s.socials.x, 'X'], ['instagram', s.socials.instagram, 'Instagram'], ['youtube', s.socials.youtube, 'YouTube']);
    return `<ul class="socials ${size}">${items
      .map(([key, url, label]) => `<li><a class="social social--${key}" ${extLink(url)} aria-label="${esc(s.displayName)} on ${label}">${icon(key)}</a></li>`)
      .join('')}</ul>`;
  };

  const ProgressBar = ({ value, max, label, tone = 'gold', size = '' }) => {
    const p = fmt.pct(value, max);
    return `<div class="progress progress--${tone} ${size}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(p)}" aria-label="${esc(label)}">
      <span class="progress__fill" style="--p:${p.toFixed(2)}%"></span>
    </div>`;
  };

  const Movement = (m) => {
    if (m === null || m === undefined) return '<span class="move move--new">New</span>';
    if (m === 0) return '<span class="move move--flat" aria-label="No change">—</span>';
    const up = m > 0;
    return `<span class="move move--${up ? 'up' : 'down'}" aria-label="${up ? 'Up' : 'Down'} ${Math.abs(m)}">${icon(up ? 'caret-up' : 'caret-down')}${Math.abs(m)}</span>`;
  };

  const Countdown = (target, { label = 'Ends in', compact = false } = {}) =>
    compact
      ? `<span class="cd-inline" data-countdown="${esc(target)}" data-compact>--</span>`
      : `<div class="cd" data-countdown="${esc(target)}" role="timer" aria-label="${esc(label)}">
          ${['d', 'h', 'm', 's'].map((u) => `<span class="cd__seg"><b data-u="${u}">00</b><i>${{ d: 'Days', h: 'Hrs', m: 'Min', s: 'Sec' }[u]}</i></span>`).join('<span class="cd__sep" aria-hidden="true">:</span>')}
        </div>`;

  const SectionEmpty = ({ title, body, iconName = 'calendar' }) => `
    <div class="empty">
      <span class="empty__icon">${icon(iconName)}</span>
      <p class="empty__title">${esc(title)}</p>
      <p class="empty__body">${esc(body)}</p>
    </div>`;

  const Skeleton = (variant, count = 1) =>
    Array.from({ length: count }, () => `<div class="skeleton skeleton--${variant}" aria-hidden="true"><span></span><span></span><span></span></div>`).join('');

  /* ------------------------------------------------------------ Streamer card */
  const liveUptime = (l) => fmt.duration((Date.now() - new Date(l.startedAt).getTime()) / 60e3);

  const StreamerCard = (s, live, nextStream, { autoplay = false } = {}) => {
    const l = live || { isLive: false };
    const titleText = l.isLive
      ? esc(l.title)
      : nextStream
        ? `<span class="muted">Next stream</span> ${esc(fmt.relDay(nextStream.startsAt))} · ${esc(fmt.time(nextStream.startsAt))}`
        : '<span class="muted">No upcoming stream scheduled</span>';
    const media = l.isLive
      ? `<div class="live-card__media">${window.KickPlayer.Player(s, l, { autoplay })}</div>`
      : `<a class="live-card__media is-offline" href="${esc(s.kick.url)}" target="_blank" rel="noopener noreferrer" tabindex="-1" aria-hidden="true">
          ${l.offlineBannerUrl ? `<img src="${esc(l.offlineBannerUrl)}" alt="" loading="lazy">` : `<span class="offline-slate"><span class="offline-slate__mono">${esc(s.monogram)}</span><span class="offline-slate__label">Offline</span></span>`}
          <span class="live-card__top">${StatusBadge(false)}</span>
          <span class="live-card__bottom"><span>Last live ${esc(fmt.relTime(l.lastLiveAt))}</span></span>
        </a>`;
    return `
    <article class="live-card tone-${s.accent}${l.isLive ? ' is-live' : ''}${s.isPrimary ? ' is-primary' : ''}" data-streamer="${esc(s.id)}">
      ${media}
      <div class="live-card__body">
        <div class="live-card__id">
          ${Avatar({ ...s, size: 'md', live: l.isLive })}
          <div class="live-card__names">
            <h3 class="live-card__name">${esc(s.displayName)}</h3>
            <span class="live-card__handle">${icon('kick')}kick.com/${esc(s.kick.username)}</span>
          </div>
        </div>
        ${l.isLive ? `<p class="live-card__meta"><span data-category>${esc(l.category)}</span><span>${icon('clock')}<span data-uptime>${liveUptime(l)}</span></span></p>` : ''}
        <p class="live-card__title" data-title>${titleText}</p>
        <div class="live-card__foot">
          ${SocialLinks(s, { includeKick: false, size: 'socials--sm' })}
          ${l.isLive
            ? `<a class="btn btn--gold btn--sm" href="${esc(s.kick.url)}" target="_blank" rel="noopener noreferrer">Watch now<span class="sr-only"> — ${esc(s.displayName)} on Kick</span></a>`
            : `<a class="btn btn--ghost btn--sm" href="${esc(s.kick.url)}" target="_blank" rel="noopener noreferrer">${icon('kick')}Channel<span class="sr-only"> — ${esc(s.displayName)} on Kick</span></a>`}
        </div>
      </div>
    </article>`;
  };

  /* ---------------------------------------------------------------- Crew cards */
  const profileHref = (s) => `streamer.html?id=${encodeURIComponent(s.id)}`;

  const CrewFeature = (s, live) => `
    <article class="crew-feature tone-${s.accent}">
      <div class="crew-feature__art" aria-hidden="true">
        <span class="crew-feature__num">01</span>
        <span class="crew-feature__rings"></span>
        ${Avatar({ ...s, size: 'xl', live: live?.isLive })}
      </div>
      <div class="crew-feature__body">
        <p class="kicker">01 — ${esc(s.role)}</p>
        <h3 class="crew-feature__name">${esc(s.displayName)}</h3>
        <div class="crew-feature__status">${StatusBadge(live?.isLive)}<span class="muted">kick.com/${esc(s.kick.username)}</span></div>
        <p class="crew-feature__bio">${esc(s.bio)}</p>
        <dl class="mini-stats">
          <div><dt>Followers</dt><dd>${fmt.compact(s.stats.followers)}</dd></div>
          <div><dt>Streams / mo</dt><dd>${s.stats.streamsThisMonth}</dd></div>
          <div><dt>Community wager</dt><dd>$${fmt.compact(s.stats.allTimeWager)}</dd></div>
        </dl>
        <div class="crew-feature__foot">
          ${SocialLinks(s)}
          <a class="link-arrow" href="${profileHref(s)}">View profile${icon('arrow-right')}</a>
        </div>
      </div>
    </article>`;

  const CrewRow = (s, live, index) => `
    <article class="crew-row tone-${s.accent}">
      <span class="crew-row__num" aria-hidden="true">${String(index).padStart(2, '0')}</span>
      ${Avatar({ ...s, size: 'lg', live: live?.isLive })}
      <div class="crew-row__main">
        <p class="kicker">${esc(s.role)}</p>
        <h3 class="crew-row__name"><a href="${profileHref(s)}">${esc(s.displayName)}</a></h3>
        <p class="crew-row__bio">${esc(s.bio)}</p>
      </div>
      <div class="crew-row__side">
        ${StatusBadge(live?.isLive)}
        ${SocialLinks(s, { size: 'socials--sm' })}
      </div>
      <span class="crew-row__arrow" aria-hidden="true">${icon('arrow-right')}</span>
    </article>`;

  /* --------------------------------------------------------------- Leaderboard */
  const PODIUM_RING = { 1: 'gold', 2: 'silver', 3: 'bronze' };
  const ordinal = (n) => ({ 1: 'st', 2: 'nd', 3: 'rd' }[n] || 'th');

  const PodiumCard = (e) => `
    <article class="podium podium--${e.rank}">
      <span class="podium__glow" aria-hidden="true"></span>
      <p class="podium__rank"><span>${e.rank}</span><sup>${ordinal(e.rank)}</sup></p>
      ${Avatar({ monogram: e.username.slice(0, 2).toUpperCase(), avatarUrl: e.avatarUrl, size: e.rank === 1 ? 'lg' : 'md', ring: PODIUM_RING[e.rank], accent: 'navy' })}
      <p class="podium__user">${esc(e.username)} ${Movement(e.movement)}</p>
      <p class="podium__label">Wagered</p>
      <p class="podium__amount">${fmt.usd(e.wagered)}</p>
      <p class="podium__prize">${icon('trophy')}${e.prize ? `${fmt.usd(e.prize)} prize` : 'All-time legend'}</p>
      <span class="podium__plinth" aria-hidden="true"></span>
    </article>`;

  const LeaderRow = (e, above) => {
    const gap = above ? above.wagered - e.wagered : 0;
    return `
    <li class="lb-row">
      <span class="lb-row__rank">${String(e.rank).padStart(2, '0')}</span>
      <span class="lb-row__user">${Avatar({ monogram: e.username.slice(0, 2).toUpperCase(), avatarUrl: e.avatarUrl, size: 'sm', accent: 'navy', ring: 'steel' })}<span>${esc(e.username)}</span></span>
      <span class="lb-row__wager"><span class="sr-only">Wagered </span>${fmt.usd(e.wagered)}</span>
      <span class="lb-row__progress">
        ${ProgressBar({ value: e.wagered, max: above ? above.wagered : e.wagered, label: `Progress toward rank ${e.rank - 1}`, tone: 'cyan', size: 'progress--thin' })}
        <span class="lb-row__gap">${above ? `${fmt.usd(gap)} to #${above.rank}` : ''}</span>
      </span>
      <span class="lb-row__prize"><span class="sr-only">Prize </span>${e.prize ? fmt.usd(e.prize) : '—'}</span>
      <span class="lb-row__move">${Movement(e.movement)}</span>
    </li>`;
  };

  const TierPanel = (b) => {
    const remaining = Math.max(0, b.nextTier.target - b.totalWagered);
    return `
    <div class="tier">
      <div class="tier__head">
        <p class="kicker">Next prize tier</p>
        ${b.endsAt ? `<p class="tier__reset">${icon('clock')}Resets in ${Countdown(b.endsAt, { compact: true })}</p>` : '<p class="tier__reset">Lifetime board</p>'}
      </div>
      <p class="tier__nums"><strong>${fmt.usd(b.totalWagered)}</strong><span> / ${fmt.usd(b.nextTier.target)}</span></p>
      ${ProgressBar({ value: b.totalWagered, max: b.nextTier.target, label: 'Community progress toward next prize tier', tone: 'gold', size: 'progress--lg' })}
      <div class="tier__foot">
        <span>${fmt.usd(remaining)} to go</span>
        <span class="tier__pct">${Math.floor(fmt.pct(b.totalWagered, b.nextTier.target))}%</span>
      </div>
      <p class="tier__reward">${icon('trophy')}${esc(b.nextTier.reward)}</p>
    </div>
    <dl class="pool">
      <div><dt>Prize pool</dt><dd>${b.prizePool ? fmt.usd(b.prizePool) : '—'}</dd></div>
      <div><dt>Board</dt><dd>${esc(b.label)}</dd></div>
    </dl>`;
  };

  /* ------------------------------------------------------------------- Raffles */
  const RaffleCard = (r) => {
    const statusLabel = { active: 'Active', upcoming: 'Upcoming', ended: 'Ended' }[r.status];
    let timer = '', action = '';
    if (r.status === 'active') {
      timer = `<p class="raffle__timer-label">Draw closes in</p>${Countdown(r.endsAt, { label: `${r.name} closes in` })}`;
      action = `<button class="btn btn--gold btn--sm" type="button" data-action="enter-raffle" data-id="${esc(r.id)}">${icon('ticket')}Enter raffle</button>`;
    } else if (r.status === 'upcoming') {
      timer = `<p class="raffle__timer-label">Opens in</p>${Countdown(r.startsAt, { label: `${r.name} opens in` })}`;
      action = `<button class="btn btn--ghost btn--sm" type="button" data-action="notify" aria-pressed="false">${icon('bell')}Notify me</button>`;
    } else {
      timer = `<div class="raffle__winner">${icon('trophy')}<div><p class="raffle__timer-label">Winner</p><p class="raffle__winner-name">${esc(r.winner?.username || 'To be announced')}</p></div><span class="muted">${esc(fmt.date(r.endsAt))}</span></div>`;
      action = '<button class="btn btn--ghost btn--sm" type="button" disabled>Draw complete</button>';
    }
    return `
    <article class="raffle raffle--${r.status}">
      <div class="raffle__media">
        ${r.imageUrl ? `<img src="${esc(r.imageUrl)}" alt="" loading="lazy">` : `<svg class="raffle__art" viewBox="0 0 120 120" aria-hidden="true"><use href="#p-${esc(r.art)}"></use></svg>`}
        <span class="raffle__status">${r.status === 'active' ? LiveDot() : ''}${statusLabel}</span>
        <span class="raffle__value">${fmt.usd(r.value)}<small>value</small></span>
      </div>
      <div class="raffle__body">
        <h3 class="raffle__name">${esc(r.name)}</h3>
        <p class="raffle__req">${icon('ticket')}<span>${esc(r.requirement)}</span></p>
        <div class="raffle__timer">${timer}</div>
        <div class="raffle__foot">
          <span class="raffle__entries">${icon('users')}${r.status === 'upcoming' ? 'Entries open soon' : `${fmt.num(r.entries)} entries`}</span>
          ${action}
        </div>
      </div>
    </article>`;
  };

  /* ---------------------------------------------------------------- Challenges */
  const ChallengeCard = (c, streamers = []) => {
    const host = streamers.find((s) => s.id === c.hostId);
    const g = c.goal;
    const value = (n) => (g.type === 'currency' ? fmt.usd(n) : `${fmt.num(n)}`);
    const statusLabel = { active: 'Active', upcoming: 'Upcoming', completed: 'Completed' }[c.status];
    return `
    <article class="challenge challenge--${c.status}">
      <header class="challenge__head">
        <span class="tag tag--${c.status}">${c.status === 'active' ? LiveDot() : ''}${statusLabel}</span>
        <span class="challenge__dates">${icon('calendar')}${esc(fmt.date(c.startsAt))} – ${esc(fmt.date(c.endsAt))}</span>
      </header>
      <h3 class="challenge__name">${esc(c.name)}</h3>
      <p class="challenge__desc">${esc(c.description)}</p>
      <div class="challenge__goal">
        <span class="kicker">${esc(g.label)}</span>
        <span class="challenge__nums"><strong>${value(g.current)}</strong> / ${value(g.target)}${g.unit ? ` ${esc(g.unit)}` : ''}</span>
      </div>
      ${ProgressBar({ value: g.current, max: g.target, label: `${c.name} progress`, tone: c.status === 'active' ? 'gold' : 'steel' })}
      <dl class="challenge__meta">
        <div><dt>Prize</dt><dd>${esc(c.prize)}</dd></div>
        <div><dt>Players</dt><dd>${c.participants ? fmt.num(c.participants) : '—'}</dd></div>
        <div><dt>${c.status === 'upcoming' ? 'Starts in' : 'Ends in'}</dt><dd>${Countdown(c.status === 'upcoming' ? c.startsAt : c.endsAt, { compact: true })}</dd></div>
      </dl>
      ${host ? `<p class="challenge__host">Hosted by <a href="${profileHref(host)}">${esc(host.displayName)}</a></p>` : ''}
    </article>`;
  };

  /* ---------------------------------------------------------------- Milestones */
  const MilestoneStep = (tier, prevThreshold, wagered, index) => {
    const done = wagered >= tier.threshold;
    const current = !done && wagered >= prevThreshold;
    const state = done ? 'done' : current ? 'current' : 'locked';
    const span = tier.threshold - prevThreshold;
    const segP = done ? 100 : current ? ((wagered - prevThreshold) / span) * 100 : 0;
    return `
    <li class="ms ms--${state}" style="--seg:${segP.toFixed(1)}%">
      <span class="ms__track" aria-hidden="true"><span></span></span>
      <span class="ms__node" aria-hidden="true">${done ? icon('check') : current ? `<span class="ms__ring" style="--p:${fmt.pct(wagered, tier.threshold).toFixed(1)}"></span><b>${index}</b>` : icon('lock')}</span>
      <div class="ms__card">
        <p class="kicker">Tier ${index} · ${esc(tier.name)}</p>
        <p class="ms__amount">${fmt.usd(tier.threshold)}</p>
        <p class="ms__reward">${esc(tier.reward)}</p>
        ${ProgressBar({ value: Math.min(wagered, tier.threshold), max: tier.threshold, label: `${tier.name} milestone progress`, tone: done ? 'gold' : current ? 'cyan' : 'steel', size: 'progress--thin' })}
        <p class="ms__status">${done ? `${icon('check')}Unlocked` : `${fmt.usd(tier.threshold - wagered)} remaining`}</p>
      </div>
      <span class="sr-only">${done ? 'Completed' : current ? 'In progress' : 'Locked'}</span>
    </li>`;
  };

  /* ------------------------------------------------------------------ Activity */
  const ACTIVITY_ICON = { winner: 'trophy', leaderboard: 'chart', stream: 'signal', challenge: 'flag', update: 'megaphone', fame: 'crown' };
  const ActivityItem = (a) => `
    <li class="feed__item feed__item--${a.type}">
      <span class="feed__icon">${icon(ACTIVITY_ICON[a.type] || 'megaphone')}</span>
      <div class="feed__main">
        <p class="feed__title">${esc(a.title)}</p>
        <p class="feed__meta"><span>${esc(a.tag)}</span><time datetime="${esc(a.at)}">${esc(fmt.relTime(a.at))}</time></p>
      </div>
    </li>`;

  /* ------------------------------------------------------------------ Schedule */
  const ScheduleRow = (item, s, { reminded = false } = {}) => `
    <li class="sched${item.special ? ' sched--special' : ''} tone-${s.accent}">
      <time class="sched__date" datetime="${esc(item.startsAt)}">
        <span>${esc(fmt.day(item.startsAt))}</span><b>${fmt.dayNum(item.startsAt)}</b><span>${esc(fmt.month(item.startsAt))}</span>
      </time>
      <div class="sched__time">
        <b>${esc(fmt.time(item.startsAt))}</b>
        <span>${esc(fmt.relDay(item.startsAt))} · ${fmt.duration(item.durationMin)}</span>
      </div>
      <div class="sched__creator">
        ${Avatar({ ...s, size: 'sm' })}
        <span>${esc(s.displayName)}</span>
      </div>
      <div class="sched__title">
        ${item.special ? '<span class="tag tag--special">Special</span>' : ''}
        <span>${esc(item.title)}</span>
      </div>
      <span class="sched__platform">${icon('kick')}Kick</span>
      <button class="btn btn--ghost btn--sm sched__remind" type="button" data-action="remind" data-id="${esc(item.id)}" aria-pressed="${reminded}">
        ${icon(reminded ? 'check' : 'bell')}<span>${reminded ? 'Reminder set' : 'Remind me'}</span><span class="sr-only"> for ${esc(item.title)}</span>
      </button>
    </li>`;

  /* --------------------------------------------------------------------- Stats */
  const StatCounter = (st) => `
    <div class="stat">
      <dt class="stat__label">${esc(st.label)}</dt>
      <dd class="stat__value" data-count="${st.value}" data-format="${esc(st.format)}">${fmt.value(st.value, st.format)}</dd>
    </div>`;

  window.UI = {
    esc, fmt, icon, injectSprite, isPlaceholder, extLink,
    Logo, LiveDot, StatusBadge, Avatar, SocialLinks, ProgressBar, Movement, Countdown, SectionEmpty, Skeleton,
    StreamerCard, CrewFeature, CrewRow, PodiumCard, LeaderRow, TierPanel, RaffleCard, ChallengeCard, MilestoneStep,
    ActivityItem, ScheduleRow, StatCounter, profileHref, liveUptime,
  };
})();
