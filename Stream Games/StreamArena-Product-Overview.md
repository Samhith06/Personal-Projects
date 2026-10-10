# StreamArena — Product Overview

*What we're building, who it's for, and how it works.*

Companion document to `StreamArena-Architecture.md`. That one is for building it. This one is for explaining it — to a collaborator, a streamer you're pitching, or yourself in three months.

---

## 1. In one paragraph

StreamArena is a web platform that lets gambling streamers run interactive games with their Kick chat. A streamer signs in with their Kick account, picks a game from a catalog, drops an overlay link into OBS, and starts. Their viewers then play along by typing commands in chat — suggesting slots, entering giveaways, voting on matchups, making predictions. Everything appears live on stream through the overlay. The streamer never installs software, writes a config file, or runs a bot on their own machine.

---

## 2. The problem

Gambling streamers already run these games. They just run them badly, by hand.

A typical bonus hunt today: the streamer opens Notepad or a spreadsheet, screen-caps it into a corner of the layout, and manually types every slot a viewer shouts out. They lose entries when chat moves fast. They miscount. They forget the starting balance. Halfway through a four-hour hunt the list is a mess of typos and duplicates. Meanwhile viewers can't tell whether their suggestion was picked up, so they spam it again, which makes it worse.

The tooling that does exist is mostly Twitch-first, requires local software like Streamer.bot, or is a bot with no visual layer. Kick's gambling community is large, growing, and under-served — and Kick shipped a proper public API with chat webhooks, which makes a clean web-based product genuinely possible.

**StreamArena's bet:** streamers want these games to run themselves, look good on stream, and require zero setup beyond a browser source.

---

## 3. Who it's for

**Primary — the streamer.** Gambling/slots streamers on Kick, from mid-size upward. They care about: setup time near zero, an overlay that matches their layout, not having to babysit the game while they're playing, and chat engagement that keeps viewers watching.

**Secondary — the viewer.** They never visit the website. Their entire experience is typing in chat and seeing something happen on screen. That constraint shapes a lot of the design: if a viewer has to leave the stream to participate, the feature has failed.

**Later — moderators.** Mods need to fix things mid-game: remove a troll entry, correct a misread slot name, close entries early. Give them commands, not a login.

---

## 4. How it works — the streamer's journey

**1. Sign in.** Click "Login with Kick." Standard OAuth consent screen listing the permissions StreamArena needs — read chat events, send chat messages, read channel info. One click, back on the site, done.

**2. Pick a game.** The dashboard shows a catalog of available games. Pick one — say Bonus Hunt.

**3. Configure it.** A short form specific to that game. For a bonus hunt: starting balance, target number of bonuses, whether viewers or only the streamer can add slots, entry limit per viewer, whether entries require a follow or sub. Also the chat keyword (`!sr` by default, changeable to anything) and how chatty the bot should be.

**4. Add the overlay.** Copy a URL, paste it into OBS as a Browser Source. One time only — the same URL works for every future session. Position and size it once and forget it.

**5. Start.** Hit Start. StreamArena begins listening to chat. The overlay goes live.

**6. Play.** The streamer plays slots. Viewers fill the hunt list from chat. The overlay updates in real time. The streamer touches nothing.

**7. End.** Hit End, or let the game close itself when its condition is met. Results are saved to their history — every past hunt, with full detail.

---

## 5. How it works — the viewer's journey

The viewer sees the streamer's overlay and types in chat.

```
viewer:     !sr gates
overlay:    "Gates of Olympus" appears in the hunt list  ← instant feedback
```

That's the whole interaction. No signup, no link, no site visit.

When something goes wrong, and only then, the bot speaks:

```
viewer:     !sr gatez
bot:        ↳ @viewer couldn't find "gatez" — did you mean Gates of Olympus?

viewer:     !sr gates          (already requested)
bot:        ↳ @viewer you've already added a slot to this hunt.
```

Note the `↳` — those are native Kick replies threaded to the viewer's own message, not loose `@mentions`. And they only fire for problems. Successful entries stay silent in chat because the overlay already confirmed them visually. This keeps the bot from drowning the conversation.

The streamer controls this. Four settings: **off**, **errors only** (default), **batched summaries**, or **every request**.

---

## 6. Worked example — Bonus Hunt

The first game, and the reference implementation for everything after it.

**What a bonus hunt is:** the streamer sets aside a balance, plays slots until they've collected a target number of bonus rounds, then opens all the bonuses back to back to see whether the total payout beats what they spent. It's the single most popular format in slots streaming.

**What StreamArena does with it:**

| Phase | What happens |
|---|---|
| **Setup** | Streamer sets starting balance (e.g. €5,000) and target (e.g. 30 bonuses) |
| **Collection** | Viewers type `!sr <slot>`. Each resolves to a real slot — name, provider, thumbnail — and appears on the overlay. Streamer plays them and records each bonus as it lands. |
| **Break-even** | Overlay continuously shows the required average win per bonus to break even. This number is the emotional core of a hunt and it should be big and impossible to miss. |
| **Opening** | Streamer opens bonuses one at a time. Each result is entered; the overlay updates the running total, best win so far, and remaining bonuses. |
| **Result** | Final tally — total spent, total won, profit or loss, best and worst slot. Saved to history. |

**Guards that run automatically:** one entry per viewer (configurable), cooldown between requests, duplicate detection, optional follower/subscriber gating, and a mod command to remove a bad entry.

**Where it can feel broken:** slot name matching. `!sr gates`, `!sr gates of olympus`, `!sr GOO`, `!sr gatez` should all land on the same slot. Getting this right is a whole workstream of its own — an alias table, fuzzy matching, and a "did you mean" fallback. It's tracked separately and it's the difference between the product feeling magic or feeling stupid.

---

## 7. The game catalog

Bonus hunt is one game. The platform is designed so that games are plugins — adding one doesn't touch any shared code. Candidates, roughly in order of how naturally they fit:

**Slot Battles** — two or more slots go head to head over a fixed number of spins; viewers vote on matchups or nominate contenders. Bracket format for tournaments.

**Giveaways & Raffles** — keyword entry, optional follower/sub gating, weighted draws (subs get more entries), animated winner reveal on the overlay.

**Predictions** — viewers guess an outcome before it resolves: final balance, max win multiplier, whether the hunt profits. Closest guess or correct side wins. Leaderboard across sessions.

**Guess the Multiplier** — before a bonus opens, chat submits guesses. Closest wins. Fast, repeatable, works dozens of times per stream.

**Slot Roulette / Wheel** — viewers submit slots to a pool; a wheel spins to pick the next one to play. Pure spectacle, very overlay-driven.

**Community Goals** — chat collectively works toward something (X follows, Y gifted subs) that unlocks a bigger bet or a bonus buy.

**Leaderboards & Points** — a meta layer across games. Viewers earn points for participating and winning, spend them on entries elsewhere. This is what turns one-off games into a reason to come back. *(No real-money value — see §10.)*

Each of these reuses the same chat pipeline, the same overlay transport, the same guard system, the same dashboard. That's the point of the architecture.

---

## 8. What we're building — surface by surface

**The dashboard** *(streamer-facing web app)*
Login, game catalog, per-game settings, session controls (start / pause / end), live session view mirroring the overlay, history and past results, overlay URL management, ack and keyword settings.

**The overlay** *(OBS browser source)*
Per-game visual layer. Transparent background, themeable, resilient — it reconnects on its own and resyncs state, because OBS browser sources drop constantly and a stale overlay on stream is the worst possible failure.

**The chat bot** *(no UI)*
Posts only when useful. Threaded replies. Batched and throttled so it never floods.

**The backend** *(no UI)*
Kick OAuth, webhook ingestion, command parsing, game logic, state persistence, overlay broadcasting. Covered in the architecture doc.

**The slot catalog** *(mostly no UI)*
Searchable database of slots with names, providers, thumbnails, and aliases. Powers matching. Gets an admin UI eventually for curating aliases.

---

## 9. Scope — launch vs later

**Launch (v1)**
- Kick login
- Bonus hunt, complete
- Overlay with one clean default theme
- Chat commands with configurable keywords
- Ack settings
- Mod commands for corrections
- Session history
- Slot catalog with exact and near-exact matching

**Shortly after**
- Game #2 (proves the plugin model)
- Fuzzy slot matching with learned aliases
- Overlay theming and layout options
- Sub/follower gating

**Later**
- Points and leaderboards across games
- Multiple concurrent games in one session
- Public results pages streamers can share
- Analytics — which games drive the most chat activity
- Twitch support (the architecture already isolates the platform layer, so this is additive rather than a rewrite)

---

## 10. Boundaries — what StreamArena is not

**No real-money wagering.** Viewers never stake money on anything. No deposits, no withdrawals, no cash-out. Points are engagement scoring with no monetary value and no redemption path. This line is deliberate and non-negotiable: the moment real stakes enter, the product moves into gambling-licensing territory that varies by jurisdiction, blocks payment processors, and puts the whole thing at risk. StreamArena is a tracking and engagement layer that sits *beside* gambling content, not a gambling operator.

**Not a casino affiliate.** If affiliate links ever appear, that's a separate business decision with its own disclosure and compliance requirements — not something to let drift in through a feature.

**Not a bot the streamer installs.** Everything runs on our infrastructure. The streamer's only local artifact is a browser source URL.

**Not a chat moderation tool.** We read chat for commands. We're not building auto-mod.

---

## 11. Why this works — the core insight

Everything StreamArena does reduces to one loop:

```
chat message → parse → change game state → show it on stream
                              ↓
                      (sometimes: reply in chat)
```

Every game in the catalog is that same loop with different rules. Bonus hunt, giveaways, predictions, wheel spins — they differ only in what state they hold and how events change it.

So the product isn't "a bonus hunt tool that will grow." It's a **runtime for chat-driven games**, and bonus hunt is the first thing plugged into it. That framing is why the build order in the architecture doc puts bonus hunt at step 6 instead of step 1, and it's why adding the tenth game should cost days rather than months.

---

## 12. Glossary

| Term | Meaning |
|---|---|
| **Session** | One instance of one game running on one channel. Has a lifecycle: created → running → ended. |
| **Game module** | A plugin implementing one game. Holds state and rules; never touches Kick or the database directly. |
| **Overlay** | The browser source the streamer adds to OBS. Displays live game state. |
| **Command** | A chat keyword that does something (`!sr`). Keywords are configurable per streamer. |
| **Guard** | A rule that runs before a command takes effect — cooldowns, entry caps, role gating. |
| **Ack** | The bot's chat reply confirming or rejecting a viewer's command. |
| **Effect** | Something a game asks the runtime to do — send chat, update the overlay, set a timer. |
| **Slot catalog** | The database mapping what viewers type to real, canonical slots. |
