/*
 * FGDR data access layer.
 *
 * Every component reads data through these functions and nothing else.
 * In the production build each call maps 1:1 to a server route that reads
 * from the database / admin dashboard. Kick is only ever called from the
 * server (API credentials never reach the browser).
 *
 *   getStreamers()          GET /api/streamers
 *   getLiveStatus()         GET /api/live               (server caches Kick, UI polls every 60s)
 *   getLeaderboard(period)  GET /api/leaderboard?period=today|week|month|alltime
 *   getRaffles()            GET /api/raffles
 *   getChallenges()         GET /api/challenges
 *   getMilestones()         GET /api/milestones          (member progress requires auth)
 *   getActivity()           GET /api/activity
 *   getAnnouncement()       GET /api/announcements/featured
 *   getSchedule(id?)        GET /api/schedule?streamer=
 *   getStats()              GET /api/stats
 *   getRecentStreams(id)    GET /api/streamers/:id/streams
 *   getChannelMilestones(id)GET /api/streamers/:id/milestones
 *   getWins({sort,streamerId}) GET /api/wins?sort=multiplier|payout|latest&streamer=   (approved only)
 *   getClips({source,streamerId}) GET /api/clips?source=&streamer=                   (approved only)
 *   getSession()            GET /api/session
 *   submitClip(payload)     POST /api/clips                    creator only → status 'pending'
 *   getSubmissions()        GET /api/submissions               creator: own pending/rejected · admin: all pending
 *   reviewSubmission(id, d) PATCH /api/submissions/:id          admin only → approve | reject (+ reason)
 *
 * Moderation rules (enforced on the server, not by hiding buttons):
 *   - Only accounts with role 'creator' can submit. Visitors/community cannot.
 *   - New submissions are private until an admin approves them.
 *   - Approving a clip also publishes its linked Wall of Fame win.
 *
 * Clip submissions in production:
 *   - Link clips: server validates the URL, resolves oEmbed (Kick/X/Instagram/
 *     YouTube/TikTok) for title, thumbnail and embed markup.
 *   - File uploads: browser asks the server for a signed upload URL and sends
 *     the file straight to object storage; a transcoding job creates the
 *     streamable video + thumbnail. Large files never pass through the API.
 */
(function () {
  const USE_MOCK = true; // flip to false once the backend routes exist
  const BASE_URL = '/api';

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const clone = (v) => JSON.parse(JSON.stringify(v));

  async function request(path, mockPick) {
    if (!USE_MOCK) {
      const res = await fetch(BASE_URL + path, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`Request failed: ${res.status} ${path}`);
      return res.json();
    }
    await wait(280 + Math.random() * 380); // simulated latency so loading states are visible
    return clone(mockPick(window.FGDR_MOCK));
  }

  const jitter = (n) => Math.max(0, Math.round(n * (0.985 + Math.random() * 0.03)));

  window.FGDR_API = {
    getSite: () => request('/site', (d) => d.site),
    getStreamers: () => request('/streamers', (d) => [...d.streamers].sort((a, b) => a.order - b.order)),
    getLiveStatus: () =>
      request('/live', (d) => {
        const out = clone(d.liveStatus);
        Object.values(out).forEach((s) => { if (s.isLive) s.viewers = jitter(s.viewers); });
        return out;
      }),
    getLeaderboard: (period = 'week') => request(`/leaderboard?period=${period}`, (d) => d.leaderboards[period]),
    getRaffles: () => request('/raffles', (d) => d.raffles),
    getChallenges: () => request('/challenges', (d) => d.challenges),
    getMilestones: () => request('/milestones', (d) => d.milestones),
    getActivity: () => request('/activity', (d) => d.activity),
    getAnnouncement: () => request('/announcements/featured', (d) => d.announcement),
    getSchedule: (streamerId) =>
      request(`/schedule${streamerId ? `?streamer=${streamerId}` : ''}`, (d) =>
        d.schedule
          .filter((s) => !streamerId || s.streamerId === streamerId)
          .filter((s) => new Date(s.startsAt).getTime() + s.durationMin * 60e3 > Date.now())
          .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))
      ),
    getStats: () => request('/stats', (d) => d.stats),
    getRecentStreams: (id) => request(`/streamers/${id}/streams`, (d) => d.recentStreams[id] || []),
    getChannelMilestones: (id) => request(`/streamers/${id}/milestones`, (d) => d.channelMilestones[id] || []),

    getWins: ({ sort = 'multiplier', streamerId } = {}) =>
      request(`/wins?sort=${sort}${streamerId ? `&streamer=${streamerId}` : ''}`, (d) => {
        const key = { multiplier: (w) => w.payout / w.bet, payout: (w) => w.payout, latest: (w) => new Date(w.at).getTime() }[sort];
        return d.wins.filter((w) => w.status === 'approved' && (!streamerId || w.streamerId === streamerId)).sort((a, b) => key(b) - key(a));
      }),
    getClips: ({ source = 'all', streamerId } = {}) =>
      request(`/clips?source=${source}${streamerId ? `&streamer=${streamerId}` : ''}`, (d) =>
        d.clips
          .filter((c) => c.status === 'approved' && (source === 'all' || c.source === source) && (!streamerId || c.streamerId === streamerId))
          .sort((a, b) => new Date(b.at) - new Date(a.at))
      ),

    // Preview only: the role comes from the "Preview as" switch instead of a login.
    getSession: () =>
      request('/session', (d) => {
        let role = 'visitor';
        try { role = localStorage.getItem('fgdr:preview-role') || 'visitor'; } catch { /* storage unavailable */ }
        return d.sessions[role] || d.sessions.visitor;
      }),

    async getSubmissions() {
      const session = await this.getSession();
      return request('/submissions', (d) => {
        const withWin = (c) => ({ ...c, win: d.wins.find((w) => w.clipId === c.id) || null });
        if (session.role === 'admin') {
          return d.clips.filter((c) => c.status === 'pending').sort((a, b) => new Date(a.at) - new Date(b.at)).map(withWin); // oldest first
        }
        if (session.role === 'creator') {
          return d.clips.filter((c) => c.submittedBy === session.streamerId && c.status !== 'approved').sort((a, b) => new Date(b.at) - new Date(a.at)).map(withWin);
        }
        return [];
      });
    },

    async reviewSubmission(id, { decision, reason = '' }) {
      const session = await this.getSession();
      if (!USE_MOCK) {
        const res = await fetch(`${BASE_URL}/submissions/${encodeURIComponent(id)}`, {
          method: 'PATCH', credentials: 'include',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ decision, reason }),
        });
        if (!res.ok) throw new Error(`Review failed: ${res.status}`);
        return res.json();
      }
      if (session.role !== 'admin') throw new Error('Forbidden: admins only');
      await wait(500);
      const d = window.FGDR_MOCK;
      const clip = d.clips.find((c) => c.id === id);
      if (!clip || clip.status !== 'pending') throw new Error('Submission not found');
      const win = d.wins.find((w) => w.clipId === id) || null;
      const status = decision === 'approve' ? 'approved' : 'rejected';
      const reviewedAt = new Date().toISOString();
      [clip, win].filter(Boolean).forEach((item) => Object.assign(item, { status, reviewedAt, rejectionReason: status === 'rejected' ? reason : null }));
      if (status === 'approved') {
        clip.at = reviewedAt; // goes live now
        if (win) win.at = reviewedAt;
      }
      return clone({ clip, win });
    },

    async submitClip(payload) {
      if (!USE_MOCK) {
        // Production: request a signed upload URL first for files (see header), then POST metadata.
        const res = await fetch(`${BASE_URL}/clips`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ ...payload, file: undefined }),
        });
        if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
        return res.json();
      }
      const session = await this.getSession();
      if (session.role !== 'creator') throw new Error('Forbidden: only FGDR creators can submit clips');
      await wait(900 + Math.random() * 500);
      const d = window.FGDR_MOCK;
      const id = `c${Date.now()}`;
      const clip = {
        id,
        status: 'pending',
        submittedBy: session.streamerId,
        source: payload.source,
        category: payload.category,
        streamerId: payload.streamerId,
        title: payload.title,
        url: payload.url || null,
        embedUrl: payload.embedUrl || null,
        mediaUrl: payload.mediaUrl || null,
        mediaType: payload.mediaType || null,
        thumbnailUrl: payload.thumbnailUrl || null,
        orientation: payload.orientation || 'landscape',
        durationSec: payload.durationSec || null,
        views: 0,
        at: new Date().toISOString(),
      };
      d.clips.push(clip);
      let win = null;
      if (payload.win) {
        win = { id: `w${Date.now()}`, status: 'pending', submittedBy: session.streamerId, streamerId: payload.streamerId, game: payload.win.game, provider: payload.win.provider || '', bet: payload.win.bet, payout: payload.win.payout, at: clip.at, clipId: id, imageUrl: payload.mediaType === 'image' ? payload.mediaUrl : payload.thumbnailUrl };
        d.wins.push(win);
      }
      return clone({ clip, win });
    },
  };
})();
