/*
 * Design-preview tooling only — NOT part of the production site.
 * Lets reviewers see the site as the public, a creator or an admin, since the
 * preview has no real login. In production the role comes from /api/session.
 */
(function () {
  const ROLES = [
    { id: 'visitor', label: 'Visitor' },
    { id: 'creator', label: 'Creator' },
    { id: 'admin', label: 'Admin' },
  ];
  const read = () => { try { return localStorage.getItem('fgdr:preview-role') || 'visitor'; } catch { return 'visitor'; } };
  const write = (v) => { try { localStorage.setItem('fgdr:preview-role', v); } catch { /* storage unavailable */ } };

  const bar = document.createElement('div');
  bar.className = 'pv-role';
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', 'Preview the site as');

  const render = () => {
    const current = read();
    bar.innerHTML = `<span class="pv-role__label">Preview as</span>${ROLES.map((r) => `<button type="button" data-role="${r.id}" aria-pressed="${r.id === current}">${r.label}</button>`).join('')}`;
  };

  bar.addEventListener('click', (e) => {
    const b = e.target.closest('[data-role]');
    if (!b || b.getAttribute('aria-pressed') === 'true') return;
    write(b.dataset.role);
    render();
    document.dispatchEvent(new CustomEvent('fgdr:session-changed'));
    const note = { visitor: 'Viewing as the public: no upload access.', creator: 'Viewing as FatGuysDontRun (creator): can submit clips for review.', admin: 'Viewing as an admin: can approve or reject submissions.' }[b.dataset.role];
    window.Layout?.toast(note);
  });

  render();
  document.body.appendChild(bar);
  document.addEventListener('fgdr:session-changed', render);
})();
