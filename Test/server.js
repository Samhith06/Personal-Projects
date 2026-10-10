require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const RAZED_URL = 'https://api.razed.com/player/api/v1/referrals/leaderboard';
const REFERRAL_KEY = process.env.RAZED_REFERRAL_KEY;
const REFERRAL_CODE = process.env.RAZED_REFERRAL_CODE;

// Points awarded per placement. Index 0 = 1st place. Sums to 500.
const POINTS_TABLE = [200, 100, 70, 30, 30, 20, 20, 10, 10, 10];

function todayISO(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function startOfMonthISO(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/leaderboard', async (req, res) => {
  if (!REFERRAL_KEY || !REFERRAL_CODE) {
    return res.status(500).json({ error: 'Server is missing RAZED_REFERRAL_KEY or RAZED_REFERRAL_CODE configuration.' });
  }

  const from = req.query.from || startOfMonthISO();
  const to = req.query.to || todayISO();
  const top = req.query.top || '25';

  const url = new URL(RAZED_URL);
  url.searchParams.set('referral_code', REFERRAL_CODE);
  url.searchParams.set('from', from);
  url.searchParams.set('to', to);
  url.searchParams.set('top', top);

  try {
    const upstream = await fetch(url, {
      headers: { 'X-Referral-Key': REFERRAL_KEY },
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '');
      return res.status(upstream.status).json({ error: `Razed API error (${upstream.status})`, details: text });
    }

    const payload = await upstream.json();
    const rows = Array.isArray(payload.data) ? payload.data : [];

    const sorted = [...rows].sort((a, b) => parseFloat(b.wagered) - parseFloat(a.wagered));

    const entries = sorted.map((row, i) => ({
      rank: i + 1,
      username: row.username,
      wagered: parseFloat(row.wagered),
      points: POINTS_TABLE[i] || 0,
    }));

    res.json({
      referral_code: REFERRAL_CODE,
      from: payload.from || from,
      to: payload.to || to,
      total_players: payload.total ?? entries.length,
      max_points: POINTS_TABLE.reduce((a, b) => a + b, 0),
      entries,
    });
  } catch (err) {
    res.status(502).json({ error: 'Failed to reach Razed API', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Leaderboard running at http://localhost:${PORT}`);
});
