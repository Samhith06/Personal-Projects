# FGDR — FatGuysDontRun

The website and community platform for FGDR: five Kick creators, one crew.

Built with Next.js 16 (App Router), React 19, Drizzle ORM on libSQL/SQLite, and hand-written CSS.

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill in AUTH_SECRET at minimum
cp .env.local .env           # drizzle-kit and the seed script read .env
npm run db:setup             # creates the tables and loads sample content
npm run dev                  # http://localhost:3000
```

Deploying the staging site for the crew to look at: see [DEPLOY.md](DEPLOY.md).

`/login` is Discord only. There is no preview or bypass sign-in — the site is live, so the only way in is a real Discord account, and the role that account gets comes from `ADMIN_DISCORD_IDS` / `CREATOR_DISCORD_IDS`.

## Brand assets

| File | Purpose |
| --- | --- |
| `public/brand/fgdr-logo.png` | **The official FGDR logo. Add this file.** Until it exists, a matching placeholder crest is drawn. The logo is shown as-is and never recoloured or cropped. A square PNG with a transparent background, at least 512×512, works best. |
| `public/brand/hero2-poster.jpg`, `hero2-poster-960.jpg` | First frame of the hero video. Shown immediately, and on its own for reduced-motion and data-saver users. |
| `public/media/hero2-1920.mp4`, `hero2-960.mp4` | Compressed copies of the hero video (1.3 MB for desktop, 0.2 MB for phones). The CloudFront URL saved in the admin panel is the fallback. The previous video's files (`hero-*`) are still there if you want to switch back. |

## Credentials

| Variable | What it turns on |
| --- | --- |
| `AUTH_SECRET` | Signs the session cookie. **Required in production.** |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | Real Discord login. Redirect URI: `${APP_URL}/api/auth/discord/callback`. The only scope requested is `identify`. |
| `KICK_CLIENT_ID` / `KICK_CLIENT_SECRET` | Verified Kick account linking (OAuth 2.1 with PKCE) and real live status. Redirect URI: `${APP_URL}/api/auth/kick/callback`. |
| `ADMIN_DISCORD_IDS` | Master admins. `discordId` or `discordId:streamerSlug` to tie them to their own channel. |
| `CREATOR_DISCORD_IDS` | Creators, always `discordId:streamerSlug`. They manage that channel only. |
| `DATABASE_URL` / `DATABASE_AUTH_TOKEN` | `file:./fgdr.db` locally. In production, a hosted libSQL (Turso) URL and token. |
| `STAKE_COM_API_KEY` / `STAKE_EU_API_KEY` | Stake affiliate API keys. Each feeds its own leaderboard, pulled every 5 minutes. |
| `LEADERBOARD_SHEET_URL` | Optional fallback for the Stake.com board while it has no API key. |

Live status works without Kick credentials: the server reads Kick's public channel data. Credentials switch it to Kick's official API and enable one-click Kick account linking. The admin dashboard lists which integrations are connected.

## The wager leaderboards

There are two boards, Stake.com and Stake.eu: separate races with separate
prizes. Each is pulled from its site's affiliate API (`STAKE_COM_API_KEY`,
`STAKE_EU_API_KEY`) on boot and every five minutes after that.

- Ranks are recomputed from the wagered column, so the position and the amount
  next to it can never disagree with each other.
- Handles are masked to `thor****` before they are stored — a full affiliate
  username never reaches a public row.
- Members who saved their Stake username get their row linked automatically, so
  "Your rank" works without anyone matching rows by hand.
- A failed pull leaves the previous standings alone; it never blanks the board.
- The window is the calendar month unless an admin sets one. Each board's prize
  ladder is edited in the admin panel; a new board starts on $600 / $250 / $170 /
  $120 / $90 / $75 / $65 / $55 / $45 / $30 ($1,500).
- A member's VIP progress is their wager across both boards.

`POST /api/leaderboard/sync` forces a refresh; `GET` reports when the last one
ran. Both live in `src/server/services/leaderboard-sync.ts`.

## The admin panel (`/admin`)

A separate control room with its own sidebar. Two levels of access, both set by Discord ID in the config — nobody can promote themselves in the panel.

**Master admins** (`ADMIN_DISCORD_IDS`) — FatGuysDontRun, Insane Tigers 7 and DaddyKong Gaming:

- Everything below, for every channel.
- **Homepage:** hero text and video, featured clips / wins / raffle / challenge / announcement, community links.
- **Leaderboard:** settings, prizes and standings for the Stake.com and Stake.eu boards.
- **VIP rewards, Announcements, Members:** the monthly wager tiers, community news, and the member list (search, see Kick/Stake details, unlink Kick).
- **Giveaways:** every payout the crew has made, plus the starting total behind the headline figure on `/giveaways`.
- **Creator profiles:** add a channel, edit any profile, upload its images, or hide a channel from the site.
- **Community:** the statistics counters and the activity feed.

**Creators** (`CREATOR_DISCORD_IDS`) — Still Making Gains and Dallas Ghost, for their own channel only:

- **Profile:** display name, Kick handle, headline, quote, bio, specialty, images (uploaded or linked) and social links.
- **Clips, Wall of Fame, Raffles, Challenges, Giveaways** they host. Everything they add goes live immediately.
- **Bonus hunts:** set up and start a hunt (title, channel, start balance), then run it on its own page: confirm `!sr` slot calls and add bonuses while collecting, open guess the balance for `!guess`es, then open the bonuses one by one. **History** lists every finished hunt, with the totals across all of them (profit or loss, average multiplier, best bonus, how each bonus type and game has paid).

Notes:

- **Permissions are enforced on the server.** Every action re-checks the role and the channel that owns the row, so a hidden button is never the only protection.
- **Times** are entered and shown in the admin's own timezone and stored as exact timestamps; visitors see them in theirs.
- **Clip links** from YouTube and Instagram are converted automatically so they play on the site.
- **Drawing a raffle winner** picks at random from entrants with a verified Kick account, closes the raffle and posts the winner to the community feed.

## Linking Kick accounts

Members have two ways to link Kick. Both produce a **verified** link, and raffle entries require one.

1. **Log in with Kick** (the main button). This uses Kick's own login and approval screen and needs `KICK_CLIENT_ID` / `KICK_CLIENT_SECRET`.
2. **Chat code** (the alternative). The member types their Kick username and gets a one-time code such as `FGDR-QMSWP`, valid for 10 minutes. They post it in any FGDR creator's Kick chat and the account page updates on its own.
   - **Who can use a code:** only a message sent from the Kick username the member entered. A code posted by anyone else is ignored, so a code copied off a stream does nothing.
   - **Identity:** the Kick user ID and username come from the chat message itself, as sent by Kick. Codes are single-use, and each member can request 5 per hour.
   - **How codes are detected:** there are two routes, and both use the same handler (`src/server/kick/chat-verification.ts`).
     - **Without credentials** (`src/server/kick/chat-watcher.ts`): the server reads Kick's public chat feed, the same one kick.com's chat uses. It only connects while a code is waiting, and it reconnects on restart. It is undocumented and needs a server that runs all the time, so it doesn't suit serverless hosting.
     - **Official webhooks** (`/api/webhooks/kick`): subscribe each creator's channel to the `chat.message.sent` event with that URL. Kick signs every delivery and the route checks the signature before trusting it. Set `KICK_CHAT_WATCHER=0` to turn the public-feed watcher off.

## Bonus hunts and Kick chat

A hunt moves through its steps one button at a time on its admin page:

**Setup → Start → Collecting → Guess the balance → Opening → Finished**, and the closest guess wins.

1. **Setup and start.** Give the hunt a title, a channel and a start balance. A channel runs one hunt at a time.
2. **Collecting.** Viewers in that creator's Kick chat type `!sr Sugar Rush 1000` to call a slot.
   - **One call per viewer per hunt.** Calling again while the first call is still waiting replaces it, which fixes typos. Once the streamer has ruled on a call, later calls from that viewer are ignored.
   - **Nothing reaches the public board on its own.** Calls wait in a queue on the hunt's page, which refreshes by itself. For each call the streamer picks **Got a bonus**, then enters the bet and the type (Normal, Super or Hidden), or picks **No bonus**. A confirmed bonus is added to the end of the hunt, and the board shows who called it.
3. **Guess the balance.** **Open guess the balance** closes slot calls. Viewers type `!guess 1250` (`!guess $1,250.50` and `!guess 1.2k` also work) for what the bonuses will pay back in total. Guessing again replaces the guess.
4. **Opening.** **Close guessing and start opening** locks every guess in. Record each payout in turn.
5. **Finished.** When the last bonus is opened, the guess closest to the final balance wins. A tie goes to whoever guessed first. The winner shows on the hunt page, the public board, the overlays, the community feed and in History.

Chat is read by the same two routes as chat codes (`src/server/kick/hunt-chat.ts`). The public-feed watcher also runs while any hunt is collecting or taking guesses, so it needs a server that stays up.

## Bonus hunt stream overlays

Each creator has OBS browser-source overlays at `/overlay/bonus-hunt/<channel>`. The admin bonus hunt page lists the links with copy buttons.

| Link | Shows | Suggested source size |
| --- | --- | --- |
| `/overlay/bonus-hunt/<channel>` | The full board: figures, progress and a window of bonuses around the one being opened. `&rows=12` shows more. | 420 × 720 |
| `?view=bar` | One line of figures and the bonus being opened. | 1280 × 110 |
| `?view=current` | The bonus being opened, the average and what's needed, and the last result. | 480 × 280 |

They have transparent backgrounds and update every 5 seconds. They follow whichever hunt the channel is running. A finished hunt stays on screen for an hour, and nothing is shown between hunts, so the source can stay in the scene.

## How it's organised

```
src/
  app/                  routes: /, /live, /streamers/[slug], /clips, /wall-of-fame,
                        /leaderboard, /raffles, /challenges, /rewards, /giveaways,
                        /community, /login, /dashboard, /account, /admin, /legal/[slug], api/*
  components/
    brand/              Logo (official asset) + fallback Crest
    layout/             SiteHeader (sticky + mobile drawer + user menu), SiteFooter
    live/               LiveProvider (polls /api/live), StreamerLiveCard, LiveHub, LiveStatusBadge
    media/              MediaPlayer (shared mini-player for clips and Wall of Fame), cards, MediaArt
    competition/        Podium, LeaderboardTable, ChallengeCard, RaffleCard, VipLadder
    giveaways/          GiveawayTotal (the headline figure), WinnerSlider
    member/ admin/ forms/ ui/
  server/
    db/                 schema.ts (every table), seed.ts, client
    auth/               session (signed httpOnly cookie), discord, kick, oauth helpers
    services/           content.ts (all reads), live.ts (Kick/simulated live status with caching)
    actions/            member.ts (Stake username, Kick link, raffle entry, join challenge),
                        staff.ts (all admin editing), admin.ts (homepage curation), age.ts
    kick/               chat-verification.ts (one-time codes), chat-watcher.ts (live chat feed)
  styles/               tokens, base, components, layout, media, home, pages, admin
```

- **Pages never query the database directly.** Everything goes through `server/services/content.ts`.
- **The homepage only shows curated content.** Featured clips, Wall of Fame entries, the raffle, the challenge and the announcement all come from `site_settings`, which admins edit at `/admin`. Nothing is added to the homepage automatically.
- **Live status stays on the server.** Kick is only called from `server/services/live.ts`. Results are cached for 45 seconds, and one request is shared by everyone waiting on it. The browser polls `/api/live`, which a CDN can cache, and pauses polling while the tab is hidden.
- **OAuth.** The `state` value and PKCE verifier live in short-lived httpOnly cookies. Discord and Kick tokens are used once, during the callback, and then thrown away. Only the Discord ID, username and avatar are stored.
- **Stake usernames stay private.** They are only shown, masked, to their owner and are never rendered on a public page.

## Before launch

- Add `public/brand/fgdr-logo.png`.
- Each creator adds their own socials at `/admin/profile` once they have signed in with Discord. The site-wide links in `site_settings` still need a master admin.
- Swap the sample clips, wins, leaderboard and raffles for real data. The seed file shows the expected shapes.
- Get the legal pages in `src/app/legal/[slug]/page.tsx` reviewed for your jurisdictions.
- Hook your wager data source up to `leaderboard_entries` and `member_progress`.
