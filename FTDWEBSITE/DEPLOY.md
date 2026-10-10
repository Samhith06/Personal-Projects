# Deploying FGDR to Railway

This is the staging setup used to demo the site to the crew before launch. It runs
as a single always-on Node server with the SQLite database on a Railway volume,
which is what the Kick chat watcher and the 5-minute leaderboard sync both need.

## 1. Create the service

1. Railway → **New Project** → **Deploy from GitHub repo** → `Samhith06/FGDRwebsite`.
2. Railway reads `railway.json`, so the build, pre-deploy and start commands are
   already set. Let the first deploy fail if it does — it needs the variables below.

## 2. Add the volume

The database is a file, so it needs somewhere that survives a redeploy.

1. Service → **Variables / Settings** → **Volumes** → **Add volume**.
2. Mount path: `/data`.

Without this, every deploy starts from a blank database.

## 3. Set the variables

Service → **Variables** → **Raw editor**, then paste:

```
DATABASE_URL=file:/data/fgdr.db
AUTH_SECRET=<paste the generated value>
APP_URL=https://<your-service>.up.railway.app
LEADERBOARD_SHEET_URL=https://docs.google.com/spreadsheets/d/1TDXgkq5FzXJ5wWppVyDvzkSk-izrpTwWpVk1NDuNKL4/export?format=csv
LEADERBOARD_CAMPAIGN_CODE=FGDR
STAKE_COM_API_KEY=<the Stake.com affiliate API key, aff_…>
STAKE_EU_API_KEY=<the Stake.eu affiliate API key, aff_…>
LEADERBOARD_SYNC_INTERVAL_MS=300000
KICK_CHAT_WATCHER=1
DISCORD_CLIENT_ID=<the Discord application's client id>
DISCORD_CLIENT_SECRET=<paste from the Discord developer portal>
KICK_CLIENT_ID=<the Kick app's client id>
KICK_CLIENT_SECRET=<paste from kick.com/settings/developer>
ADMIN_DISCORD_IDS=<copy the line from your local .env>
CREATOR_DISCORD_IDS=<copy the line from your local .env>
```

The two `*_DISCORD_IDS` lines are already filled in locally in `.env`. They are
not secrets, but they are the crew's personal Discord IDs, so they are kept out
of git — copy them straight across rather than retyping them. The slug after
each colon has to match the channel's URL slug exactly
(`fatguysdontrun`, `insanetigers7`, `daddykonggaming`, `stillmakinggains`,
`dallasghost`); a typo silently leaves that person as an ordinary member.

Both redirect URIs have to be registered against the real `APP_URL`:
`${APP_URL}/api/auth/discord/callback` and `${APP_URL}/api/auth/kick/callback`.

Generate `AUTH_SECRET` locally:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

`APP_URL` is the site's own address, and everything that has to name it reads
from there: the sign-in redirects, `metadataBase` for Open Graph and canonical
URLs, `robots.txt` and the sitemap. It is also the only place they read it from
— a redirect built from the incoming request would say `localhost:8080`, because
that is the container's own host behind the proxy. So `APP_URL` has to be the
real public domain, or sign-in sends people somewhere that does not load.

### The custom domain

The site is served from **https://www.fatguysdontrun.com**. The domain is
registered with IONOS, whose DNS has no `ALIAS`/`ANAME` record and so cannot
point the bare domain at Railway — hence `www` as the canonical address, with
the apex forwarded to it from IONOS.

| Where | Record | Value |
| --- | --- | --- |
| IONOS DNS | `CNAME` on `www` | the target Railway shows for the custom domain |
| IONOS DNS | `TXT` on `_railway-verify.www` | Railway's `railway-verify=…` string |
| IONOS domain | forwarding on the apex | 301 to `https://www.fatguysdontrun.com` |

To move to a different domain later, do it in this order or sign-in breaks in
between:

1. Add the domain in Railway (**Settings → Networking → Custom Domain**) and
   create the DNS records it asks for.
2. Wait for the certificate. Until it is issued, HTTPS fails the handshake with
   a name-mismatch error — that is normal, not a misconfiguration.
3. Register the new callbacks in the Discord and Kick developer portals,
   *keeping the old ones*, so both work during the switch.
4. Only then change `APP_URL`. Setting it triggers a rebuild, which is what
   moves `robots.txt` and the sitemap across with it.

### Sign-in

There is no preview or bypass login. `/login` goes to Discord and nowhere else,
so `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` have to be set before anyone —
including the crew — can reach the member area or `/admin`. If an old
`ALLOW_DEV_LOGIN` variable is still on the service, delete it; it no longer does
anything.

## 4. First deploy

`npm run db:deploy` runs automatically before each release. It pushes the schema
and seeds the sample content **only if the database is empty**, so admin edits made
during the demo survive later deploys.

Watch the deploy logs for:

```
FGDR seed complete: { ... }
[leaderboard] synced 13 entries
```

## 5. Check it

- `/` — homepage
- `/leaderboard` — Stake.com and Stake.eu tabs, each with its own standings and prizes
- `GET /api/leaderboard/sync` — when each board was last pulled, and any error Stake returned
- `/login` — the Discord button, which should reach Discord's consent screen

## The leaderboard sync

There are two boards, Stake.com and Stake.eu: separate races with separate
prizes. Each is pulled from its site's affiliate API (`STAKE_COM_API_KEY`,
`STAKE_EU_API_KEY`) on boot and every `LEADERBOARD_SYNC_INTERVAL_MS` (5 minutes
by default). Ranks are recomputed from the wagered amount, the board's own prize
ladder is applied, and that board's rows are replaced. While `STAKE_COM_API_KEY`
is empty, the Stake.com board keeps coming from `LEADERBOARD_SHEET_URL`.

Stake does not publish the affiliate API's endpoint or response format, so the
URLs are configurable (`STAKE_COM_API_URL`, `STAKE_EU_API_URL`) and the response
is read loosely: the first list of objects, with `user_name`/`username` and
`wagered`. If a board does not fill, `GET /api/leaderboard/sync` and the admin
leaderboard page show the status code and the start of what Stake replied.

- Handles are masked to `thor****` before they are stored — full affiliate
  usernames never reach a public row.
- Members who saved their Stake username get their row linked automatically, so
  "Your rank" works without anyone matching rows by hand.
- A failed pull leaves the previous standings in place; it never blanks the board.
- `POST /api/leaderboard/sync` forces a refresh. Set `LEADERBOARD_SYNC_TOKEN` to
  require `Authorization: Bearer <token>` on that route.

Prizes are set per board in the admin panel ("Prizes by place"). A new board
starts on this ladder:

| Place | Prize | Place | Prize |
| --- | --- | --- | --- |
| 1st | $600 | 6th | $75 |
| 2nd | $250 | 7th | $65 |
| 3rd | $170 | 8th | $55 |
| 4th | $120 | 9th | $45 |
| 5th | $90 | 10th | $30 |

## Backups

Everything the crew enters lives in one SQLite file on the mounted volume —
profiles, the giveaway log, bonus hunts, and the uploaded images, which are
stored as blobs in the same file. Nothing about it is in git.

**A master admin downloads a copy from `/admin`** ("Backup" panel), or directly
from `/api/admin/backup`. It is a `VACUUM INTO` snapshot rather than a copy of
the live file: copying a SQLite database byte-for-byte while it is being written
to produces a file that looks fine and fails to open later.

Keep the copy somewhere that is not this server. A volume lives and dies with
its project, so a backup that stays on Railway protects against a disk fault and
nothing else — which is the failure that matters least. The one that has already
happened here was losing access to the project itself.

Railway's own **Backups** tab on the service adds volume snapshots on top of
this. Worth turning on; it is not a substitute, for the same reason.

Restoring is a file copy: put the `.db` back at the volume's mount path as
`fgdr.db` and restart the service.

## Notes

- **Keep it to one replica.** `numReplicas` is 1 in `railway.json`; the sync timer
  and the Kick chat watcher both assume a single process.
- **`KICK_CHAT_WATCHER=1`** keeps the public chat reader on. It is what hears
  chat codes and the bonus hunt's `!sr` and `!guess` commands, and it only
  connects while something needs it (a pending code, or a hunt collecting or
  taking guesses). Setting it to `0` leaves chat to Kick's signed webhook,
  which then has to be subscribed for every creator's channel.
- **Before launch:** remove `ALLOW_DEV_LOGIN` once the Discord and Kick secrets
  are in place — while it is on, anyone can sign in as a master admin. See the
  "Before launch" list in `README.md`.
