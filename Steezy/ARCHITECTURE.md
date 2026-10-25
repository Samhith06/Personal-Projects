# SteezySpins — Architecture

Community site for the gambling streamer **Steezy** (Kick). Users log in with Discord, link Kick and Roobet,
and earn badges, leaderboard placings, milestones, raffle tickets and giveaway entries from watch time and wager.

Status: **draft for discussion** — nothing built yet. Points/store is explicitly deferred.

---

## 1. External integrations

| Service | Use | Notes |
|---|---|---|
| Discord OAuth | Primary login | Auth.js (NextAuth) Discord provider. Community invite: https://discord.gg/PJpphDDS73 |
| Kick OAuth | Optional account link | Official Kick public API (OAuth 2.1 + PKCE) |
| Kick chat + events | Watch time, `!verify`, bot commands, live status | Kick event webhooks (`chat.message.sent`, `livestream.status.updated`); bot replies via Kick chat API. Fallback: Pusher websocket listener |
| Roobet affiliate API | Wagers for leaderboard / milestones / raffles | `GET https://roobetconnect.com/affiliate/v2/stats?userId&startDate&endDate`, Bearer key. **Verified working.** Referral: https://roobet.com/?ref=STZY |
| bonushunt.gg API | Bonus hunts, slot tournaments | Docs still needed |

### Roobet response (confirmed 2026-10-22)

Array, one row per referred player active in the range:

```json
{
  "uid": "…",                 // stable Roobet user id → lock to this, not the username
  "username": "…",
  "wagered": 2620.55,
  "weightedWagered": 606.03,  // house-edge weighted; leaderboard can use either
  "favoriteGameId": "…", "favoriteGameTitle": "…",
  "rankLevel": 1, "rankLevelImage": "https://…",
  "highestMultiplier": { "multiplier": 81.5, "wagered": 3, "payout": 244.5, "gameId": "…", "gameTitle": "…" }
}
```

Implications:
- Only **aggregate per range** is returned, no per-bet history → worker stores **daily snapshots** by querying
  each day's window (and re-queries the last ~2 days to catch late settlement).
- Username approval can be checked automatically: does the username appear in affiliate data (i.e. signed up under `STZY`)?
  On approval we store the Roobet `uid`, so a later Roobet username change doesn't break the link.
- `highestMultiplier` feeds the **Hall of Fame** (biggest wins) for free.

---

## 2. System shape

```
                ┌──────────────── Next.js app (Vercel) ─────────────────┐
 Users ───────► │ Public site · Profiles · Leaderboard · Milestones ·   │
                │ Raffles · Giveaways · Hall of Fame · Hunts            │
 Admin ───────► │ Admin dashboard (RBAC)                                │
 OBS   ───────► │ /overlay/* browser sources (token-protected)          │
 Kick  ──webhooks──► /api/kick/webhook (verify signature → enqueue)     │
                └───────┬───────────────────────────────▲───────────────┘
                        │                               │ realtime (Socket.io / SSE via Redis pub/sub)
                  ┌─────▼─────┐                  ┌──────┴───────┐
                  │ Postgres  │◄─────────────────│   Worker     │  always-on (Railway / Fly)
                  │ (Drizzle) │                  │ - chat processor + bot replies
                  └─────▲─────┘                  │ - Roobet sync (every 10–15 min)
                        │                        │ - bonushunt.gg sync
                  ┌─────┴─────┐                  │ - badge / watch-time / raffle jobs
                  │   Redis   │◄─────────────────│ - live-status notifier
                  └───────────┘                  └──────────────┘
```

Stack: Next.js (App Router) + TypeScript + Tailwind, Postgres + Drizzle, Redis, Auth.js. Mirrors `FTDWEBSITE/`
so its patterns (migrations, hunts, giveaways) can be reused.

---

## 3. Features

### 3.1 Accounts & linking
- Discord login creates the user. Kick link via **Kick OAuth** or **chat code** (`!verify 7KX2Q`, 10-min expiry).
- Uniques: `discord_id`, `kick_user_id`, `roobet_uid` — one of each per account.
- Roobet username: `none → pending → approved (locked) | rejected(reason)`. Admin sees whether it appears in affiliate data.
  Only Owner can unlock; every change audited.

### 3.2 Watch time & attendance (chat-based)
- Stream session = between `livestream.status.updated` live/offline events.
- Heartbeat credit: consecutive messages ≤ 10 min apart → credit the gap; otherwise credit flat 5 min. Outside a session → 0.
- Anti-farm: ignore duplicates / < 2-char messages, max credit rate per minute.
- Attended = ≥ 1 counted message in the session.
- Store per-user per-session minute totals (+ raw message timestamps for recompute). Lurkers get 0 — known limitation.

### 3.3 Badges
Admin-configurable rules (New / Regular / VIP / …) evaluated by a job; manual grants override. Synced to Discord roles later.

### 3.4 Monthly wager leaderboard
Admin config: period, prize tiers, min wager, raw vs weighted, exclusions, name masking, freeze & publish. Archived → Hall of Fame.

### 3.5 Milestones
Lifetime (or per-period) wager thresholds. `claimable → claimed → paid`, payout queue in admin, `unique(user, milestone)`.

### 3.6 Wager-based raffles
- Admin creates a raffle: window, ticket rate (e.g. 1 ticket / $1,000 wagered, raw or weighted), max tickets per user, prizes.
- Tickets computed from snapshots inside the window; frozen at close.
- Same provably-fair draw as giveaways (weighted by tickets). Winners shown on site + OBS overlay.

### 3.7 Giveaways (live, OBS)
- Entry via site button or chat keyword (`!join`). Eligibility filters: Kick linked, Roobet approved, min watch time / wager.
- Provably fair: publish `sha256(seed)` before draw, reveal seed after.
- Overlay `/overlay/giveaway?token=…` (entries counter, spin, winner).

### 3.8 Bonus hunts & slot tournaments
Synced from bonushunt.gg; overlays for hunt progress and bracket; "guess the balance" via chat/site. Biggest wins → Hall of Fame.

### 3.9 Chat bot commands
Worker answers in Kick chat, with per-user and global cooldowns:

| Command | Reply |
|---|---|
| `!wager` | Your wager this leaderboard period (+ lifetime) — requires approved Roobet |
| `!rank` | Your leaderboard position and gap to the next place |
| `!watchtime` | Total watch time + streams attended |
| `!link` | Site URL to link accounts; also handles `!verify <code>` |
| `!join` | Enter the running giveaway (when one is open) |
| `!guess <amount>` | Guess the bonus hunt's final balance (until opening starts) |

### 3.10 Live status
- `livestream.status.updated` webhook → `stream_sessions` row → site-wide **LIVE** banner (realtime) + Discord announcement.
- Notifications: Discord webhook post on go-live; optional browser push for opted-in users.
- No stream schedule (dropped 2026-10-22). Offline state just shows "Offline" + Follow on Kick.

### 3.11 Public profiles & Hall of Fame
- `/u/[handle]`: avatar, badges, watch time, streams attended, leaderboard history, giveaway/raffle wins. User controls
  whether wager amounts are public (default: hidden, rank only).
- `/hall-of-fame`: past leaderboard winners per month, biggest multipliers (Roobet `highestMultiplier`), biggest hunt wins.

### 3.12 Compliance
- **18+ age gate** on first visit (stored in cookie; re-confirmed at login, recorded on the user).
- Footer + dedicated page: responsible-gambling links (BeGambleAware, GamCare, Gamblers Anonymous, 1-800-GAMBLER).
- **Terms of Service** + Privacy Policy; acceptance version recorded per user, re-prompt on change.
- **Geo notice**: edge middleware reads the country header and shows a banner where Roobet is unavailable
  (e.g. US, UK, …; list admin-editable). Informational only — the site itself stays accessible.

### 3.13 Abuse protection
- Record hashed IP + device fingerprint at login and on claims/entries (`user_fingerprints`).
- **Alt flags**: same IP hash / fingerprint across different Discord accounts → `abuse_flags` row, shown in admin; flagged
  users can be blocked from giveaways / raffles / milestones pending review.
- **Rate limits** (Redis): milestone claims, giveaway entries, Roobet username submissions, verify codes, bot commands.
- Discord account age minimum for giveaway eligibility (configurable).

### 3.14 Admin dashboard
Roles Owner / Admin / Mod. Users table (search, filters, CSV) with detail view: linked accounts, wager & watch-time charts,
attendance, badges, wins, claims, flags, notes. Queues: Roobet approvals, milestone payouts, abuse flags. Config screens
for leaderboards, badges, raffles, giveaways, hunts, geo list, ToS version. Analytics. **Audit log** for every action.

---

## 4. Data model (first pass)

```
users(id, discord_id*, discord_name, avatar, kick_user_id*, kick_username, role, age_confirmed_at,
      tos_version, wager_public, created_at)
roobet_links(user_id*, requested_username, roobet_uid*, status, reviewed_by, reviewed_at, reject_reason)
kick_verify_codes(code*, user_id, expires_at, used_at)

stream_sessions(id, kick_livestream_id, started_at, ended_at, title)
chat_activity(session_id, kick_user_id, ts)                 -- raw, prunable after rollup
watch_time(session_id, user_id, minutes, messages)          -- PK(session_id, user_id)

roobet_daily_wager(roobet_uid, day, wagered, weighted_wagered, highest_multiplier jsonb)  -- PK(roobet_uid, day)

badges(id, key, name, icon, rule jsonb, manual_only)
user_badges(user_id, badge_id, source, granted_at)

leaderboards(id, name, starts_at, ends_at, metric, min_wager, prizes jsonb, mask_names, status)
leaderboard_results(leaderboard_id, user_id, rank, wagered, prize)   -- written at freeze

milestones(id, threshold, metric, reward, active)
milestone_claims(id, user_id, milestone_id, status, claimed_at, paid_at, paid_by)  -- unique(user_id, milestone_id)

raffles(id, name, starts_at, ends_at, metric, usd_per_ticket, max_tickets, prizes jsonb, seed_hash, seed, status)
raffle_tickets(raffle_id, user_id, tickets)
raffle_winners(raffle_id, user_id, prize, position)

giveaways(id, title, prize, eligibility jsonb, entry_keyword, seed_hash, seed, status, overlay_token)
giveaway_entries(giveaway_id, user_id, source, created_at)            -- unique(giveaway_id, user_id)
giveaway_winners(giveaway_id, user_id, drawn_at)

hunts / hunt_bonuses / hunt_guesses / tournaments / tournament_matches   -- shaped once bonushunt.gg docs arrive

user_fingerprints(user_id, ip_hash, device_hash, first_seen, last_seen)
abuse_flags(id, user_id, related_user_id, reason, status, reviewed_by)
audit_log(id, actor_id, action, target_type, target_id, before jsonb, after jsonb, created_at)
settings(key*, value jsonb)                                          -- geo list, ToS version, cooldowns, etc.
```
`*` = unique.

---

## 5. Design (from Claude Design exports, 2026-10-22)

Sources: `SteezySpins Home.html` and `Casino Chip Background.html` (Claude Design bundles, saved in `SteezyWebsite/`).
They are self-unpacking bundles (React UMD + a `__bundler/manifest` of base64 resources), so they're a **reference**, not code to ship.

### 5.1 Visual system (Home)

| Token | Value | Notes |
|---|---|---|
| `--color-bg` | `#0d1310` | near-black green |
| `--color-surface` | `#161e19` | cards |
| `--color-text` | `#e9e9ed` | |
| `--color-accent` | `#4fd08a` | green; ramp `100 #effdf4` … `900 #143424` |
| `--color-section` / `-glow` | `#0f3a25` / `#16523a` | Roobet partner band (radial gradient) |
| Font | Inter (headings + body) | headings weight ~500, tight tracking (−.025 to −.035em) |
| Radius | 8px | |
| Shadows | 1px hairline `#26302a` + ambient black | dark-theme elevation |
| Icons | Phosphor (`ph ph-*`) | |
| Roobet wordmark | `#ffc61a`, bold italic | |

Components follow a small class kit: `.btn(-primary|-secondary|-ghost|-icon)`, `.card`, `.card-kicker`, `.tag(-accent|-neutral)`,
`.seg` (segmented control), `.table`, `.dialog`. Map these to Tailwind theme tokens + a few component classes.

Motion: `[data-reveal]` fade-up on scroll, pulsing live dot (`ssPulse`), hero parallax on mouse/scroll. All disabled under
`prefers-reduced-motion`.

### 5.2 Pages in the design → routes

| Design page | Route | Contents |
|---|---|---|
| Home | `/` | Fixed blurred header (logo dot, nav, LIVE/Offline tag, Roobet·STZY button, "Log in" with Discord icon); full-height hero ("Every spin, counted together.", live/offline tags with stream title + viewers, or "Offline" (no next-stream time — schedule dropped), Watch on Kick / Join Discord CTAs); **Roobet partner band** (big click-to-copy `STZY`, 3 steps, Open Roobet, 18+ note); **Biggest wins** (featured Kick clip + ranked list, sort by multiplier/payout, clip modal); **About / Meet Steezy** (bio, socials list, photo) |
| Leaderboard | `/leaderboard` | "$3,000 prize pool", countdown, paid places; 3-step podium (medal rings, prize); table rank/member/wagered/prize; "Roobet affiliate data · verified · updated N min ago"; link to previous winners |
| Milestones | `/milestones` | Sticky card: lifetime wager, next tier progress bar, Claim CTA; vertical rail of tiers with claim buttons |
| Giveaways | `/giveaways` | Cards: status tag, time left, prize, eligibility rule, entry count, Enter button |
| Hunts & tournaments | `/hunts` | Hunt card (start cost, bonuses opened, best multi, slot list, "Guess the final balance"); tournament card (round, matchups, View bracket) |
| Footer | all | Logo, social icon buttons, © · 18+, Privacy / Terms / Responsible gambling |

Placeholder data in the design worth keeping as defaults (admin-editable):
- Leaderboard prizes (top 10): $1,200 / 700 / 400 / 250 / 150 / 60 × 5 = $3,000.
- Milestone tiers (lifetime wager → reward): Newbie $1k→$5 · Beginner $5k→$10 · Rookie $10k→$25 · Hustler $25k→$50 ·
  Grinder $50k→$100 · High Roller $100k→$150 · Whale $250k→$400 · Legend $500k→$1,000.
- Giveaway rule example: "Discord account older than 7 days and a linked Kick account" — matches §3.7 eligibility filters.

Social handles in the design are placeholders (`discord.gg/steezespins`, etc.). Use the real invite
`https://discord.gg/PJpphDDS73`; other handles still needed from Steezy.

**Remaining pages** are designed on the canvas "SteezySpins — remaining pages"
(https://claude.ai/artifact/MfVUDUWrbNLp5oLJWabtFk), same tokens as Home:
`/me` profile, Kick/Roobet linking flow (interactive), public `/u/[handle]`, `/raffles`, `/hall-of-fame`, 18+ gate + geo
banner (interactive), `/terms` (ToS, privacy, responsible gambling, regions), admin overview + admin user detail, and OBS
overlays (giveaway/raffle draw in 3 phases; bonus hunt panel + leaderboard ticker). Legal copy there is a placeholder for review.

### 5.3 Background: Casino Chip animation (replaces the hero video)

The Home design's hero uses a **14 MB looping MP4** behind a left/bottom gradient scrim. Replace it with the chip scene:

- **three.js WebGL scene**: poker chips fall top→bottom while tumbling, in 3 depth layers
  (far ~26 chips blurred, mid ~13 sharp with soft shadows, near 0–4 large blurred) → depth-of-field look.
- Two chip skins alternating: **Roobet** (navy `#1a1939` + gold `#eeaf0e`, logo mask from `roobet-logo.png`) and
  **STZY** (Green: `#0f5e40` + paper `#f3f2f2`, or Red variant). Faces/edges are drawn to canvas textures at runtime.
- Clearcoat physical materials + a generated studio environment for reflections; ACES tone-map, vignette, dither.
- Deterministic 40-second seamless loop (seeded RNG); chip count scales with aspect ratio.
- Props: `speed` (0.25–2.5×), `density` (0.4–1.8×), `foregroundChips` (0–4), `stzyColor` (Green|Red), `depthOfField`,
  `ground` (Ink|Paper), `scrim` (0–0.8). Respects `prefers-reduced-motion` (frozen frame).

Implementation plan:
- Port to a client component `<ChipBackground />` (`three` from npm, dynamic-imported with `ssr:false`, so the ~1.2 MB
  of three.js stays off the critical path). Static gradient poster shows until the first frame.
- **Re-tint the ground to the site palette**: the design's "Ink" ground is warm grey (`#2d2b2b → #201e1d`) and the site bg
  is green-black `#0d1310`; use `#16201a → #0d1310` so the hero blends into the page. Default `stzyColor: Green`.
- Chip label font is Archivo 800 (design's own kit); load just that weight for the canvas textures, or switch to Inter.
- Performance: cap DPR at 1.5 (1.0 on mobile), lower density on narrow screens, pause the RAF loop when the hero
  is off-screen (IntersectionObserver) or the tab is hidden, dispose on unmount. Fallback to the static gradient if
  WebGL is unavailable.
- Scope: hero section only by default (keeps the rest of the page cheap); the same component can be reused as a fixed
  full-page backdrop or as an OBS overlay background if Steezy wants it.
- Keep the existing hero scrim gradients for text contrast; set chip `scrim` ≈ 0.3.

---

## 6. Secrets / config

See `.env.example`. Real values live in `Steezy/.env` (gitignored by the repo-root `.gitignore`).

## 7. Open questions

1. bonushunt.gg API docs.
2. Reuse `FTDWEBSITE/` code or start fresh with the same stack?
3. Hosting: Vercel + Railway/Fly worker + managed Postgres/Redis OK?
4. Chip background: hero only (recommended) or fixed behind the whole site? Green or Red STZY chips?
5. Watch-time constants (10-min gap / 5-min flat) and badge thresholds — streamer's call.
6. Leaderboard metric: raw `wagered` or `weightedWagered`? (Design copy says "by total wager" → raw.)
7. Real social handles (Kick, YouTube, Instagram, Telegram, X, TikTok) and a photo of Steezy for the About section.
