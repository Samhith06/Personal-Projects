/*
 * FGDR — sample data for the design preview.
 *
 * Every object here is shaped like a response from the future backend
 * (database + admin dashboard + server-side Kick proxy). Nothing in the UI
 * reads this file directly — it all goes through js/api.js, so swapping the
 * mock for real endpoints does not touch any component.
 *
 * Dates are generated relative to "now" so countdowns always look live.
 */
(function () {
  const now = Date.now();
  const MIN = 60e3, H = 60 * MIN, D = 24 * H;
  const iso = (ms) => new Date(ms).toISOString();
  const atDay = (days, hour, minute = 0) => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    t.setDate(t.getDate() + days);
    t.setHours(hour, minute, 0, 0);
    return t.toISOString();
  };

  /* ---------------------------------------------------------------- Streamers
   * Admin-managed. Social URLs are placeholders ('#') until provided. */
  const streamers = [
    {
      id: 'fatguysdontrun',
      order: 1,
      isPrimary: true,
      displayName: 'FatGuysDontRun',
      monogram: 'FG',
      role: 'Founder · Main Channel',
      accent: 'gold',
      avatarUrl: null,
      bannerUrl: null,
      bio: "The flagship FGDR channel and home base of the crew. Long-form bonus hunts, community sessions and the stream where the leaderboard races are called live.",
      kick: { username: 'fatguysdontrun', url: 'https://www.kick.com/fatguysdontrun' },
      socials: { x: '#', instagram: '#', youtube: '#' },
      stats: { followers: 41200, streamsThisMonth: 18, avgViewers: 2650, peakViewers: 6120, monthWager: 142800, allTimeWager: 2140000, rafflesHosted: 38, challengesHosted: 12 },
    },
    {
      id: 'insanetigers7',
      order: 2,
      isPrimary: false,
      displayName: 'Insane Tigers 7',
      monogram: 'IT',
      role: 'Slots · Viewer Picks',
      accent: 'cyan',
      avatarUrl: null,
      bannerUrl: null,
      bio: "High-energy late-night slots where chat calls the shots. Known for viewer-pick nights and the loudest reactions in the crew.",
      kick: { username: 'insanetigers7', url: 'https://www.kick.com/insanetigers7' },
      socials: { x: '#', instagram: '#', youtube: '#' },
      stats: { followers: 18600, streamsThisMonth: 14, avgViewers: 910, peakViewers: 2480, monthWager: 71300, allTimeWager: 864000, rafflesHosted: 17, challengesHosted: 5 },
    },
    {
      id: 'stillmakinggains',
      order: 3,
      isPrimary: false,
      displayName: 'Still Making Gains',
      monogram: 'SG',
      role: 'The Grinder',
      accent: 'steel',
      avatarUrl: null,
      bannerUrl: null,
      bio: "Steady, disciplined sessions with a focus on bankroll management and leaderboard strategy. The crew's resident numbers guy.",
      kick: { username: 'stillmakinggains', url: 'https://www.kick.com/stillmakinggains' },
      socials: { x: '#', instagram: '#', youtube: '#' },
      stats: { followers: 12900, streamsThisMonth: 11, avgViewers: 640, peakViewers: 1720, monthWager: 58400, allTimeWager: 612000, rafflesHosted: 9, challengesHosted: 7 },
    },
    {
      id: 'dallasghost',
      order: 4,
      isPrimary: false,
      displayName: 'Dallas Ghost',
      monogram: 'DG',
      role: 'Tables · Late Night',
      accent: 'ruby',
      avatarUrl: null,
      bannerUrl: null,
      bio: "Blackjack, table games and the after-midnight crowd. Calm, calculated and always around when everyone else logs off.",
      kick: { username: 'dallasghost', url: 'https://www.kick.com/dallasghost' },
      socials: { x: '#', instagram: '#', youtube: '#' },
      stats: { followers: 15400, streamsThisMonth: 16, avgViewers: 780, peakViewers: 2010, monthWager: 46400, allTimeWager: 670000, rafflesHosted: 12, challengesHosted: 4 },
    },
  ];

  /* -------------------------------------------------------------- Live status
   * In production: a server job polls Kick (credentials stay server-side),
   * caches per channel, and exposes GET /api/live. */
  const liveStatus = {
    fatguysdontrun: {
      isLive: true,
      title: 'Sunday Bonus Hunt — 50 bonuses, all opened live',
      viewers: 3184,
      category: 'Slots & Casino',
      startedAt: iso(now - 2 * H - 18 * MIN),
      thumbnailUrl: null,
      lastLiveAt: null,
    },
    insanetigers7: {
      isLive: false,
      title: null,
      viewers: null,
      category: 'Slots & Casino',
      startedAt: null,
      thumbnailUrl: null,
      lastLiveAt: iso(now - 14 * H),
    },
    stillmakinggains: {
      isLive: false,
      title: null,
      viewers: null,
      category: 'Slots & Casino',
      startedAt: null,
      thumbnailUrl: null,
      lastLiveAt: iso(now - 2 * D - 3 * H),
    },
    dallasghost: {
      isLive: true,
      title: 'Blackjack & chill — viewer challenge night',
      viewers: 1247,
      category: 'Blackjack',
      startedAt: iso(now - 48 * MIN),
      thumbnailUrl: null,
      lastLiveAt: null,
    },
  };

  /* -------------------------------------------------------------- Leaderboard */
  const handles = ['vi***ro', 'ma***88', 'dr***on', 'ki***ng', 'sl***ow', 'ha***ey', 'no***ce', 'bi***gs', 'gr***it', 'ta***er', 'ro***ky', 'fa***lt'];
  const board = ({ period, label, endsAt, rotate, wagers, prizes, moves, total, target, reward }) => ({
    period,
    label,
    endsAt,
    prizePool: prizes.reduce((a, b) => a + (b || 0), 0),
    totalWagered: total,
    nextTier: { target, reward },
    entries: wagers.map((wagered, i) => ({
      rank: i + 1,
      username: handles[(i + rotate) % handles.length],
      avatarUrl: null,
      wagered,
      prize: prizes[i],
      movement: moves[i], // positive = climbed, negative = dropped, null = new entry
    })),
  });

  const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 0);
  const endOfWeek = new Date(endOfToday); endOfWeek.setDate(endOfWeek.getDate() + ((7 - endOfWeek.getDay()) % 7 || 7));
  const endOfMonth = new Date(endOfToday.getFullYear(), endOfToday.getMonth() + 1, 0, 23, 59, 59);

  const leaderboards = {
    today: board({
      period: 'today', label: 'Today', endsAt: endOfToday.toISOString(), rotate: 3,
      wagers: [1960, 1420, 1105, 820, 610, 480, 390, 260, 190, 140],
      prizes: [250, 150, 100, 50, 50, 25, 25, 25, 25, 25],
      moves: [2, -1, 0, 3, -2, null, 1, -1, 0, null],
      total: 8420, target: 10000, reward: '+$250 added to today’s prizes',
    }),
    week: board({
      period: 'week', label: 'This week', endsAt: endOfWeek.toISOString(), rotate: 0,
      wagers: [18240, 13110, 10280, 7640, 5710, 4480, 3620, 2410, 1790, 1320],
      prizes: [1000, 600, 400, 250, 150, 100, 100, 50, 50, 50],
      moves: [1, -1, 2, 0, -2, 1, null, -1, 0, 2],
      total: 74650, target: 100000, reward: 'Unlocks a $1,000 bonus prize tier',
    }),
    month: board({
      period: 'month', label: 'This month', endsAt: endOfMonth.toISOString(), rotate: 1,
      wagers: [84100, 61350, 47800, 35200, 26400, 20100, 15700, 11300, 8200, 6100],
      prizes: [3000, 1750, 1000, 600, 400, 250, 250, 150, 150, 100],
      moves: [0, 1, -1, 2, 0, -2, 1, null, -1, 0],
      total: 318900, target: 500000, reward: 'Unlocks a $2,500 bonus prize tier',
    }),
    alltime: board({
      period: 'alltime', label: 'All time', endsAt: null, rotate: 2,
      wagers: [912400, 688100, 540900, 402300, 311800, 256400, 198700, 151200, 122600, 98400],
      prizes: [null, null, null, null, null, null, null, null, null, null],
      moves: [0, 0, 1, -1, 0, 2, -1, -1, 0, 1],
      total: 4286300, target: 5000000, reward: 'Crew-wide $5M celebration stream',
    }),
  };

  /* ------------------------------------------------------------------ Raffles */
  const raffles = [
    { id: 'rf-rig', status: 'active', name: 'FGDR Custom Gaming Rig', art: 'rig', imageUrl: null, value: 4500, requirement: 'Wager $1,000+ with the FGDR affiliate this week', entries: 1284, startsAt: iso(now - 4 * D), endsAt: iso(now + 2 * D + 5 * H + 12 * MIN), winner: null },
    { id: 'rf-cash', status: 'active', name: '$1,000 Weekly Cash Drop', art: 'cash', imageUrl: null, value: 1000, requirement: 'Follow any FGDR channel on Kick and join the Discord', entries: 3918, startsAt: iso(now - 6 * D), endsAt: iso(now + 9 * H + 20 * MIN), winner: null },
    { id: 'rf-console', status: 'active', name: 'Next-Gen Console Bundle', art: 'console', imageUrl: null, value: 850, requirement: 'Finish in the top 100 of the weekly leaderboard', entries: 96, startsAt: iso(now - 1 * D), endsAt: iso(now + 5 * D + 2 * H), winner: null },
    { id: 'rf-vegas', status: 'upcoming', name: 'VIP Vegas Weekend for Two', art: 'travel', imageUrl: null, value: 6000, requirement: 'Wager $10,000+ with the FGDR affiliate in October', entries: 0, startsAt: iso(now + 18 * D), endsAt: iso(now + 48 * D), winner: null },
    { id: 'rf-chips', status: 'upcoming', name: 'Signature Chip Set & Merch Vault', art: 'chips', imageUrl: null, value: 600, requirement: 'Complete the 7 Day Grind challenge', entries: 0, startsAt: iso(now + 3 * D + 4 * H), endsAt: iso(now + 10 * D), winner: null },
    { id: 'rf-watch', status: 'ended', name: 'Luxury Chronograph Watch', art: 'watch', imageUrl: null, value: 3200, requirement: 'Wager $2,500+ with the FGDR affiliate in August', entries: 2206, startsAt: iso(now - 40 * D), endsAt: iso(now - 6 * D), winner: { username: 'ma***88' } },
    { id: 'rf-summer', status: 'ended', name: '$2,500 Summer Cash Drop', art: 'cash', imageUrl: null, value: 2500, requirement: 'Join the Discord and verify your Kick account', entries: 5140, startsAt: iso(now - 30 * D), endsAt: iso(now - 13 * D), winner: { username: 'ki***ng' } },
  ];

  /* --------------------------------------------------------------- Challenges */
  const challenges = [
    { id: 'ch-weekend', name: 'The Weekend Wager', status: 'active', hostId: 'fatguysdontrun', description: 'A three-day community push. Every wager with the FGDR affiliate from Friday to Sunday counts toward the shared goal.', goal: { label: 'Community goal', type: 'currency', target: 250000, current: 186400 }, startsAt: iso(now - 2 * D), endsAt: endOfToday.toISOString(), prize: '$2,000 split between qualifiers', participants: 312 },
    { id: 'ch-grind', name: '7 Day Grind', status: 'active', hostId: 'stillmakinggains', description: 'Log a qualifying session every day for seven days straight. Miss a day and the streak resets.', goal: { label: 'Challenge day', type: 'count', target: 7, current: 5, unit: 'days' }, startsAt: iso(now - 5 * D), endsAt: iso(now + 2 * D), prize: '$150 per finisher (max 40)', participants: 188 },
    { id: 'ch-100k', name: 'Road to $100K', status: 'active', hostId: 'dallasghost', description: 'The crew-wide September target. Hit $100K together and all four creators run a joint community bonus hunt.', goal: { label: 'Community goal', type: 'currency', target: 100000, current: 71250 }, startsAt: iso(now - 12 * D), endsAt: endOfMonth.toISOString(), prize: 'Crew bonus hunt + $5,000 raffle pool', participants: 947 },
    { id: 'ch-champ', name: 'Monthly Championship', status: 'upcoming', hostId: 'insanetigers7', description: 'A full-month head-to-head race for the top of the FGDR board. Registration opens a week before kickoff.', goal: { label: 'Registered', type: 'count', target: 500, current: 0, unit: 'players' }, startsAt: iso(endOfMonth.getTime() + 1000), endsAt: iso(endOfMonth.getTime() + 31 * D), prize: '$7,500 prize pool', participants: 0 },
  ];

  /* --------------------------------------------------------------- Milestones
   * `member` would come from the signed-in user's linked account. */
  const milestones = {
    member: { label: 'Sample member', wagered: 12840 },
    tiers: [
      { id: 'ms-1', name: 'First Chip', threshold: 1000, reward: 'VIP Discord role + lounge access' },
      { id: 'ms-2', name: 'Stacked', threshold: 5000, reward: '$50 reward + FGDR sticker pack' },
      { id: 'ms-3', name: 'High Roller', threshold: 10000, reward: '$125 reward + FGDR cap' },
      { id: 'ms-4', name: 'Private Table', threshold: 25000, reward: '$350 reward + crew hoodie' },
      { id: 'ms-5', name: 'Black Card', threshold: 50000, reward: '$800 reward + signed chip set' },
      { id: 'ms-6', name: 'Legend', threshold: 100000, reward: '$2,000 reward + Legend plaque' },
    ],
  };

  /* ----------------------------------------------------------------- Activity */
  const activity = [
    { id: 'a0', type: 'fame', title: 'New on the Wall of Fame: Still Making Gains hits x2,850 on Frozen Crown', tag: 'Wall of Fame', at: iso(now - 20 * MIN) },
    { id: 'a1', type: 'winner', title: 'ma***88 won the Luxury Chronograph Watch raffle', tag: 'Raffle winner', at: iso(now - 35 * MIN) },
    { id: 'a2', type: 'leaderboard', title: 'vi***ro climbed to #1 on the weekly leaderboard', tag: 'Leaderboard', at: iso(now - 72 * MIN) },
    { id: 'a3', type: 'stream', title: "FatGuysDontRun went live — Sunday Bonus Hunt", tag: 'Live', at: iso(now - 2 * H - 18 * MIN) },
    { id: 'a4', type: 'challenge', title: 'New challenge announced: Monthly Championship', tag: 'Challenge', at: iso(now - 5 * H) },
    { id: 'a5', type: 'update', title: 'The VIP Discord lounge is now open to First Chip members', tag: 'Community', at: iso(now - 1 * D - 2 * H) },
    { id: 'a6', type: 'challenge', title: '38 members completed last week’s 7 Day Grind', tag: 'Challenge', at: iso(now - 2 * D) },
    { id: 'a7', type: 'winner', title: 'ki***ng took home the $2,500 Summer Cash Drop', tag: 'Raffle winner', at: iso(now - 13 * D) },
  ];

  const announcement = {
    id: 'an-collab',
    kicker: 'Special stream',
    title: 'All four. One stream.',
    body: 'The full FGDR crew goes live together this Friday for a four-way collab — shared bonus hunt, live raffle draws and the Road to $100K check-in.',
    at: atDay(5, 21),
    streamerIds: ['fatguysdontrun', 'insanetigers7', 'stillmakinggains', 'dallasghost'],
  };

  /* ----------------------------------------------------------------- Schedule */
  const schedule = [
    { id: 's1', streamerId: 'insanetigers7', startsAt: atDay(0, 22, 30), durationMin: 180, platform: 'kick', title: 'Late Night Slots with the Tigers' },
    { id: 's2', streamerId: 'fatguysdontrun', startsAt: atDay(1, 20), durationMin: 240, platform: 'kick', title: 'Monday Night Bonus Hunt' },
    { id: 's3', streamerId: 'dallasghost', startsAt: atDay(1, 23), durationMin: 180, platform: 'kick', title: 'Ghost Hours: Blackjack Marathon' },
    { id: 's4', streamerId: 'stillmakinggains', startsAt: atDay(2, 18), durationMin: 150, platform: 'kick', title: 'Grinding the Weekly Leaderboard' },
    { id: 's5', streamerId: 'insanetigers7', startsAt: atDay(2, 19, 30), durationMin: 180, platform: 'kick', title: 'Viewer Picks: You Choose the Slot' },
    { id: 's6', streamerId: 'fatguysdontrun', startsAt: atDay(3, 21), durationMin: 180, platform: 'kick', title: 'Midweek High-Roller Session' },
    { id: 's7', streamerId: 'stillmakinggains', startsAt: atDay(4, 18), durationMin: 150, platform: 'kick', title: 'Road to $100K Check-in' },
    { id: 's8', streamerId: 'dallasghost', startsAt: atDay(4, 22), durationMin: 180, platform: 'kick', title: 'Tables & Talk' },
    { id: 's9', streamerId: 'fatguysdontrun', startsAt: atDay(5, 21), durationMin: 300, platform: 'kick', title: 'Crew Collab — All Four, One Stream', special: true },
    { id: 's10', streamerId: 'insanetigers7', startsAt: atDay(6, 20), durationMin: 180, platform: 'kick', title: 'Saturday Big Bets' },
    { id: 's11', streamerId: 'dallasghost', startsAt: atDay(6, 23), durationMin: 150, platform: 'kick', title: 'Midnight Table Session' },
  ];

  /* ------------------------------------------------------------ Recent streams */
  const recentStreams = {
    fatguysdontrun: [
      { id: 'v1', title: 'Friday Night Bonus Hunt — 40 bonuses', at: iso(now - 2 * D), durationMin: 262, peakViewers: 5840, category: 'Slots & Casino' },
      { id: 'v2', title: 'Leaderboard race: final hour live', at: iso(now - 4 * D), durationMin: 198, peakViewers: 4410, category: 'Slots & Casino' },
      { id: 'v3', title: 'Community raffle draw + high-roller spins', at: iso(now - 6 * D), durationMin: 221, peakViewers: 6120, category: 'Slots & Casino' },
      { id: 'v4', title: 'Monday Night Bonus Hunt', at: iso(now - 7 * D), durationMin: 240, peakViewers: 3920, category: 'Slots & Casino' },
    ],
    insanetigers7: [
      { id: 'v5', title: 'Viewer Picks: chat chooses every slot', at: iso(now - 14 * H), durationMin: 184, peakViewers: 2480, category: 'Slots & Casino' },
      { id: 'v6', title: 'Late Night Slots with the Tigers', at: iso(now - 3 * D), durationMin: 172, peakViewers: 1640, category: 'Slots & Casino' },
      { id: 'v7', title: 'Saturday Big Bets', at: iso(now - 8 * D), durationMin: 195, peakViewers: 1910, category: 'Slots & Casino' },
    ],
    stillmakinggains: [
      { id: 'v8', title: 'Bankroll plan for the monthly board', at: iso(now - 2 * D - 3 * H), durationMin: 146, peakViewers: 1320, category: 'Slots & Casino' },
      { id: 'v9', title: 'Grinding the Weekly Leaderboard', at: iso(now - 5 * D), durationMin: 158, peakViewers: 1720, category: 'Slots & Casino' },
      { id: 'v10', title: '7 Day Grind — day one kickoff', at: iso(now - 6 * D), durationMin: 131, peakViewers: 1180, category: 'Slots & Casino' },
    ],
    dallasghost: [
      { id: 'v11', title: 'Ghost Hours: Blackjack Marathon', at: iso(now - 1 * D - 20 * H), durationMin: 205, peakViewers: 2010, category: 'Blackjack' },
      { id: 'v12', title: 'Tables & Talk with the crew', at: iso(now - 4 * D), durationMin: 168, peakViewers: 1420, category: 'Blackjack' },
      { id: 'v13', title: 'Midnight Table Session', at: iso(now - 7 * D), durationMin: 142, peakViewers: 1290, category: 'Table Games' },
    ],
  };

  /* --------------------------------------------------------- Channel milestones */
  const channelMilestones = {
    fatguysdontrun: [
      { label: 'Kick followers', current: 41200, target: 50000, format: 'number' },
      { label: 'Community wager', current: 2140000, target: 2500000, format: 'currency' },
      { label: 'Raffles hosted', current: 38, target: 50, format: 'number' },
    ],
    insanetigers7: [
      { label: 'Kick followers', current: 18600, target: 20000, format: 'number' },
      { label: 'Community wager', current: 864000, target: 1000000, format: 'currency' },
      { label: 'Raffles hosted', current: 17, target: 25, format: 'number' },
    ],
    stillmakinggains: [
      { label: 'Kick followers', current: 12900, target: 15000, format: 'number' },
      { label: 'Community wager', current: 612000, target: 750000, format: 'currency' },
      { label: 'Challenges hosted', current: 7, target: 10, format: 'number' },
    ],
    dallasghost: [
      { label: 'Kick followers', current: 15400, target: 20000, format: 'number' },
      { label: 'Community wager', current: 670000, target: 750000, format: 'currency' },
      { label: 'Raffles hosted', current: 12, target: 20, format: 'number' },
    ],
  };

  /* ------------------------------------------------------------ Wall of Fame
   * Creator-submitted big wins. Multiplier is always derived from payout / bet
   * so it can never disagree with the numbers. Every submission starts as
   * status 'pending'; only 'approved' items are ever returned to the public. */
  const wins = [
    { id: 'w1', streamerId: 'fatguysdontrun', game: 'Olympus Vault 1000', provider: 'Hexline Gaming', bet: 20, payout: 249000, at: iso(now - 19 * D), clipId: 'c1', imageUrl: null },
    { id: 'w2', streamerId: 'dallasghost', game: 'Sugar Heist', provider: 'Brightreel', bet: 40, payout: 186400, at: iso(now - 6 * D), clipId: 'c3', imageUrl: null },
    { id: 'w3', streamerId: 'insanetigers7', game: 'Wild Tiger Temple', provider: 'Nightfall Slots', bet: 5, payout: 48250, at: iso(now - 2 * D), clipId: 'c2', imageUrl: null },
    { id: 'w4', streamerId: 'stillmakinggains', game: 'Crypt of Riches', provider: 'Hexline Gaming', bet: 10, payout: 61300, at: iso(now - 33 * D), clipId: null, imageUrl: null },
    { id: 'w5', streamerId: 'fatguysdontrun', game: 'Deep Sea Payday', provider: 'Brightreel', bet: 100, payout: 142000, at: iso(now - 11 * D), clipId: 'c5', imageUrl: null },
    { id: 'w6', streamerId: 'insanetigers7', game: 'Neon Cascade', provider: 'Nightfall Slots', bet: 2, payout: 15840, at: iso(now - 45 * D), clipId: null, imageUrl: null },
    { id: 'w7', streamerId: 'dallasghost', game: 'Pharaoh’s Stack', provider: 'Goldline', bet: 50, payout: 97500, at: iso(now - 3 * D), clipId: 'c7', imageUrl: null },
    { id: 'w8', streamerId: 'stillmakinggains', game: 'Frozen Crown', provider: 'Goldline', bet: 25, payout: 71250, at: iso(now - 1 * D), clipId: null, imageUrl: null },
  ];

  /* -------------------------------------------------------------------- Clips
   * source: kick | x | instagram | youtube | tiktok | upload
   * Link clips: the server resolves oEmbed → embedUrl + thumbnailUrl.
   * Uploads: stored in object storage, transcoded, mediaUrl + thumbnailUrl. */
  const SAMPLE_VIDEO = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260702_102608_5fa1187d-9ac6-44fb-82ab-54376200abc0.mp4';
  const clips = [
    { id: 'c1', source: 'upload', category: 'big-win', streamerId: 'fatguysdontrun', title: 'x12,450 on Olympus Vault — the full reaction', url: null, embedUrl: null, mediaUrl: SAMPLE_VIDEO, mediaType: 'video', thumbnailUrl: null, orientation: 'landscape', durationSec: 48, views: 182000, at: iso(now - 19 * D) },
    { id: 'c2', source: 'kick', category: 'big-win', streamerId: 'insanetigers7', title: 'Tigers hit x9,650 on a $5 spin', url: '#', embedUrl: null, mediaUrl: null, thumbnailUrl: null, orientation: 'landscape', durationSec: 36, views: 64100, at: iso(now - 2 * D) },
    { id: 'c3', source: 'x', category: 'big-win', streamerId: 'dallasghost', title: '$186K Sugar Heist — chat went completely silent', url: '#', embedUrl: null, mediaUrl: null, thumbnailUrl: null, orientation: 'landscape', durationSec: 59, views: 41200, at: iso(now - 6 * D) },
    { id: 'c4', source: 'instagram', category: 'funny', streamerId: 'fatguysdontrun', title: 'Crew collab bloopers, part two', url: '#', embedUrl: null, mediaUrl: null, thumbnailUrl: null, orientation: 'portrait', durationSec: 28, views: 88400, at: iso(now - 4 * D) },
    { id: 'c5', source: 'youtube', category: 'highlight', streamerId: 'fatguysdontrun', title: 'Every max win from August — supercut', url: '#', embedUrl: null, mediaUrl: null, thumbnailUrl: null, orientation: 'landscape', durationSec: 612, views: 120500, at: iso(now - 11 * D) },
    { id: 'c6', source: 'tiktok', category: 'funny', streamerId: 'insanetigers7', title: 'When the bonus buy actually pays', url: '#', embedUrl: null, mediaUrl: null, thumbnailUrl: null, orientation: 'portrait', durationSec: 22, views: 230000, at: iso(now - 8 * D) },
    { id: 'c7', source: 'kick', category: 'big-win', streamerId: 'dallasghost', title: 'Pharaoh’s Stack x1,950 live on stream', url: '#', embedUrl: null, mediaUrl: null, thumbnailUrl: null, orientation: 'landscape', durationSec: 41, views: 23800, at: iso(now - 3 * D) },
    { id: 'c8', source: 'kick', category: 'highlight', streamerId: 'stillmakinggains', title: '7 Day Grind finale — the last spin', url: '#', embedUrl: null, mediaUrl: null, thumbnailUrl: null, orientation: 'landscape', durationSec: 74, views: 15600, at: iso(now - 1 * D - 5 * H) },
    { id: 'c9', source: 'x', category: 'funny', streamerId: 'insanetigers7', title: 'Viewer-pick chaos: chat chose violence', url: '#', embedUrl: null, mediaUrl: null, thumbnailUrl: null, orientation: 'landscape', durationSec: 31, views: 19300, at: iso(now - 12 * D) },
    { id: 'c10', source: 'instagram', category: 'big-win', streamerId: 'dallasghost', title: 'Triple double-down at the blackjack table', url: '#', embedUrl: null, mediaUrl: null, thumbnailUrl: null, orientation: 'portrait', durationSec: 19, views: 52700, at: iso(now - 15 * D) },
  ];

  // Everything above is already live
  [...wins, ...clips].forEach((item) => { item.status = 'approved'; item.submittedBy = item.streamerId; });

  /* ------------------------------------------------------- Moderation queue
   * Creator submissions waiting on (or rejected by) an admin. */
  clips.push(
    { id: 'c-p1', status: 'pending', submittedBy: 'fatguysdontrun', source: 'kick', category: 'big-win', streamerId: 'fatguysdontrun', title: 'x3,120 on Sugar Heist — last spin of the night', url: '#', embedUrl: null, mediaUrl: null, thumbnailUrl: null, orientation: 'landscape', durationSec: 44, views: 0, at: iso(now - 2 * H) },
    { id: 'c-p2', status: 'pending', submittedBy: 'dallasghost', source: 'x', category: 'highlight', streamerId: 'dallasghost', title: 'Split aces twice in a row at the high-limit table', url: '#', embedUrl: null, mediaUrl: null, thumbnailUrl: null, orientation: 'landscape', durationSec: 38, views: 0, at: iso(now - 5 * H) },
    { id: 'c-p3', status: 'rejected', submittedBy: 'fatguysdontrun', source: 'instagram', category: 'funny', streamerId: 'fatguysdontrun', title: 'Crew collab bloopers (director’s cut)', url: '#', embedUrl: null, mediaUrl: null, thumbnailUrl: null, orientation: 'portrait', durationSec: 41, views: 0, at: iso(now - 30 * H), rejectionReason: 'Duplicate — already posted as “Crew collab bloopers, part two”.', reviewedAt: iso(now - 26 * H) },
    { id: 'c-p4', status: 'pending', submittedBy: 'insanetigers7', source: 'tiktok', category: 'funny', streamerId: 'insanetigers7', title: 'Chat picked the worst slot imaginable', url: '#', embedUrl: null, mediaUrl: null, thumbnailUrl: null, orientation: 'portrait', durationSec: 27, views: 0, at: iso(now - 20 * H) }
  );
  wins.push({ id: 'w-p1', status: 'pending', submittedBy: 'fatguysdontrun', streamerId: 'fatguysdontrun', game: 'Sugar Heist', provider: 'Brightreel', bet: 25, payout: 78000, at: iso(now - 2 * H), clipId: 'c-p1', imageUrl: null });

  /* ------------------------------------------------------------------ Session
   * Production: GET /api/session from the auth cookie. Only accounts an admin
   * has marked as creators get role 'creator'; the public is 'visitor'. */
  const sessions = {
    visitor: { role: 'visitor' },
    creator: { role: 'creator', streamerId: 'fatguysdontrun' },
    admin: { role: 'admin' },
  };

  /* -------------------------------------------------------------------- Stats */
  const stats = [
    { key: 'totalWager', label: 'Total community wager', value: 4286300, format: 'currency' },
    { key: 'monthWager', label: 'Current month wager', value: 318900, format: 'currency' },
    { key: 'activeChallenges', label: 'Active challenges', value: challenges.filter((c) => c.status === 'active').length, format: 'number' },
    { key: 'prizesAwarded', label: 'Total prizes awarded', value: 186500, format: 'currency' },
    { key: 'activeMembers', label: 'Active members', value: 12480, format: 'number' },
  ];

  const site = {
    communityUrl: '#', // Discord invite — placeholder
    socials: { x: '#', instagram: '#', youtube: '#', discord: '#' },
  };

  window.FGDR_MOCK = { site, streamers, liveStatus, leaderboards, raffles, challenges, milestones, activity, announcement, schedule, recentStreams, channelMilestones, stats, wins, clips, sessions };
})();
