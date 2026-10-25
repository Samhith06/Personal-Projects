# SteezySpins

Community site for Kick streamer Steezy. Next.js 16 (App Router), React 19, Drizzle ORM on Postgres, hand-written CSS.
Design and decisions: [ARCHITECTURE.md](ARCHITECTURE.md). Patterns (sessions, OAuth, Kick webhook, boot-time sync) come from `../FTDWEBSITE`.

## Quick start

```bash
npm install
cp .env.example .env      # fill in AUTH_SECRET, Discord, Roobet
npm run db:up             # local Postgres in Docker (needs Docker Desktop running)
npm run db:migrate        # applies drizzle/*.sql
npm run db:seed           # milestone tiers, badges, this month's $3,000 board (only fills empty tables)
npm run roobet:sync -- 2026-01-01   # optional: backfill daily wagers since a date
npm run dev               # http://localhost:3000
```

After changing `src/server/db/schema.ts`: `npm run db:generate` (writes a new SQL migration), then `npm run db:migrate`.

## What works so far

| Area | Status |
| --- | --- |
| Discord login (`identify` only), signed session cookie, 18+ gate after each login | done |
| Roles from env: `OWNER_DISCORD_IDS`, `ADMIN_DISCORD_IDS`, `MOD_DISCORD_IDS` | done |
| Kick linking: Kick OAuth (PKCE) or `!verify CODE` in chat via the signed webhook `/api/webhooks/kick` | done |
| Roobet username submit / resubmit → admin approval (checked against STZY data, locks to Roobet uid) | done |
| Roobet affiliate sync → `roobet_daily_wager`, every 10 min + `npm run roobet:sync` backfill | done |
| Hashed-IP alt detection → `abuse_flags` | done |
| Pages: home (hero + Roobet partner band), `/login`, `/me`, `/me/link`, `/terms` | done |
| `/leaderboard`: podium, standings, your rank, name masking, auto-freeze at period end | done |
| `/milestones`: lifetime progress, one-time claims | done |
| `/admin`: overview, Roobet approvals (owner unlock), payouts, leaderboard + milestone editors, audit log | done |
| Stream sessions from Kick `livestream.status.updated`, LIVE tag in header, optional Discord go-live post | done |
| Chat-based watch time with anti-farm rules (`src/lib/watchtime.ts`), back-filled when a member links Kick later | done |
| Chat bot: `!wager`, `!rank`, `!watchtime`, `!link` with cooldowns; replies via a bot account connected in `/admin` | done |
| Provably fair draws (`src/lib/fair.ts`): seed fingerprint published on open, seed revealed on draw, `/fair` re-runs any draw | done |
| `/raffles`: tickets from wagers ($ per ticket, cap), your tickets + odds, auto-close at end date, draw on stream | done |
| `/giveaways`: site Enter button or chat `!join`, eligibility rules, auto-close, multi-winner draws | done |
| OBS overlay `/overlay/{giveaway,raffle}/<token>` (add `?preview=1` to see it in a browser): entries panel → name reel → winner card | done |
| Home hero: animated 3D casino-chip background (three.js, `src/components/home/`), lazy-loaded, pauses off-screen, still frame for reduced motion | done |
| `/hall-of-fame`: monthly champions, mega wins and the 500×–2,000× clubs, community records | done |
| `/u/<kick or discord name>` public profiles: badges, stats, finishes, biggest hit, trophies; privacy toggles on `/me` | done |
| `/hunts`: bonus hunts mirrored from bonushunt.gg every 30 s (`GET /api/public/hunts`, Bearer key) | done |
| Guess the balance: `!guess 4200` or on the site; locks when the opening starts; closest guess wins on completion | done |
| Slot tournaments (not in the bonushunt.gg API): admin-run single-elimination brackets with byes | done |
| OBS hunt overlay `/overlay/hunt/<token>`: one source that switches by phase — collecting (guessing open / locked), opening (closest guess right now), finished (results card) | done |
| Hunts in the site nav only while a hunt or tournament is live; hunt + tournament controls on the admin overview | done |
| Mobile: every page checked at 360px (no sideways overflow); header, admin menu, milestones and hunts tuned for phones (`src/styles/mobile.css`) | done |
| Home: top-3 podium, About section (needs Steezy's photo + social handles) | done |
| Leaderboard names always masked: first four letters + `****` | done |
| Biggest wins (Kick clips), admin users & abuse review | next |
| Admin users/abuse review, OBS overlays, chip background | next |
| Bonus hunts / tournaments | waiting on bonushunt.gg API docs |

## Credentials

| Variable | Notes |
| --- | --- |
| `AUTH_SECRET` | Required in production. |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | Redirect URI `${APP_URL}/api/auth/discord/callback`. |
| `KICK_CLIENT_ID` / `KICK_CLIENT_SECRET` | Redirect URIs `${APP_URL}/api/auth/kick/callback` and `${APP_URL}/api/auth/kick/bot/callback`. Set the app's webhook URL to `${APP_URL}/api/webhooks/kick`, then run `npm run kick:subscribe`. |
| `KICK_CHANNEL_SLUG` | Steezy's channel. Webhook events from other channels are ignored. |
| `DISCORD_LIVE_WEBHOOK_URL` | Optional: posts "Steezy is live" to a Discord channel when a stream starts. |

## Kick setup (once)

1. In Kick's developer settings, create the app with both redirect URIs above, enable webhooks, and set the webhook URL.
2. `npm run kick:subscribe` — subscribes Steezy's channel to `chat.message.sent` and `livestream.status.updated`.
3. As an owner, open `/admin` → **Connect bot account** and sign in with the Kick account the bot should reply as
   (Steezy's own or a dedicated bot account). It asks for `chat:write`; tokens are stored in the `settings` table and refreshed automatically.

Watch time only counts while a stream session is open, so step 2 has to be done before the first stream.
| `ROOBET_USER_ID` / `ROOBET_API_KEY` | Affiliate stats API. Never commit — `.env` is gitignored. |
| `DATABASE_URL` | Postgres connection string. |
