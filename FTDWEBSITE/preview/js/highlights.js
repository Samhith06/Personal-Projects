/*
 * FGDR highlights: Wall of Fame (big wins) + Clips (Kick, X, Instagram,
 * YouTube, TikTok and direct uploads), the clip lightbox and the creator
 * upload dialog. Shared by the homepage and streamer profiles.
 */
(function () {
  const API = window.FGDR_API;
  const UI = window.UI;
  const L = window.Layout;
  const { esc, fmt, icon } = UI;

  /* ---------------------------------------------------------------- Sources
   * The same patterns are re-checked server-side before anything is stored. */
  const SOURCES = {
    kick: { label: 'Kick', icon: 'kick', kind: 'Kick clip', pattern: /^https?:\/\/(www\.)?kick\.com\/[\w-]+(\/clips?\/|\?clip=)[\w-]+/i },
    x: { label: 'X', icon: 'x', kind: 'X post', pattern: /^https?:\/\/(www\.|mobile\.)?(x|twitter)\.com\/\w+\/status\/\d+/i },
    instagram: { label: 'Instagram', icon: 'instagram', kind: 'Instagram reel', pattern: /^https?:\/\/(www\.)?instagram\.com\/(reels?|p|tv)\/[\w-]+/i },
    youtube: { label: 'YouTube', icon: 'youtube', kind: 'YouTube video', pattern: /^https?:\/\/(www\.|m\.)?(youtube\.com\/(watch\?(.*&)?v=|shorts\/|live\/)|youtu\.be\/)[\w-]{6,}/i },
    tiktok: { label: 'TikTok', icon: 'tiktok', kind: 'TikTok video', pattern: /^https?:\/\/(www\.|vm\.|m\.)?tiktok\.com\/(@[\w.-]+\/video\/\d+|[\w-]+\/?$)/i },
    upload: { label: 'Upload', icon: 'film', kind: 'Uploaded clip' },
  };
  const CATEGORY = { 'big-win': 'Big win', highlight: 'Highlight', funny: 'Funny' };
  const SORT_LABEL = { multiplier: 'Biggest multiplier', payout: 'Biggest payout', latest: 'Latest win' };

  const detectSource = (url) => Object.keys(SOURCES).find((k) => SOURCES[k].pattern && SOURCES[k].pattern.test(String(url).trim())) || null;
  const youtubeId = (url) => (String(url).match(/(?:[?&]v=|shorts\/|live\/|youtu\.be\/)([\w-]{6,})/) || [])[1];

  /* --------------------------------------------------------------- Caches */
  let streamers = [];
  const clipCache = new Map();
  const winByClip = new Map();
  const byId = (id) => streamers.find((s) => s.id === id) || streamers[0];

  function remember({ clips = [], wins = [] } = {}) {
    clips.forEach((c) => clipCache.set(c.id, c));
    wins.forEach((w) => w.clipId && winByClip.set(w.clipId, w));
  }

  /* ------------------------------------------------------------- Slot art
   * Placeholder "screenshot" until creators upload the real one. */
  const SYMBOLS = ['7', '♦', '♠', '★', '♣', '♥', '◆', 'BAR'];
  function SlotArt(seed) {
    let h = [...String(seed)].reduce((acc, c) => (Math.imul(acc, 31) + c.charCodeAt(0)) >>> 0, 7);
    const rnd = () => (h = (Math.imul(h, 1103515245) + 12345) >>> 0) / 4294967296;
    const winSym = SYMBOLS[Math.floor(rnd() * 3)];
    const cells = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) cells.push(r === 1 ? winSym : SYMBOLS[Math.floor(rnd() * SYMBOLS.length)]);
    return `<span class="slot-art" aria-hidden="true"><span class="slot-art__grid">${cells
      .map((s, i) => `<i class="${Math.floor(i / 5) === 1 ? 'is-win' : ''}${s === 'BAR' ? ' is-bar' : ''}">${s}</i>`)
      .join('')}</span><span class="slot-art__line"></span></span>`;
  }

  // Public lists only ever contain admin-approved items, so everything shown is verified.
  const fresh = new Set(); // ids approved during this visit (highlight glow)
  const isFresh = (item) => fresh.has(item.id) || fresh.has(item.clipId);
  const Verified = () => `<span class="verified">${icon('verified')}Verified</span>`;
  const StatusTag = (status) =>
    ({ pending: '<span class="tag tag--pending">Awaiting approval</span>', rejected: '<span class="tag tag--rejected">Not approved</span>', approved: '<span class="tag tag--approved">Live</span>' }[status] || '');

  const WinMedia = (w, cls, inner, { focusable = true } = {}) =>
    w.clipId
      ? `<button type="button" class="${cls}" data-open-clip="${esc(w.clipId)}" ${focusable ? `aria-label="Watch the ${esc(w.game)} win"` : 'tabindex="-1" aria-hidden="true"'}>${inner}</button>`
      : `<div class="${cls}">${inner}</div>`;

  const winVisual = (w) => (w.imageUrl ? `<img src="${esc(w.imageUrl)}" alt="" loading="lazy">` : SlotArt(w.id));

  /* ----------------------------------------------------------- Components */
  const WinFeature = (w, sort = 'multiplier') => {
    const s = byId(w.streamerId);
    return `
    <article class="win-feature tone-${s.accent}${isFresh(w) ? ' is-new' : ''}">
      ${WinMedia(w, 'win-feature__media', `${winVisual(w)}${w.clipId ? `<span class="play-btn">${icon('play')}</span>` : ''}`, { focusable: false })}
      <div class="win-feature__body">
        <p class="kicker">${icon('crown')}#1 · ${esc(SORT_LABEL[sort])}</p>
        <p class="win-feature__mult">${fmt.mult(w.payout, w.bet)}</p>
        <dl class="win-feature__stats">
          <div><dt>Payout</dt><dd>${fmt.usd(w.payout)}</dd></div>
          <div><dt>Bet</dt><dd>${fmt.usd(w.bet)}</dd></div>
          <div><dt>Game</dt><dd>${esc(w.game)}${w.provider ? `<span>${esc(w.provider)}</span>` : ''}</dd></div>
        </dl>
        <div class="win-feature__foot">
          <a class="win__who" href="${UI.profileHref(s)}">${UI.Avatar({ ...s, size: 'sm' })}<span>${esc(s.displayName)}</span></a>
          <span class="muted">${esc(fmt.date(w.at))}</span>
          ${Verified()}
        </div>
        ${w.clipId ? `<button class="btn btn--gold" type="button" data-open-clip="${esc(w.clipId)}">${icon('play')}Watch the moment</button>` : ''}
      </div>
    </article>`;
  };

  const WinCard = (w, rank) => {
    const s = byId(w.streamerId);
    return `
    <article class="win tone-${s.accent}${isFresh(w) ? ' is-new' : ''}">
      ${WinMedia(w, 'win__media', `${winVisual(w)}${rank ? `<span class="win__rank">#${rank}</span>` : ''}<span class="win__mult">${fmt.mult(w.payout, w.bet)}</span>${w.clipId ? `<span class="play-btn play-btn--sm">${icon('play')}</span>` : ''}`)}
      <div class="win__body">
        <p class="win__payout">${fmt.usd(w.payout)} <span>on a ${fmt.usd(w.bet)} bet</span></p>
        <p class="win__game">${esc(w.game)}${w.provider ? ` <span>· ${esc(w.provider)}</span>` : ''}</p>
        <div class="win__foot">
          <a class="win__who" href="${UI.profileHref(s)}">${UI.Avatar({ ...s, size: 'sm' })}<span>${esc(s.displayName)}</span></a>
          ${Verified()}
        </div>
      </div>
    </article>`;
  };

  const clipVisual = (c) => {
    if (c.thumbnailUrl) return `<img src="${esc(c.thumbnailUrl)}" alt="" loading="lazy">`;
    if (c.mediaType === 'image' && c.mediaUrl) return `<img src="${esc(c.mediaUrl)}" alt="" loading="lazy">`;
    return c.category === 'big-win' ? SlotArt(c.id) : '<span class="thumb-art"></span>';
  };

  const ClipCard = (c) => {
    const s = byId(c.streamerId);
    const src = SOURCES[c.source] || SOURCES.upload;
    return `
    <article class="clip clip--${esc(c.source)} tone-${s.accent}${isFresh(c) ? ' is-new' : ''}">
      <button type="button" class="clip__media" data-open-clip="${esc(c.id)}" aria-label="Play: ${esc(c.title)} (${esc(src.kind)}${c.durationSec ? `, ${fmt.clock(c.durationSec)}` : ''})">
        ${clipVisual(c)}
        <span class="clip__source">${icon(src.icon)}${esc(src.label)}</span>
        ${c.durationSec ? `<span class="clip__dur">${fmt.clock(c.durationSec)}</span>` : ''}
        <span class="clip__cat clip__cat--${esc(c.category)}">${esc(CATEGORY[c.category] || '')}</span>
        <span class="play-btn play-btn--sm">${icon('play')}</span>
      </button>
      <div class="clip__body">
        <h3 class="clip__title">${esc(c.title)}</h3>
        <p class="clip__meta">${UI.Avatar({ ...s, size: 'sm' })}<span class="clip__name">${esc(s.displayName)}</span><span class="clip__stats">${c.views ? `${fmt.compact(c.views)} views · ` : ''}${esc(fmt.relTime(c.at))}</span></p>
      </div>
    </article>`;
  };

  const SourceChips = (clips, active) => {
    const counts = clips.reduce((acc, c) => ((acc[c.source] = (acc[c.source] || 0) + 1), acc), {});
    const keys = ['all', ...Object.keys(SOURCES)];
    return keys
      .map((k) => {
        const n = k === 'all' ? clips.length : counts[k] || 0;
        if (k !== 'all' && !n) return '';
        const label = k === 'all' ? 'All clips' : SOURCES[k].label === 'Upload' ? 'Uploads' : SOURCES[k].label;
        return `<button type="button" class="chip${k === active ? ' is-active' : ''}" aria-pressed="${k === active}" data-source="${k}">${k === 'all' ? '' : icon(SOURCES[k].icon)}${esc(label)}<span class="chip__n">${n}</span></button>`;
      })
      .join('');
  };

  /* ------------------------------------------------------------- Lightbox */
  let lightbox;
  function ensureLightbox() {
    if (lightbox) return lightbox;
    lightbox = document.createElement('dialog');
    lightbox.className = 'lightbox';
    lightbox.setAttribute('aria-labelledby', 'lightbox-title');
    lightbox.innerHTML = `
      <div class="lightbox__panel">
        <button class="icon-btn lightbox__close" type="button" data-close aria-label="Close clip">${icon('close')}</button>
        <div class="lightbox__stage" data-stage></div>
        <div class="lightbox__info" data-info></div>
      </div>`;
    document.body.appendChild(lightbox);
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox || e.target.closest('[data-close]')) lightbox.close();
      const share = e.target.closest('[data-share]');
      if (share) {
        const link = `${location.origin}${location.pathname}#clip=${share.dataset.share}`;
        (navigator.clipboard?.writeText(link) || Promise.reject())
          .then(() => L.toast('Link copied.'))
          .catch(() => L.toast(link));
      }
    });
    lightbox.addEventListener('close', () => {
      lightbox.querySelector('[data-stage]').innerHTML = ''; // stops playback
      if (location.hash.startsWith('#clip=')) history.replaceState(null, '', location.pathname + location.search);
    });
    return lightbox;
  }

  function stageFor(c) {
    const src = SOURCES[c.source] || SOURCES.upload;
    if (c.source === 'upload' && c.mediaUrl) {
      return c.mediaType === 'image'
        ? `<img src="${esc(c.mediaUrl)}" alt="${esc(c.title)}">`
        : `<video src="${esc(c.mediaUrl)}" controls autoplay playsinline${c.thumbnailUrl ? ` poster="${esc(c.thumbnailUrl)}"` : ''}></video>`;
    }
    const yt = c.source === 'youtube' && !UI.isPlaceholder(c.url) && youtubeId(c.url);
    const embed = c.embedUrl || (yt ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(yt)}?autoplay=1&rel=0` : null);
    if (embed) {
      return `<iframe src="${esc(embed)}" title="${esc(c.title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
    }
    return `
      <div class="embed-facade clip--${esc(c.source)} tone-${byId(c.streamerId).accent}">
        ${c.category === 'big-win' ? SlotArt(c.id) : '<span class="thumb-art"></span>'}
        <div class="embed-facade__card">
          <span class="embed-facade__icon">${icon(src.icon)}</span>
          <p class="embed-facade__title">${esc(src.kind)}</p>
          <p class="embed-facade__body">Plays right here in the official ${esc(src.label)} player once the backend connects the embed.</p>
          <a class="btn btn--ghost btn--sm" ${UI.extLink(c.url)}>${icon('external')}Open on ${esc(src.label)}</a>
        </div>
      </div>`;
  }

  async function openClip(id) {
    let c = clipCache.get(id);
    if (!c) {
      const [clips, wins] = await Promise.all([API.getClips(), API.getWins()]);
      remember({ clips, wins });
      c = clipCache.get(id);
    }
    if (!c) return L.toast('That clip is no longer available.');
    const dlg = ensureLightbox();
    const s = byId(c.streamerId);
    const src = SOURCES[c.source] || SOURCES.upload;
    const w = winByClip.get(c.id);
    dlg.classList.toggle('lightbox--portrait', c.orientation === 'portrait');
    dlg.querySelector('[data-stage]').innerHTML = stageFor(c);
    dlg.querySelector('[data-info]').innerHTML = `
      <div class="lightbox__badges">
        <span class="clip__source clip--${esc(c.source)}">${icon(src.icon)}${esc(src.label)}</span>
        <span class="tag">${esc(CATEGORY[c.category] || '')}</span>
        ${c.status && c.status !== 'approved' ? StatusTag(c.status) : ''}
      </div>
      <h2 class="lightbox__title" id="lightbox-title">${esc(c.title)}</h2>
      <a class="win__who" href="${UI.profileHref(s)}">${UI.Avatar({ ...s, size: 'sm' })}<span>${esc(s.displayName)}</span></a>
      <p class="muted lightbox__meta">${c.views ? `${fmt.num(c.views)} views · ` : ''}${esc(fmt.date(c.at))}${c.durationSec ? ` · ${fmt.clock(c.durationSec)}` : ''}</p>
      ${w ? `
        <div class="lightbox__win">
          <p class="kicker">${icon('crown')}Wall of Fame</p>
          <p class="lightbox__mult">${fmt.mult(w.payout, w.bet)}</p>
          <p>${fmt.usd(w.payout)} on a ${fmt.usd(w.bet)} bet</p>
          <p class="muted">${esc(w.game)}${w.provider ? ` · ${esc(w.provider)}` : ''}</p>
          ${w.status === 'approved' ? Verified() : ''}
        </div>` : ''}
      <div class="lightbox__actions">
        ${c.source !== 'upload' ? `<a class="btn btn--ghost btn--sm" ${UI.extLink(c.url)}>${icon('external')}View on ${esc(src.label)}</a>` : ''}
        ${c.status === 'approved' ? `<button class="btn btn--ghost btn--sm" type="button" data-share="${esc(c.id)}">${icon('link')}Copy link</button>` : ''}
      </div>`;
    if (!dlg.open) dlg.showModal();
    if (c.status === 'approved') history.replaceState(null, '', `#clip=${c.id}`);
    dlg.querySelector('[data-close]').focus({ preventScroll: true });
  }

  /* -------------------------------------------------------- Upload dialog */
  let uploadDlg;
  const upState = { file: null, previewUrl: null };

  function readVideoMeta(url) {
    return new Promise((resolve) => {
      const v = document.createElement('video');
      let settled = false;
      const finish = (poster) => {
        if (settled) return;
        settled = true;
        resolve({ poster, duration: Number.isFinite(v.duration) ? Math.round(v.duration) : null, orientation: v.videoHeight > v.videoWidth ? 'portrait' : 'landscape' });
      };
      v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
      v.addEventListener('loadedmetadata', () => { v.currentTime = Math.min(1, (v.duration || 3) / 3); }, { once: true });
      v.addEventListener('seeked', () => {
        try {
          const c = document.createElement('canvas');
          c.width = 640;
          c.height = Math.round(640 * (v.videoHeight / v.videoWidth)) || 360;
          c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
          finish(c.toDataURL('image/jpeg', 0.8));
        } catch { finish(null); }
      }, { once: true });
      v.addEventListener('error', () => finish(null), { once: true });
      setTimeout(() => finish(null), 5000);
    });
  }

  function readImageMeta(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ orientation: img.naturalHeight > img.naturalWidth ? 'portrait' : 'landscape' });
      img.onerror = () => resolve({ orientation: 'landscape' });
      img.src = url;
    });
  }

  const mb = (bytes) => (bytes < 1048576 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1048576).toFixed(bytes > 104857600 ? 0 : 1)} MB`);

  function ensureUpload() {
    if (uploadDlg) return uploadDlg;
    uploadDlg = document.createElement('dialog');
    uploadDlg.className = 'modal';
    uploadDlg.setAttribute('aria-labelledby', 'up-heading');
    uploadDlg.innerHTML = `
      <form class="modal__panel" novalidate data-upload-form>
        <header class="modal__head">
          <div>
            <p class="kicker">${icon('upload')}Creator studio</p>
            <h2 class="modal__title" id="up-heading">Submit a clip or big win</h2>
            <p class="modal__note">${icon('verified')}Every submission is reviewed by an admin before it goes live.</p>
          </div>
          <span class="tag tag--upcoming">Creators only</span>
          <button class="icon-btn" type="button" data-close aria-label="Close">${icon('close')}</button>
        </header>

        <div class="modal__body">
          <fieldset class="field">
            <legend class="field__label">Source</legend>
            <div class="toggle">
              <label><input type="radio" name="mode" value="link" checked><span>${icon('link')}Paste a link</span></label>
              <label><input type="radio" name="mode" value="file"><span>${icon('upload')}Upload a file</span></label>
            </div>
          </fieldset>

          <div class="field" data-panel="link">
            <label class="field__label" for="up-url">Clip link</label>
            <input class="input" id="up-url" name="url" type="url" inputmode="url" autocomplete="off" spellcheck="false" placeholder="https://kick.com/fatguysdontrun/clips/…" aria-describedby="up-url-hint up-url-err">
            <p class="field__hint" id="up-url-hint" data-detect></p>
            <p class="field__error" id="up-url-err" data-err="url"></p>
          </div>

          <div class="field" data-panel="file" hidden>
            <span class="field__label" id="up-file-label">Video or screenshot</span>
            <label class="dropzone" data-dropzone>
              <input type="file" name="file" accept="video/mp4,video/quicktime,video/webm,image/png,image/jpeg,image/webp" aria-labelledby="up-file-label" aria-describedby="up-file-hint up-file-err">
              <span class="dropzone__icon">${icon('upload')}</span>
              <span class="dropzone__title" data-file-name>Drop a file here or <u>browse</u></span>
              <span class="dropzone__hint" id="up-file-hint">MP4, MOV or WebM up to 500 MB · PNG, JPG or WebP up to 20 MB</span>
              <span class="dropzone__preview" data-file-preview></span>
            </label>
            <p class="field__error" id="up-file-err" data-err="file"></p>
          </div>

          <div class="field">
            <label class="field__label" for="up-title">Title</label>
            <input class="input" id="up-title" name="clipTitle" maxlength="90" placeholder="e.g. x12,450 on Olympus Vault" aria-describedby="up-title-err">
            <p class="field__error" id="up-title-err" data-err="clipTitle"></p>
          </div>

          <div class="field-row">
            <div class="field">
              <label class="field__label" for="up-creator">Creator</label>
              <select class="input select" id="up-creator" name="streamerId"></select>
            </div>
            <fieldset class="field">
              <legend class="field__label">Category</legend>
              <div class="chip-radios">
                ${Object.entries(CATEGORY).map(([k, v], i) => `<label><input type="radio" name="category" value="${k}"${i === 0 ? ' checked' : ''}><span>${v}</span></label>`).join('')}
              </div>
            </fieldset>
          </div>

          <label class="switch">
            <input type="checkbox" name="toWall" checked>
            <span class="switch__track" aria-hidden="true"></span>
            <span><b>Add to the Wall of Fame</b><small>The admin checks the win against the stream before approving it.</small></span>
          </label>

          <fieldset class="win-fields" data-win-fields>
            <legend class="sr-only">Win details</legend>
            <div class="field-row">
              <div class="field">
                <label class="field__label" for="up-game">Game</label>
                <input class="input" id="up-game" name="game" placeholder="Slot name" aria-describedby="up-game-err">
                <p class="field__error" id="up-game-err" data-err="game"></p>
              </div>
              <div class="field">
                <label class="field__label" for="up-provider">Provider <span class="muted">(optional)</span></label>
                <input class="input" id="up-provider" name="provider" placeholder="Game studio">
              </div>
            </div>
            <div class="field-row field-row--3">
              <div class="field">
                <label class="field__label" for="up-bet">Bet</label>
                <div class="input-affix"><span aria-hidden="true">$</span><input class="input" id="up-bet" name="bet" type="number" min="0" step="0.01" inputmode="decimal" aria-describedby="up-bet-err"></div>
                <p class="field__error" id="up-bet-err" data-err="bet"></p>
              </div>
              <div class="field">
                <label class="field__label" for="up-payout">Payout</label>
                <div class="input-affix"><span aria-hidden="true">$</span><input class="input" id="up-payout" name="payout" type="number" min="0" step="0.01" inputmode="decimal" aria-describedby="up-payout-err"></div>
                <p class="field__error" id="up-payout-err" data-err="payout"></p>
              </div>
              <div class="field">
                <span class="field__label">Multiplier</span>
                <output class="mult-out" data-mult aria-live="polite">—</output>
              </div>
            </div>
          </fieldset>
        </div>

        <footer class="modal__foot">
          <p class="fineprint">Only share content you own or have permission to post. Hide account details or balances you don’t want public.</p>
          <div class="modal__actions">
            <button class="btn btn--ghost" type="button" data-close>Cancel</button>
            <button class="btn btn--gold" type="submit" data-submit>${icon('upload')}Submit for review</button>
          </div>
        </footer>
      </form>`;
    document.body.appendChild(uploadDlg);

    const form = uploadDlg.querySelector('form');
    const el = (n) => form.elements.namedItem(n);
    const detect = form.querySelector('[data-detect]');
    const dz = form.querySelector('[data-dropzone]');
    const fileInput = el('file');
    const DEFAULT_HINT = 'Works with Kick clips, X posts, Instagram reels, YouTube (incl. Shorts) and TikTok.';

    const setErr = (name, msg) => {
      const out = form.querySelector(`[data-err="${name}"]`);
      if (out) out.textContent = msg || '';
      const ctrl = name === 'file' ? dz : el(name);
      if (ctrl && ctrl.setAttribute) msg ? ctrl.setAttribute('aria-invalid', 'true') : ctrl.removeAttribute('aria-invalid');
    };
    const clearErrs = () => form.querySelectorAll('[data-err]').forEach((o) => setErr(o.dataset.err, ''));

    const syncMode = () => {
      const mode = el('mode').value;
      form.querySelector('[data-panel="link"]').hidden = mode !== 'link';
      form.querySelector('[data-panel="file"]').hidden = mode !== 'file';
    };
    const syncWall = () => { form.querySelector('[data-win-fields]').hidden = !el('toWall').checked; };
    const syncMult = () => {
      const bet = +el('bet').value, payout = +el('payout').value;
      form.querySelector('[data-mult]').textContent = bet > 0 && payout > 0 ? fmt.mult(payout, bet) : '—';
    };
    const syncDetect = () => {
      const v = el('url').value.trim();
      const src = v && detectSource(v);
      detect.classList.toggle('is-ok', !!src);
      detect.innerHTML = src ? `${icon(SOURCES[src].icon)}Detected: ${esc(SOURCES[src].kind)}` : esc(DEFAULT_HINT);
      if (src) setErr('url', '');
    };

    const setFile = (f) => {
      if (upState.previewUrl) URL.revokeObjectURL(upState.previewUrl);
      upState.file = f || null;
      upState.previewUrl = f ? URL.createObjectURL(f) : null;
      const preview = form.querySelector('[data-file-preview]');
      form.querySelector('[data-file-name]').innerHTML = f ? `${esc(f.name)} <span class="muted">· ${mb(f.size)}</span>` : 'Drop a file here or <u>browse</u>';
      preview.innerHTML = !f ? '' : f.type.startsWith('image/') ? `<img src="${upState.previewUrl}" alt="">` : f.type.startsWith('video/') ? `<video src="${upState.previewUrl}" muted playsinline preload="metadata"></video>` : '';
      if (f) setErr('file', '');
    };

    form.addEventListener('change', (e) => {
      if (e.target.name === 'mode') syncMode();
      if (e.target.name === 'toWall') syncWall();
      if (e.target.name === 'category') { el('toWall').checked = e.target.value === 'big-win'; syncWall(); }
      if (e.target === fileInput) setFile(fileInput.files[0]);
    });
    form.addEventListener('input', (e) => {
      if (e.target.name === 'url') syncDetect();
      if (e.target.name === 'bet' || e.target.name === 'payout') syncMult();
      if (e.target.getAttribute('aria-invalid') && e.target.value) setErr(e.target.name, '');
    });
    ['dragenter', 'dragover'].forEach((t) => dz.addEventListener(t, (e) => { e.preventDefault(); dz.classList.add('is-over'); }));
    ['dragleave', 'drop'].forEach((t) => dz.addEventListener(t, () => dz.classList.remove('is-over')));
    dz.addEventListener('drop', (e) => { e.preventDefault(); if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]); });

    uploadDlg.addEventListener('click', (e) => { if (e.target === uploadDlg || e.target.closest('[data-close]')) uploadDlg.close(); });
    uploadDlg.addEventListener('close', () => {
      form.reset();
      setFile(null);
      clearErrs();
      syncMode(); syncWall(); syncMult(); syncDetect();
    });

    function validate() {
      const errs = {};
      if (el('mode').value === 'link') {
        const url = el('url').value.trim();
        if (!url) errs.url = 'Paste the link to the clip.';
        else if (!detectSource(url)) errs.url = 'That link isn’t supported yet. Use a Kick clip, X, Instagram, YouTube or TikTok link — or upload the file instead.';
      } else {
        const f = upState.file;
        if (!f) errs.file = 'Choose a video or screenshot to upload.';
        else if (!/^(video|image)\//.test(f.type)) errs.file = 'That file type isn’t supported.';
        else if (f.type.startsWith('video/') && f.size > 500 * 1048576) errs.file = 'Videos must be 500 MB or smaller.';
        else if (f.type.startsWith('image/') && f.size > 20 * 1048576) errs.file = 'Images must be 20 MB or smaller.';
      }
      if (!el('clipTitle').value.trim()) errs.clipTitle = 'Give the clip a title.';
      if (el('toWall').checked) {
        const bet = +el('bet').value, payout = +el('payout').value;
        if (!el('game').value.trim()) errs.game = 'Which game was it?';
        if (!(bet > 0)) errs.bet = 'Enter the bet size.';
        if (!(payout > 0)) errs.payout = 'Enter the payout.';
        else if (bet > 0 && payout < bet) errs.payout = 'Payout should be at least the bet.';
      }
      return errs;
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearErrs();
      const errs = validate();
      const names = Object.keys(errs);
      if (names.length) {
        names.forEach((n) => setErr(n, errs[n]));
        const first = names[0] === 'file' ? fileInput : el(names[0]);
        first?.focus();
        return;
      }
      const btn = form.querySelector('[data-submit]');
      const label = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner" aria-hidden="true"></span>Submitting…';
      try {
        const payload = { streamerId: el('streamerId').value, title: el('clipTitle').value.trim(), category: el('category').value };
        if (el('mode').value === 'link') {
          payload.url = el('url').value.trim();
          payload.source = detectSource(payload.url);
          payload.orientation = ['instagram', 'tiktok'].includes(payload.source) || /\/shorts\//.test(payload.url) ? 'portrait' : 'landscape';
        } else {
          const f = upState.file;
          payload.source = 'upload';
          payload.mediaType = f.type.startsWith('image/') ? 'image' : 'video';
          payload.mediaUrl = upState.previewUrl;
          upState.previewUrl = null; // ownership moves to the new clip, don't revoke it
          if (payload.mediaType === 'video') {
            const meta = await readVideoMeta(payload.mediaUrl);
            Object.assign(payload, { thumbnailUrl: meta.poster, durationSec: meta.duration, orientation: meta.orientation });
          } else {
            Object.assign(payload, await readImageMeta(payload.mediaUrl));
          }
        }
        if (el('toWall').checked) payload.win = { game: el('game').value.trim(), provider: el('provider').value.trim(), bet: +el('bet').value, payout: +el('payout').value };

        const result = await API.submitClip(payload);
        remember({ clips: [result.clip], wins: result.win ? [result.win] : [] });
        uploadDlg.close();
        L.toast('Sent for review. It goes live as soon as an admin approves it.');
        document.dispatchEvent(new CustomEvent('fgdr:submissions-updated', { detail: { ...result, focus: true } }));
      } catch (err) {
        console.error(err);
        L.toast(/Forbidden/.test(err.message) ? 'Only FGDR creators can submit clips.' : 'Upload failed — please try again.');
      } finally {
        btn.disabled = false;
        btn.innerHTML = label;
      }
    });

    syncMode(); syncWall(); syncDetect();
    return uploadDlg;
  }

  function openUpload({ streamerId } = {}) {
    if (session.role !== 'creator') {
      L.toast('Only FGDR creators can submit clips.');
      return;
    }
    const dlg = ensureUpload();
    const select = dlg.querySelector('[name="streamerId"]');
    select.innerHTML = streamers.map((s) => `<option value="${esc(s.id)}">${esc(s.displayName)}</option>`).join('');
    select.value = streamerId || session.streamerId || streamers[0]?.id;
    dlg.showModal();
  }

  /* ------------------------------------------------------------ Session
   * Hiding controls is UX only — the API rejects non-creator submissions and
   * non-admin reviews regardless. */
  let session = { role: 'visitor' };

  async function refreshSession() {
    session = await API.getSession();
    document.documentElement.dataset.role = session.role;
    document.querySelectorAll('[data-open-upload]').forEach((b) => { b.hidden = session.role !== 'creator'; });
    if (session.role !== 'creator' && uploadDlg?.open) uploadDlg.close();
    renderQueues();
  }

  /* ------------------------------------------------------ Review queue */
  const REJECT_REASONS = [
    'Can’t verify the win against the stream',
    'Duplicate of an existing clip',
    'Content rights / copyrighted audio',
    'Shows private account details',
    'Doesn’t meet content guidelines',
  ];

  const SubmissionItem = (c, role) => {
    const s = byId(c.streamerId);
    const src = SOURCES[c.source] || SOURCES.upload;
    const w = c.win;
    return `
    <li class="sub sub--${esc(c.status)}" data-sub="${esc(c.id)}">
      <button type="button" class="sub__thumb clip--${esc(c.source)} tone-${s.accent}" data-open-clip="${esc(c.id)}" aria-label="Preview submission: ${esc(c.title)}">
        ${clipVisual(c)}
        <span class="clip__source">${icon(src.icon)}${esc(src.label)}</span>
        <span class="play-btn play-btn--sm">${icon('play')}</span>
      </button>
      <div class="sub__main">
        <div class="sub__tags">${StatusTag(c.status)}<span class="tag">${esc(CATEGORY[c.category] || '')}</span></div>
        <p class="sub__title">${esc(c.title)}</p>
        <p class="sub__meta">${UI.Avatar({ ...s, size: 'sm' })}<span>${esc(s.displayName)}</span><span>·</span><span>${c.status === 'rejected' && c.reviewedAt ? `Reviewed ${esc(fmt.relTime(c.reviewedAt))}` : `Submitted ${esc(fmt.relTime(c.at))}`}</span></p>
        ${w ? `<p class="sub__win">${icon('crown')}<b>${fmt.mult(w.payout, w.bet)}</b> ${fmt.usd(w.payout)} on a ${fmt.usd(w.bet)} bet · ${esc(w.game)}</p>` : ''}
        ${c.status === 'rejected' && c.rejectionReason ? `<p class="sub__reason"><b>Reason:</b> ${esc(c.rejectionReason)}</p>` : ''}
      </div>
      ${role === 'admin' && c.status === 'pending' ? `
        <div class="sub__actions">
          <button class="btn btn--gold btn--sm" type="button" data-review="approve">${icon('check')}Approve</button>
          <button class="btn btn--ghost btn--sm" type="button" data-review="reject-open">${icon('close')}Reject</button>
        </div>
        <form class="sub__reject" data-reject-form hidden>
          <fieldset>
            <legend class="field__label">Why isn’t this being approved?</legend>
            <div class="sub__reasons">
              ${REJECT_REASONS.map((r, i) => `<label><input type="radio" name="reason-${esc(c.id)}" value="${esc(r)}"${i === 0 ? ' checked' : ''}><span>${esc(r)}</span></label>`).join('')}
            </div>
          </fieldset>
          <label class="field__label" for="note-${esc(c.id)}">Note to the creator <span class="muted">(optional)</span></label>
          <input class="input" id="note-${esc(c.id)}" name="note" maxlength="140" placeholder="e.g. Please re-upload with the bet visible">
          <div class="sub__reject-actions">
            <button class="btn btn--ghost btn--sm" type="button" data-review="reject-cancel">Cancel</button>
            <button class="btn btn--sm btn--danger" type="submit">Reject clip</button>
          </div>
        </form>` : ''}
    </li>`;
  };

  function queueHtml(items, role) {
    const admin = role === 'admin';
    const pendingCount = items.filter((i) => i.status === 'pending').length;
    return `
      <header class="queue__head">
        <div>
          <p class="kicker">${icon(admin ? 'verified' : 'upload')}${admin ? 'Admin only' : 'Only visible to you'}</p>
          <h4 class="queue__title">${admin ? 'Review queue' : 'Your submissions'} <span class="queue__count">${pendingCount}</span></h4>
          <p class="queue__sub">${admin ? 'Nothing is public until you approve it. Approving a big win also publishes it to the Wall of Fame.' : 'Submissions stay private until an admin approves them.'}</p>
        </div>
      </header>
      ${items.length
        ? `<ul class="queue__list">${items.map((c) => SubmissionItem(c, role)).join('')}</ul>`
        : `<p class="queue__empty">${icon('check')}${admin ? 'All caught up — no submissions waiting.' : 'Nothing waiting for review. New submissions show up here until they’re approved.'}</p>`}`;
  }

  const queueMounts = new Set();
  async function renderQueues() {
    const mounts = [...queueMounts].filter((m) => m.isConnected);
    if (!mounts.length) return;
    const role = session.role;
    if (role === 'visitor') { mounts.forEach((m) => { m.hidden = true; m.innerHTML = ''; }); return; }
    const items = await API.getSubmissions();
    if (session.role !== role) return; // role switched while loading
    remember({ clips: items, wins: items.map((i) => i.win).filter(Boolean) });
    mounts.forEach((m) => {
      m.hidden = false;
      m.dataset.role = role;
      m.innerHTML = queueHtml(items, role);
    });
  }

  function mountQueue(el) {
    queueMounts.add(el);
    el.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-review]');
      if (!btn) return;
      const li = btn.closest('[data-sub]');
      const form = li.querySelector('[data-reject-form]');
      const action = btn.dataset.review;
      if (action === 'reject-open') { form.hidden = false; li.querySelector('.sub__actions').hidden = true; form.querySelector('input').focus(); return; }
      if (action === 'reject-cancel') { form.hidden = true; li.querySelector('.sub__actions').hidden = false; li.querySelector('[data-review="reject-open"]').focus(); return; }
      if (action === 'approve') await review(li, 'approve');
    });
    el.addEventListener('submit', async (e) => {
      const form = e.target.closest('[data-reject-form]');
      if (!form) return;
      e.preventDefault();
      const li = form.closest('[data-sub]');
      const reason = form.querySelector('input[type="radio"]:checked')?.value || '';
      const note = form.querySelector('[name="note"]').value.trim();
      await review(li, 'reject', note ? `${reason}. ${note}` : `${reason}.`);
    });
  }

  async function review(li, decision, reason) {
    li.classList.add('is-busy');
    li.querySelectorAll('button').forEach((b) => (b.disabled = true));
    try {
      const result = await API.reviewSubmission(li.dataset.sub, { decision, reason });
      remember({ clips: [result.clip], wins: result.win ? [result.win] : [] });
      if (decision === 'approve') {
        fresh.add(result.clip.id);
        L.toast(result.win ? 'Approved — now live in Clips and on the Wall of Fame.' : 'Approved — now live in Clips.');
        document.dispatchEvent(new CustomEvent('fgdr:highlights-updated', { detail: result }));
      } else {
        L.toast('Rejected. The creator will see the reason.');
      }
      document.dispatchEvent(new CustomEvent('fgdr:submissions-updated', { detail: result }));
    } catch (err) {
      console.error(err);
      L.toast('That didn’t work — please try again.');
      li.classList.remove('is-busy');
      li.querySelectorAll('button').forEach((b) => (b.disabled = false));
    }
  }

  /* ------------------------------------------------------ Global wiring */
  document.addEventListener('click', (e) => {
    const clip = e.target.closest('[data-open-clip]');
    if (clip) { e.preventDefault(); openClip(clip.dataset.openClip); return; }
    const up = e.target.closest('[data-open-upload]');
    if (up) { e.preventDefault(); openUpload({ streamerId: up.dataset.streamer }); }
  });
  document.addEventListener('fgdr:session-changed', refreshSession);
  document.addEventListener('fgdr:submissions-updated', (e) => {
    renderQueues().then(() => {
      if (e.detail?.focus) [...queueMounts].find((m) => m.isConnected && !m.hidden)?.scrollIntoView({ behavior: L.reduceMotion.matches ? 'auto' : 'smooth', block: 'center' });
    });
  });

  function setStreamers(list) {
    streamers = list;
    refreshSession();
    const m = location.hash.match(/^#clip=([\w-]+)/);
    if (m) openClip(m[1]);
  }

  window.Highlights = { SOURCES, CATEGORY, detectSource, SlotArt, WinFeature, WinCard, ClipCard, SourceChips, openClip, openUpload, remember, setStreamers, mountQueue, getSession: () => session };
})();
