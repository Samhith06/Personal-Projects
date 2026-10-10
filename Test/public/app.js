const POINTS_TABLE = [200, 100, 70, 30, 30, 20, 20, 10, 10, 10];

const fromInput = document.getElementById('from');
const toInput = document.getElementById('to');
const refreshBtn = document.getElementById('refresh');
const statusEl = document.getElementById('status');
const rowsEl = document.getElementById('rows');
const metaEl = document.getElementById('meta');
const pointsKeyEl = document.getElementById('pointsKey');

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function renderPointsKey() {
  pointsKeyEl.innerHTML = POINTS_TABLE
    .map((pts, i) => `<span class="chip">${ordinal(i + 1)}: ${pts} pts</span>`)
    .join('');
}

function fmtMoney(n) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function defaultDates() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const iso = (d) => d.toISOString().slice(0, 10);
  return { from: iso(start), to: iso(today) };
}

async function loadLeaderboard() {
  const from = fromInput.value;
  const to = toInput.value;
  statusEl.textContent = 'Loading...';
  refreshBtn.disabled = true;

  try {
    const url = new URL('/api/leaderboard', window.location.origin);
    if (from) url.searchParams.set('from', from);
    if (to) url.searchParams.set('to', to);

    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `Request failed (${res.status})`);
    }

    renderRows(data.entries);
    metaEl.textContent = `Showing ${data.entries.length} of ${data.total_players} players · ${data.from} to ${data.to} · ${data.max_points} points up for grabs`;
    statusEl.textContent = '';
  } catch (err) {
    rowsEl.innerHTML = `<tr><td colspan="4" class="empty">${err.message}</td></tr>`;
    statusEl.textContent = 'Error';
  } finally {
    refreshBtn.disabled = false;
  }
}

function renderRows(entries) {
  if (!entries || entries.length === 0) {
    rowsEl.innerHTML = '<tr><td colspan="4" class="empty">No wagers found for this period.</td></tr>';
    return;
  }

  rowsEl.innerHTML = entries
    .map((e) => {
      const topClass = e.rank <= 3 ? `top${e.rank}` : '';
      const pointsCell = e.points > 0 ? `<strong>${e.points}</strong>` : '&mdash;';
      return `
        <tr class="${topClass}">
          <td class="col-rank"><span class="rank-badge">${e.rank}</span></td>
          <td class="col-player">${e.username}</td>
          <td class="col-wagered">$${fmtMoney(e.wagered)}</td>
          <td class="col-points">${pointsCell}</td>
        </tr>`;
    })
    .join('');
}

refreshBtn.addEventListener('click', loadLeaderboard);

const { from, to } = defaultDates();
fromInput.value = from;
toInput.value = to;
renderPointsKey();
loadLeaderboard();
