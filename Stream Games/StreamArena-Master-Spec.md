# StreamArena — Master Specification

**Version 1.0 · Scope: two games · Kick only**

The single source of truth for what StreamArena is, how it works, and how it's built.

---

## Document set

This file covers the product, the architecture, both games, and the build plan. Two companion files hold the paste-ready per-screen UI prompts, which are too long to inline here:

| File | Contents |
|---|---|
| **StreamArena-Master-Spec.md** | *This file.* Product, architecture, game rules, data model, chat behaviour, build plan |
| `StreamArena-BonusHunt-UI.md` | Paste-ready UI prompts — 9 screens, 4 components |
| `StreamArena-Tournament-UI.md` | Paste-ready UI prompts — 12 screens, 4 components |
| `StreamArena-UI-Brief.md` | Design tokens, dashboard shell, admin panel, AI-builder workflow |
| `StreamArena-Architecture.mermaid` | System diagram source |

Earlier drafts (`StreamArena-Product-Overview.md`, `StreamArena-Architecture.md`, `StreamArena-Game-Specs.md`) are superseded by this file. They included a third game, Bonus Bingo, now deferred.

---

# PART ONE — THE PRODUCT

## 1. What StreamArena is

StreamArena is a web platform that lets gambling streamers on Kick run interactive games with their chat.

A streamer signs in with their Kick account, picks a game, drops an overlay URL into OBS, and starts. Viewers play along by typing commands in Kick chat. Everything appears live on stream through the overlay. The streamer installs nothing, configures no bot, and runs no software on their own machine.

**Version 1 ships two games:**

1. **Bonus Hunt** — with Guess the Balance built in
2. **Slot Tournament** — viewer-vs-viewer knockout bracket

## 2. The problem

Gambling streamers already run these games. They run them by hand, badly.

A typical bonus hunt today is a Notepad window screen-captured into the corner of a layout, with the streamer manually typing every slot chat shouts out. Entries get lost when chat moves fast. Counts drift. Typos accumulate. Viewers can't tell whether their suggestion registered, so they spam it again, which makes it worse.

The tooling that exists is Twitch-first, requires local software like Streamer.bot, or is a chat bot with no visual layer. Kick's gambling community is large, growing, and underserved — and Kick shipped a proper public API with chat webhooks, which makes a clean web-based product possible.

**The bet:** streamers want these games to run themselves, look good on stream, and require zero setup beyond a browser source.

## 3. Who it's for

**Primary — the streamer.** Slots streamers on Kick, mid-size and up. They care about near-zero setup, an overlay that fits their layout, not babysitting the game while they play, and chat engagement that holds viewers.

**Secondary — the viewer.** They never visit the website. Their entire experience is typing in chat and seeing something happen on screen. This constraint drives many decisions below: **if a viewer has to leave the stream to participate, the feature has failed.**

**Third — moderators.** Mods fix things mid-game: remove a troll entry, correct a mis-resolved slot, close entries early. They get commands, not a login.

**Fourth — you.** The platform operator, with an admin panel for the slot catalog, quota monitoring, and channel management.

> **Terminology:** throughout this document, **streamer** means the person running a session. **Admin** means you, the platform operator. These are different roles with different interfaces.

## 4. The core loop

Everything StreamArena does reduces to one loop:

```
chat message → parse → change game state → show it on stream
                            ↓
                  (sometimes: reply in chat)
```

Every game is that loop with different rules. This is why the product is architected as a **runtime for chat-driven games** rather than as a bonus hunt app that will later grow — a framing that shapes the entire build order in §16.

## 5. Boundaries

**No real-money wagering.** Viewers never stake money. No deposits, no withdrawals, no cash-out, no points with monetary value or redemption path. This line is non-negotiable: real stakes move the product into gambling-licensing territory that varies by jurisdiction, blocks payment processors, and puts the whole business at risk. StreamArena is a tracking and engagement layer that sits *beside* gambling content, not a gambling operator.

**Not a casino affiliate.** If affiliate links ever appear, that's a separate business decision with its own disclosure and compliance requirements — not something to let drift in as a feature.

**Not installed software.** Everything runs on our infrastructure. The streamer's only local artifact is a browser source URL.

**Not a moderation tool.** We read chat for commands. We don't build auto-mod.

---

# PART TWO — KICK INTEGRATION

## 6. What Kick's API makes possible

All of it, through the official public API. No scraping, no unofficial websockets.

| Need | Mechanism |
|---|---|
| Streamer login | OAuth 2.1 + PKCE at `id.kick.com/oauth/authorize` |
| Read chat | Webhook event `chat.message.sent` |
| Post to chat | `POST /public/v1/chat` |
| Know when they go live | `livestream.status.updated` |
| Sub/gift events | `channel.subscription.*`, `kicks.gifted` |

**Scopes required:** `user:read`, `channel:read`, `chat:write`, `events:subscribe`.

### 6.1 Reading chat

Chat arrives as **webhooks, not a socket**. After a streamer authorises, you `POST /public/v1/events/subscriptions` with their token to subscribe to `chat.message.sent`. Kick then POSTs every chat message to your endpoint with content, sender id and username, broadcaster, emotes, and reply threading.

Latency is roughly 200ms–1s end to end. Fine for everything in these two games. Not suitable for reflex games where milliseconds decide a winner — design around this rather than fighting it.

### 6.2 Posting to chat

`POST /public/v1/chat`, max 500 characters, `type` of `user` or `bot`, and optionally `reply_to_message_id`.

That last field matters. The webhook gives you the viewer's `message_id`; feeding it back as `reply_to_message_id` renders your response as a **native threaded reply** to their own message rather than a loose `@mention` that scrolls away from what it answers.

**On identity:** `type: user` with the streamer's token is the reliable path — the message appears from their account. `type: bot` exists for a separate identity but its channel-targeting semantics are quirky (docs say `broadcaster_user_id` is ignored). Test both against a real channel early rather than committing to bot branding on paper.

### 6.3 The quota constraint

**Kick publishes no rate limit numbers.** What is known: unverified apps have a **default webhook delivery cap including a daily limit**, and raising it means petitioning Kick Engineering. As of writing, a production app's request to raise theirs has sat open for weeks.

This is the binding constraint on the whole platform, and it's inbound, not outbound. **The webhook fires for every message in the channel, not just your commands.** A busy gambling stream runs 50–100 messages/minute — 3,000–6,000 deliveries per hour, per streamer, whether or not anyone typed a command. Twenty concurrent streamers on a Saturday night is six figures of daily deliveries against a cap you can't see.

Three consequences, all load-bearing:

1. **Subscribe only while a game is running.** Create the `chat.message.sent` subscription when a session starts; delete it when the session ends. Never hold standing subscriptions on idle channels.
2. **File the verified-app application before launch.** Not when you hit the wall.
3. **Track daily delivery volume per channel** on the admin dashboard, so you watch the ceiling approach rather than discovering it mid-stream.

---

# PART THREE — ARCHITECTURE

**Stack:** Node 22 + TypeScript · Fastify · PostgreSQL · Redis · BullMQ · React
**Deploy:** Managed PaaS (Railway / Render / Fly), two processes
**Context:** solo build, structured so game #3 onward is cheap

## 7. The decision everything follows from

StreamArena is a **chat-driven game runtime**. Bonus Hunt and Slot Tournament are its first two plugins.

The runtime owns Kick OAuth, webhook subscriptions, chat delivery, session lifecycle, command parsing, dedupe, cooldowns, role gating, state persistence, the event log, overlay transport, rate limiting, and quota management.

A **game** owns three things: what state it holds, how an event changes that state, and what it renders. Nothing else. A game never touches Kick, never opens a socket, never writes to Postgres.

If adding a game ever requires touching core, that's a signal the contract is missing an abstraction — fix the contract rather than special-casing the game.

## 8. Topology

```
┌──────────────────────────────────────────────────────────────┐
│                            KICK                              │
│   id.kick.com (OAuth 2.1 + PKCE)   api.kick.com (REST)       │
│   Webhooks: chat.message.sent, subscription.*, kicks.gifted  │
└───────┬──────────────────────────────────────────▲───────────┘
        │ inbound webhooks                         │ chat writes
        ▼                                          │
┌──────────────────────────────────────────────────┴───────────┐
│  WEB PROCESS (Fastify)                                       │
│  /webhooks/kick  → verify sig → dedupe → enqueue → 200       │
│  /auth/*         → OAuth PKCE, token exchange & refresh      │
│  /api/*          → dashboard REST                            │
│  /ws             → overlay + dashboard sockets               │
└───────┬─────────────────────────────────┬────────────────────┘
        │ BullMQ                          │ Redis pub/sub
        ▼                                 │
┌──────────────────────────────────────┐  │
│  WORKER PROCESS                      │  │
│   Command Router                     │  │
│     parse → guards → dispatch        │  │
│   GAME REGISTRY                      │  │
│     bonus-hunt · slot-tournament     │  │
│     (pure reducers)                  │  │
│   Effect Executor                    │──┼──┐
│     chat · broadcast · persist       │  │  │
│   Chat sender · Subscription manager │  │  │
└───────┬──────────────────────────────┘  │  │
        │                                 │  │
   ┌────┴─────┬──────────────┐            │  │
   ▼          ▼              ▼            │  │
┌────────┐ ┌───────┐ ┌────────────────┐   │  │
│Postgres│ │ Redis │ │ Slot Catalog   │   │  │
│ truth  │ │ hot   │ │ fuzzy matching │   │  │
│+ events│ │ queues│ └────────────────┘   │  │
└────────┘ └───┬───┘                      │  │
               └──────────────────────────┘  │
                        │ WebSocket           │
                        ▼                     │
              ┌──────────────────────┐        │
              │  OBS Browser Source  │◄───────┘
              │  per-game overlay    │
              └──────────────────────┘
```

Two deployables. Resist making more.

| Process | Responsibility | Scale trigger |
|---|---|---|
| `web` | HTTP + WebSocket. Stays responsive; does almost no work | WS connections, ingest latency |
| `worker` | All game logic, all outbound Kick calls, all scheduled jobs | Queue depth |

**Why a modular monolith:** you are solo. Every service boundary is a deployment, a health check, and a 2am debugging session. Module boundaries are enforced in code as separate packages with explicit interfaces, so extracting a service later is a build-config change rather than a rewrite.

**WebSocket caveat:** the moment you run more than one `web` instance, overlay sockets land on arbitrary instances. **Use Redis pub/sub as the broadcast backplane from day one.** Twenty lines now; painful retrofit later.

## 9. The Game Module contract

The most important interface in the system.

```ts
export interface GameModule<TState, TConfig, TEvent> {
  readonly id: string                    // 'bonus-hunt'
  readonly stateVersion: number          // bump on shape change
  readonly displayName: string

  readonly configSchema: z.ZodType<TConfig>   // renders the settings form
  readonly commands: CommandSpec[]            // keywords, overridable
  readonly subscriptions: KickEventType[]     // drives webhook scope

  initialState(config: TConfig, ctx: InitContext): TState

  /** Pure. No I/O. No Date.now(). No Math.random(). */
  reduce(state: TState, event: TEvent, ctx: ReduceContext<TConfig>)
    : { state: TState; effects: Effect[] }

  /** Strips anything viewers shouldn't see */
  project(state: TState): OverlayState
}

export type Effect =
  | { kind: 'chat';      text: string; replyTo?: string; priority: Priority }
  | { kind: 'broadcast'; patch: unknown }
  | { kind: 'timer';     inMs: number; event: unknown }
  | { kind: 'lookup';    query: string; then: unknown }
  | { kind: 'persist';   record: unknown }
  | { kind: 'end' }
```

### Why the reducer is pure

**Testable without Kick.** Feed an array of events, assert on final state. The entire game test suite runs in milliseconds with no network, no database, no OAuth. You can simulate a 500-viewer spam storm in a unit test.

**Replayable.** Every event is appended to the log, so any session's state can be rebuilt by re-running the reducer. A streamer reports "the hunt lost three entries at 11pm" — you replay their session locally and watch it happen.

**Crash-safe by construction.** Worker dies mid-hunt? The new worker replays the log and resumes exactly where it left off. No reconciliation logic.

The rule that makes this work: **effects are returned, not performed.** A reducer never calls `sendChat()`. It returns `{ kind: 'chat', ... }` and the runtime decides whether to batch it, throttle it, or drop it because the streamer turned acks off. Every game inherits that policy for free.

**Randomness and time must come from state, not the environment.** The tournament draw and any coin-flip tiebreak derive from a `seed` stored in session state plus a deterministic input (match id, seat index). A replay that produces a different champion is worse than no replay at all.

### Async inside a pure reducer

Slot lookup is async but the reducer can't await. Two-pass pattern:

```
!sr gates
  → reduce() sees an unresolved slot name
  → returns state with a pending entry + { kind: 'lookup', query: 'gates' }
  → executor calls the catalog service
  → result re-enters as a SlotResolved event
  → reduce() fills the entry, or emits a "did you mean" chat effect
```

The viewer sees their entry appear as pending immediately, then firm up. Feels fast, stays pure.

## 10. The event pipeline

```
1. INGEST    POST /webhooks/kick
             ├─ verify Kick signature against their public key
             ├─ check Kick-Event-Message-Id in Redis (24h TTL) → drop dupes
             ├─ enqueue raw payload to BullMQ
             └─ return 200  (target <50ms, hard ceiling 2s)

2. NORMALISE worker: KickEvent → InternalEvent

3. ROUTE     broadcaster_user_id → active session?
             no session → drop        ← most traffic dies here

4. PARSE     message text → command? resolve against session registry

5. GUARD     ordered, fail fast:
             session accepting? → command enabled? → role gate
             → per-user cooldown → per-user cap → global cap

6. REDUCE    game.reduce(state, event, ctx) → { state, effects }

7. COMMIT    append to session_events (Postgres)
             write projection to Redis
             log is the source of truth

8. EXECUTE   chat      → outbound queue (batched, throttled)
             broadcast → Redis pub/sub → WS → overlay
             timer     → BullMQ delayed job
             lookup    → catalog → re-enters at step 2
```

**Step 3 deserves emphasis.** Most webhook traffic is not a command — on a busy stream, 95%+ of deliveries are ordinary conversation. Make "no active session" and "not a command" the fastest code in the system: a Redis hash lookup and a single-character check on the first byte. Everything expensive happens after those two gates.

## 11. Data model

### Postgres — source of truth

```
users              kick_user_id, display_name, created_at
oauth_tokens       user_id, access(enc), refresh(enc), scopes, expires_at
channels           broadcaster_user_id, slug, owner_user_id

game_sessions      id, channel_id, game_id, state_version, seed,
                   config(jsonb), status, overlay_token,
                   started_at, ended_at

session_events     id BIGSERIAL, session_id, seq, type,
                   payload(jsonb), kick_message_id, created_at
                   UNIQUE(session_id, seq)
                   UNIQUE(session_id, kick_message_id)   ← idempotency

session_snapshots  session_id, seq, state(jsonb), created_at
                   (every N events, so replay isn't O(all events))

game_configs       channel_id, game_id, config(jsonb), commands(jsonb)

slots              id, name, provider, rtp, max_win, volatility, thumbnail
slot_aliases       slot_id, alias, source(manual|learned), weight, hit_count
```

### Redis — hot path only, always reconstructible

```
session:{id}:state        current projected state
channel:{id}:session      active session id     ← step-3 lookup
dedupe:{kickMessageId}    24h TTL
cooldown:{session}:{user} per-viewer cooldown
bucket:chat:{channel}     token bucket
bull:*                    queues
```

**Nothing lives only in Redis.** If Redis is wiped, every session rebuilds from snapshots plus events. This is what makes managed Redis on a PaaS acceptable rather than terrifying — and it should be tested deliberately, not assumed.

### On event sourcing

This is event-sourcing-lite, and it earns its keep here specifically because **gambling streamers will dispute outcomes.** When someone claims the tournament draw was rigged or their slot request vanished, "let me replay your session" is a complete answer. Full CQRS is overkill; an append-only log plus periodic snapshots is not.

## 12. Kick integration layer

Isolated in `packages/kick`. Nothing outside this package knows Kick exists — which is also what makes Twitch support additive later rather than a rewrite.

**Auth service.** PKCE flow, token exchange, refresh ahead of the 3600s expiry. **Encrypt refresh tokens at rest** (libsodium sealed box, key in the platform secret store). A leaked refresh token lets someone post as the streamer; treat it like a password.

**Subscription manager.** Session-scoped subscribe/unsubscribe per §6.3. Subscribe only to event types the active game declares. Reconcile on boot: list Kick's subscriptions, drop orphans from crashed sessions.

**Webhook receiver.** Signature verification, replay-window rejection on the timestamp header, idempotency on message id. Return 200 fast and unconditionally on any valid payload — a 500 triggers redelivery and burns quota twice.

**Chat sender.** Detailed in §15.

---

# PART FOUR — THE GAMES

## 13. Game 1 — Bonus Hunt (with Guess the Balance)

### Concept

The streamer sets aside a balance and plays slots until they've collected a target number of bonuses. Viewers suggest which slots via chat. Once the list is locked, viewers guess what the final balance will be after every bonus is opened. Then bonuses are opened one by one, and the guess closest to the true final balance wins.

Guess the Balance is what turns a hunt from something viewers *watch* into something they're *invested in* — every bonus opening now matters to every viewer who guessed, not just the streamer.

### Phases

```
COLLECTING → GUESSING → OPENING → COMPLETE
```

| Phase | What happens | Chat can |
|---|---|---|
| **Collecting** | Streamer plays slots, banks bonuses. Viewers suggest slots | `!sr <slot>` |
| **Guessing** | Collection closed, full list visible, countdown running | `!guess <amount>` |
| **Opening** | Guesses locked. Streamer opens each bonus and enters the win | *(watching)* |
| **Complete** | Final balance known. Two winners announced | — |

**Why guessing sits between collecting and opening:** viewers need the finished list and the break-even figure to guess meaningfully. Guessing during collection is guessing blind, which makes the winner arbitrary rather than skilful. It also creates a discrete hype moment with a countdown — prime narration time for the streamer.

Window is configurable, default **3 minutes**, with a manual lock override.

### Commands

| Command | Who | Rules |
|---|---|---|
| `!sr <slot name>` | Viewers (gated) | One entry per viewer by default; cooldown; resolves against catalog |
| `!guess <amount>` | Viewers | One guess per viewer, **editable until lock** (last counts) |
| `!hunt` | Viewers | Status reply, rate-limited to one per 60s per channel |
| `!myslot` | Viewers | Confirms what that viewer submitted |
| `!close` / `!lock` | Streamer, mods | Advance phase |
| `!remove <n>` | Mods | Remove a bad entry |

**Guess parsing:** strip currency symbols, commas, spaces; expand `k`/`K` (`!guess 6.5k` → 6500). Reject above a sanity ceiling, default 100× starting balance — otherwise someone guesses a billion for the meme and clutters the distribution forever.

### Winner rule

**Closest in either direction**, by absolute difference. **Tiebreak: earliest guess wins** — deterministic, needs no randomness, and rewards committing early.

If nobody guessed, skip the announcement rather than showing an empty winner card.

### State

```ts
type BonusHuntState = {
  phase: 'collecting' | 'guessing' | 'opening' | 'complete'
  currency: 'EUR' | 'USD' | 'GBP'
  startBalance: number
  targetBonuses: number

  entries: {
    id: string
    slotId: string | null            // null while unresolved
    rawText: string                  // what the viewer actually typed
    requestedBy: { userId, username, role }
    bet: number
    win: number | null
    status: 'pending' | 'collected' | 'opened'
    order: number
  }[]

  guesses: {
    userId: string
    username: string
    amount: number
    submittedAtSeq: number           // sequence, not wall clock
  }[]

  guessWindowEndsAt: number | null
  guessesLocked: boolean

  totals: { spent: number; won: number }
  winner: { userId; username; amount; difference } | null
}
```

### Derived values — computed, never stored

```
spent             = startBalance − balanceAtEndOfCollection
breakEvenPerBonus = spent / entries.length
profit            = totals.won − spent
returnMultiple    = totals.won / spent
remainingBonuses  = entries.filter(e => e.status !== 'opened').length
```

`breakEvenPerBonus` is the emotional centre of the game and should be the largest number on the overlay during collection and guessing.

`spent` is captured once, in the "close entries" confirm dialog, which asks *"What's your balance now?"* — fewer inputs during play, and it's the moment the streamer would naturally look anyway.

### Edge cases

| Situation | Behaviour |
|---|---|
| Entry removed after guesses lock | Allowed. Guesses stand — the hunt changed, that's the risk |
| Duplicate slot in the list | Allowed (different bet sizes are normal). Duplicate request from the *same viewer* is blocked |
| Viewer guesses twice | Last guess silently replaces the first |
| Hunt abandoned mid-way | No winner; session saved incomplete |
| Zero guesses | Skip the winner card and the announcement |
| Two guesses equidistant either side | Earlier submission wins |
| Streamer mistypes a win | Editable until the session completes |

---

## 14. Game 2 — Slot Tournament

### Concept

Viewers claim a slot in chat with `!join <slot>`. From everyone who joined, **8, 12, or 16 seats** are filled — some hand-picked by the streamer, the rest drawn at random. Those slots seed a knockout bracket where **each slot belongs to a viewer**.

Each match, the streamer buys a bonus on both slots and enters what it cost and what it paid. The higher multiplier advances, computed automatically. Meanwhile the whole chat — selected or not — predicts every match.

The session ends with **two winners**: the viewer whose slot took the bracket, and the viewer who called the most matches correctly.

Tying slots to people is what makes this work. A bracket of slots is a spreadsheet; a bracket of *viewers* is a tournament. And the prediction layer keeps the several hundred viewers who didn't get a seat invested throughout.

### Phases

```
JOINING → DRAW → SEEDING → [ VOTING → PLAYING → ADVANCE ] × n → COMPLETE
```

### Joining

`!join <slot name>`

| Rule | Behaviour |
|---|---|
| One entry per viewer | Second `!join` replaces the first while the window is open |
| **Slots are unique** | First come, first served |
| Slot must resolve | Unresolvable names go to the unresolved queue |
| Optional gating | Anyone / followers / subscribers |
| Window | Manual close, or countdown (default 5 minutes) |

Pool is uncapped — hundreds of joiners is fine, it's a list.

**The duplicate rejection must reach chat.** If a `!join` is silently dropped because someone claimed that slot two seconds earlier, the viewer sits there believing they're entered and finds out only when the draw passes them by:

> ↳ @viewer Gates of Olympus is already claimed by @slotgoblin — pick another slot.

### The draw

1. **Reserved seats** — the streamer hand-picks any number of entrants from the pool by username search. This is how a smaller or newer viewer gets a guaranteed shot instead of being drowned out by a hundred joiners.
2. **Random fill** — remaining seats drawn from the rest, using the session seed so the draw is reproducible on replay.

**Label reserved picks visibly** with a "Streamer's pick" badge, and fill them *before* the random draw begins. Hiding hand-chosen entrants inside a supposedly random draw will eventually be noticed, and "the draw is rigged" is very hard to walk back. Shown openly and up front, the same act reads as generosity.

**The draw runs once and cannot be re-rolled.** No re-roll button anywhere in the UI. The fairness of this game is the product.

**Make the draw an on-stream moment** — names cycling and landing one seat at a time, a beat between each. Free hype for one animation; filling a list silently wastes the most anticipated moment of the session. Keep the whole reveal under ~20 seconds.

### Bracket structure

| Seats | Bracket | Byes | Rounds | Real matches |
|---|---|---|---|---|
| 8 | 8 | 0 | 3 | 7 |
| 12 | 16 | 4 | 4 | 11 |
| 16 | 16 | 0 | 4 | 15 |

With 12 entrants, four players skip round one. Assign byes by seeded random draw and mark them clearly as **BYE** — an unexplained gap reads as a bug. Narratively, frame round one of a 12-player bracket as a **play-in round**: eight fighting for four spots while four wait.

### Match resolution

The streamer enters four numbers:

```
Slot A:  buy cost €100   payout €425   →  4.25x
Slot B:  buy cost €200   payout €610   →  3.05x
                                  Slot A advances
```

**Winner is the higher multiplier — payout ÷ buy cost.**

This is the right metric because bonus buy costs vary enormously between slots (100× to 500× bet is a normal range). Ranking by raw payout would mean the most expensive buy wins nearly every time, and viewers would learn within one session to only ever join with the priciest-buy slot. Multiplier is also the number slot viewers already think in.

**Tiebreak ladder** — ties are common, especially when both bonuses die:

1. Higher raw payout
2. Lower buy cost (better value for the same return)
3. Seeded coin flip — session seed + match id

Two dead bonuses both paying €0 is frequent: 0.00× vs 0.00×, equal payouts, resolving on lower buy cost then coin flip. **Always state on screen how a tiebreak was decided.** An unexplained winner on stream reads as broken software.

**Validation:** buy cost must exceed zero. Payout of zero is valid and common.

### Predictions

| Command | Notes |
|---|---|
| `!vote a` / `!vote b` | One vote per match, changeable during the window, locked at match start |
| `!vote <slot name>` | Fuzzy-matched against the two contenders only |
| `!bracket` | Standings, batched reply |
| `!score` | That viewer's prediction record |

Voting window default **60 seconds** with a manual override. The overlay shows a live A/B split bar — watching it swing is its own entertainment and gives the streamer something to react to.

Participants may vote on their own matches. They'll back themselves; stopping them isn't worth the special case.

**Scoring:** +1 per correct pick. Leaderboard ties break on accuracy percentage, then earliest join.

### State

```ts
type TournamentState = {
  phase: 'joining' | 'draw' | 'seeding' | 'voting' | 'playing' | 'complete'
  seed: string
  seats: 8 | 12 | 16
  config: {
    metric: 'multiplier'
    votingWindowMs: number
    joinGate: 'anyone' | 'followers' | 'subscribers'
    joinWindowMs: number | null
  }

  pool: {
    userId: string; username: string; role: string
    slotId: string; slotName: string; provider: string
    joinedAtSeq: number
  }[]

  reservedUserIds: string[]

  entrants: {
    userId: string; username: string
    slotId: string; slotName: string
    seedNumber: number
    source: 'reserved' | 'random'
    hasBye: boolean
  }[]

  rounds: {
    roundIndex: number
    matches: {
      id: string
      a: { entrantId, slotName, buyCost, payout, multiplier } | null
      b: { entrantId, slotName, buyCost, payout, multiplier } | null | 'bye'
      winner: 'a' | 'b' | null
      decidedBy: 'multiplier'|'payout'|'cost'|'coinflip'|'bye' | null
      votes: Record<string, 'a' | 'b'>
    }[]
  }[]

  currentMatch: { roundIndex: number; matchIndex: number } | null
  votingEndsAt: number | null
  scores: Record<string, { username: string; correct: number; total: number }>

  champion: { userId; username; slotName } | null
  topPredictor: { userId; username; correct; total } | null
}
```

### Edge cases

| Situation | Behaviour |
|---|---|
| Fewer joiners than seats | Offer next size down, or let the streamer fill manually |
| Entrant's slot unresolvable at draw | Flag the seat; "Replace" draws a fresh entrant |
| Selected viewer leaves or is banned | Their slot still plays and can still win |
| Streamer mistypes cost or payout | Editable until the winner advances; afterwards requires explicit "revert match" |
| Match reverted | Votes restored, scores recalculated from the event log |
| Both bonuses pay zero | Resolves down the tiebreak ladder; overlay states how |
| Buy cost entered as zero | Rejected at input with an inline error |
| Abandoned mid-bracket | No champion; prediction leaderboard still saved and announced |
| Nobody voted on a match | Match proceeds, nothing scored |

---

## 15. Chat behaviour

### 15.1 Acks — the "only speak when useful" policy

Successful actions are already visible on the overlay. Chat writes are reserved for cases where chat is the only channel that works:

- Unresolved slot names — "couldn't find 'gatez' — did you mean Gates of Olympus?"
- Duplicate slot claim in a tournament
- Already-participated, cooldown, gating rejections
- Entries closed

Acks are **threaded replies** using `reply_to_message_id`.

**Streamer setting, four options:** Off · **Errors only (default)** · Batched summaries · Every request.

Why this matters: a hunt with 300 viewers spamming `!sr` means 300 outbound writes if you ack everything. That floods chat, buries actual conversation, and hits rate limits — at which point acks start silently failing, which is worse than not having them. With errors-only, those 300 requests collapse to maybe 5–15 writes across the whole session.

### 15.2 Announcements — a different class of message

| | Ack | Announcement |
|---|---|---|
| Audience | One viewer | Whole channel |
| Delivery | Threaded reply | **Top-level message** |
| Frequency | Many per session | Once or twice |
| Governed by | Ack setting | Separate "Announce winners" toggle, on by default |
| Priority | Batched, low | Priority lane, bypasses batching |

Top-level rather than threaded matters: threading the announcement to the winner's original message buries it thousands of lines up and renders it as a reply to one person rather than news for everyone.

### 15.3 The stream-delay trap

**Post the announcement the instant the game resolves and you spoil your own reveal.**

The overlay is composited into the video stream, so viewers see it on Kick's delay — typically 5–15 seconds. Chat arrives in near real time. Fire immediately and chat reads "@slotgoblin won with €6,750" while the overlay is still counting up.

**Fix:** a configurable **stream delay**, default **12 seconds**, held between overlay reveal and chat write. Expose it plainly: *"How many seconds behind is your stream? We'll hold chat announcements this long so they don't spoil your overlay."*

This applies to any dramatic reveal — tournament match results too, not just final winners.

### 15.4 Templates

Editable per game with token substitution, all inside 500 characters.

**Bonus Hunt result**
> Hunt complete! €5,000 → €6,720 (+€1,720). Best slot: Gates of Olympus at 214x

**Guess the Balance winner** *(≈4s later)*
> @slotgoblin wins Guess the Balance! Final was €6,720 — guessed €6,750, off by €30. 247 players entered.

**Tournament champion**
> @slotgoblin wins the tournament! Gates of Olympus took the final at 4.25x against @kickfan92's Le Bandit at 3.05x.

**Top predictor** *(≈4s later)*
> Best predictor: @bonusbandit with 9/11 matches called correctly.

**Tournament draw complete** *(optional, on by default)*
> Tournament locked in! 12 entrants: @a, @b, @c… Predictions open now — type !vote a or !vote b each round.

Sixteen usernames plus slot names overflows 500 characters — announce usernames only, and truncate with "…and 4 more — full bracket on screen."

**Always two messages, not one.** The game result and the viewer winner are different achievements; merging them buries both.

### 15.5 Sender rules

- Single outbound worker **per channel**, token bucket at ~1 msg/sec
- Batching window 5–10s coalescing queued acks into one ≤500 char write
- Priority lanes: errors and announcements beat batched summaries
- 429 → respect `Retry-After`, exponential backoff, circuit break after repeated failure
- **Vary text on repeats** — Kick's anti-spam drops identical consecutive messages
- Announcements retry twice then give up silently. The overlay already showed the result; a failed chat write isn't worth escalating mid-stream
- Use the username **captured at submission time** — Kick usernames can change mid-session
- Never send chat from the webhook handler

### 15.6 Channel modes

Channels can be in slow mode, follower-only, or sub-only mode, and your bot is subject to the same restrictions. Handle rejection gracefully — degrade to overlay-only feedback rather than retrying into a wall.

## 16. Shared primitives

Designing two games together surfaces what to build **once, in `packages/core`**, rather than twice:

**1. Timed submission window** — slot requests, guesses, tournament joins, match votes. Open a window, one submission per viewer, editable until lock, countdown on overlay, lock, resolve. One component, four uses.

**2. Entry pool and draw** — collect an uncapped pool, let the streamer reserve seats, fill the rest by seeded draw, animate the reveal. Giveaways are the same mechanic with a different prize, so this makes that future game nearly free.

**3. Closest-value resolution** — absolute difference, earliest-submission tiebreak. Guess the Balance now; guess-the-multiplier later.

**4. Streamer result entry** — keyboard-first inline number entry with live-computed multipliers, undo, edit-in-place. Both games are fundamentally the streamer typing numbers while playing, and this is the control they touch most.

**5. Prediction scoring** — per-viewer correct/total, leaderboard with tiebreaks, top-scorer announcement.

**6. Winner announcement** — overlay takeover, delayed chat message, history record. The tournament needs two.

**7. Unresolved queue** — raw text, suggestions with confidence, keyboard shortcuts, resolve or discard. Both games need it.

---

# PART FIVE — INTERFACE

## 17. Surfaces

| Surface | Audience | Notes |
|---|---|---|
| **Dashboard** | Streamer | Login, catalog, setup, live control, history, settings |
| **Overlay** | Stream viewers | OBS browser source, transparent, per-game |
| **Chat bot** | Stream viewers | No UI. Speaks only when useful |
| **Admin panel** | You | Slot catalog, alias queue, quota monitoring, channels |

## 18. Design system

Dark, high-energy, neon. A premium betting product, not corporate SaaS — it must look at home beside slot games on a stream.

```
--bg-base        #0A0A0F      --text-primary   #F5F5FA
--bg-surface     #13131C      --text-secondary #9A9AB0
--bg-raised      #1C1C28      --text-muted     #6A6A80
--border         #2A2A3A

--accent         #A855F7   brand purple — primary actions, active states
--accent-dim     #7E3FBF   hover/pressed
--win            #22E88F   profit, success, positive
--gold           #FFC53D   highlights, best result, jackpot
--loss           #FF4D6A   loss, errors, destructive
--info           #3B9EFF   informational
```

**Type:** Inter for UI and body (400/500/600). Space Grotesk for display and all numbers (600/700) with `font-variant-numeric: tabular-nums` so figures don't jitter as they update.

**Rules:** never pure black or pure white. Body text minimum 14px. One accent carries the primary action per screen. Green means profit, red means loss, gold means best-or-notable — never decorative. Neon glow on emphasis only (primary buttons, active nav, live indicators) or it becomes noise.

**Motion:** 150–200ms ease-out. Numbers count up rather than snapping. New list items slide in from the top with an accent flash. Nothing loops indefinitely except a single small LIVE dot.

## 19. Overlay constraints

**A different design problem from the dashboard, and the biggest source of mistakes.**

The overlay renders as a transparent OBS Browser Source at exactly 1920×1080, composited over a live stream and re-encoded at low bitrate.

- Background fully transparent — never set a page background colour
- Fixed canvas: no scrolling, no responsive breakpoints
- **No text under 20px. No font weight under 500. No borders under 2px. No low-contrast greys.** Thin and subtle disappears entirely on stream
- Panels sit on `rgba(19,19,28,0.88)` with `backdrop-filter: blur(12px)` — never fully opaque, never fully transparent behind text
- Keep the centre of the frame clear; the game and facecam live there
- No infinite loops or constant motion. Animate only when data changes
- **Test against a screenshot of a real slot game**, not a white page. Layouts that look sharp in a builder frequently vanish over busy game art

**Reconnection:** OBS browser sources drop constantly. On connect, the server sends a **full snapshot**; after that, patches. The client tracks a sequence number and requests a resync on any gap. A silently desynced overlay showing stale data on stream is the worst failure mode in the product.

## 20. Screen inventory

**Bonus Hunt** — 5 dashboard states (setup, collecting, guessing, opening, complete), 4 overlay states (collecting, guessing, opening, result), 4 components. Full prompts in `StreamArena-BonusHunt-UI.md`.

**Slot Tournament** — 6 dashboard states (setup, joining, draw, voting, playing, complete), 6 overlay states (joining, draw reveal, match card, result flash, bracket takeover, final result), 4 components. Full prompts in `StreamArena-Tournament-UI.md`.

**Dashboard shell** — login, game catalog, history, session detail, settings. **Admin panel** — slot catalog, alias review queue, system health, channels. Full prompts in `StreamArena-UI-Brief.md`.

### The three highest-value UI decisions

**The unresolved queue** is the most valuable component in the dashboard. When `!sr gatez` fails to match, it's how the streamer rescues the entry in two seconds without leaving the game. Keyboard shortcuts (1/2/3 to pick a suggestion, D to discard) because it gets worked in bursts.

**Username above slot name, everywhere in the tournament.** On the match card, bracket nodes, and result reveal. The viewer is the contender; the slot is what they brought. A bracket showing only slot names discards the entire point of the game.

**The guess leaderboard during opening.** The right rail shows the five guesses currently closest to the running total, leader highlighted, updating as wins are entered. This is the streamer's narration fuel for the whole opening phase.

### Brackets exist at three fidelities

Don't try to make one component serve all three:

| Where | Density | Text |
|---|---|---|
| Dashboard | Dense, interactive, zoomable | Full |
| Overlay minimap | Structural only, corner-anchored | **None** |
| Between-rounds takeover | Full frame, 6 seconds | Fully legible |

Sixteen usernames will never fit legibly in a corner minimap. That job belongs to the takeover.

---

# PART SIX — SLOT CATALOG

## 21. The hardest unglamorous problem

`!sr gates`, `!sr gates of olympus`, `!sr GOO`, and `!sr gatez` must all resolve to one canonical slot. This is what makes the product feel magic or feel broken, and it's a genuine workstream rather than a lookup table.

**Data model**

```
slots         id, name, provider, rtp, max_win, volatility, thumbnail
slot_aliases  slot_id, alias, source(manual|learned), weight, hit_count
```

**Resolution ladder**

1. Exact match on canonical name (normalised: lowercase, strip punctuation)
2. Exact match on a known alias
3. Trigram / fuzzy match above a confidence threshold → auto-resolve
4. Below threshold → **unresolved queue** with top three suggestions and confidence scores
5. No candidates → "not found" ack with a search hint

**The alias flywheel.** Every resolution a streamer or mod makes in the unresolved queue creates a learned alias. Frequency across channels raises its weight. Auto-match rate climbs over time without anyone curating a dictionary — the admin alias review queue exists to accelerate that, sorted by frequency so the highest-impact fixes come first, with 1/2/3/D keyboard shortcuts because it's worked in bulk.

**Ship order:** exact and near-exact matching only for v1, with the unresolved queue carrying the rest. Layer fuzzy matching behind the same interface once real request data exists — you'll tune thresholds far better against what viewers actually type than against guesses.

**Never block on the catalog.** The slot picker's empty state offers "Add as custom slot" accepting free text, so a missing catalog entry can never stop a hunt or a tournament mid-stream.

---

# PART SEVEN — BUILD

## 22. Repository structure

```
streamarena/
├── apps/
│   ├── web/           Fastify: HTTP, WS, webhooks, OAuth
│   ├── worker/        BullMQ consumers, effect executor
│   ├── dashboard/     Next.js streamer UI
│   └── overlay/       React overlay host + per-game bundles
├── packages/
│   ├── core/          GameModule contract, effects, registry, primitives
│   ├── kick/          OAuth, webhooks, chat sender, subscriptions
│   ├── catalog/       slot search, fuzzy matching, alias learning
│   ├── db/            Drizzle schema, migrations, repositories
│   ├── games/
│   │   ├── bonus-hunt/
│   │   └── slot-tournament/
│   └── shared/        types shared with overlay + dashboard
└── docker-compose.yml (local Postgres + Redis only)
```

pnpm workspaces or Turborepo. Enforce the boundary with an ESLint rule banning imports from `apps/*` inside `packages/games/*` — that single rule is what keeps game logic from leaking into core.

## 23. Build order

**The counterintuitive part: neither game is step one.**

| # | Milestone | Why here |
|---|---|---|
| 1 | **Runtime skeleton** | GameModule contract, registry, reducer harness, in-memory loop. No Kick, no DB. Prove the model with a trivial test game |
| 2 | **Kick auth + webhook ingest** | OAuth, signature verification, dedupe, subscription lifecycle. Verify against a real channel |
| 3 | **Persistence** | Event log, snapshots, Redis projection, crash recovery. Kill the worker mid-session and watch it resume |
| 4 | **Chat sender** | Batching, throttle, ack settings, announcements, stream delay, 429 handling |
| 5 | **Overlay transport** | Snapshot/patch, reconnect, resync |
| 6 | **Shared primitives** | Submission window, result entry, unresolved queue, winner announcement |
| 7 | **Bonus Hunt** | Should feel almost anticlimactic |
| 8 | **Slot catalog** | Exact match first; fuzzy layered in later |
| 9 | **Dashboard shell** | Login, catalog, history, settings |
| 10 | **Slot Tournament** | The real validation — adds pool/draw and prediction scoring, both reusable |
| 11 | **Admin panel** | Catalog curation, alias queue, quota monitoring |
| 12 | **Polish** | Draw reveal, bracket takeover, overlay themes |

Bonus Hunt at step 7 is deliberate and it's the single most valuable line in this document. Build it first and its assumptions leak into every layer; you'd spend months extracting them when the tournament arrives. **Slot Tournament taking days rather than weeks is how you'll know the architecture held.**

Within each game, build the dashboard control screen and its overlay together, phase by phase — you can't meaningfully test one without the other.

## 24. Scaling path

| Stage | Trigger | Action |
|---|---|---|
| 1 | Launch | 1 web + 1 worker, managed PG + Redis |
| 2 | Queue depth grows | Scale workers (already stateless) |
| 3 | WS count grows | Scale web; Redis adapter already in place |
| 4 | Ingest spikes | Split webhook ingest into its own service — it shares nothing |
| 5 | Catalog search hot | Extract catalog service; already a clean interface |
| 6 | Real scale | Partition sessions by channel across workers |

Each step is independent and reversible. None is a commitment now.

## 25. Risk register

| Risk | Impact | Mitigation |
|---|---|---|
| Webhook daily cap hit mid-stream | Game dies live | Session-scoped subscriptions, quota telemetry, verified-app application filed early |
| Kick API breaking change | Platform down | All Kick contact isolated in `packages/kick`; contract tests against real endpoints |
| Slot matching poor | Product feels broken | Alias table, learned aliases, unresolved queue, custom-slot escape hatch |
| Redis loss | Sessions drop | Full rebuild from event log — test this deliberately, don't assume it |
| Chat rate limit | Bot silenced | Errors-only default, batching, priority lanes, per-channel token bucket |
| Overlay desync | Stale data on stream | Sequence numbers, snapshot resync on gap |
| Token leak | Impersonation | Encrypted at rest, minimal scopes, per-session overlay tokens |
| Draw perceived as rigged | Trust destroyed | Seeded and replayable, no re-roll button, reserved picks labelled openly |
| Regulatory scope creep | Licensing exposure | Hard line: no real-money stakes, ever |

## 26. Deliberately excluded

Each is a considered deferral, not an oversight. Revisit when a measured problem demands it.

**Product:** Bonus Bingo · points and leaderboards across sessions · per-viewer bingo cards · multiple concurrent games per session · public shareable results pages · Twitch support (additive — the platform layer is already isolated)

**Technical:** microservices · Kubernetes · a broker beyond Redis/BullMQ · full CQRS · multi-region

**Never:** real-money wagering · platform-handled prizes · anything that makes StreamArena a gambling operator rather than a tool beside one

---

## 27. Glossary

| Term | Meaning |
|---|---|
| **Session** | One instance of one game on one channel. Created → running → ended |
| **Game module** | A plugin implementing one game. Holds state and rules; never touches Kick or the DB |
| **Overlay** | The transparent browser source in OBS showing live game state |
| **Command** | A chat keyword that does something (`!sr`). Configurable per streamer |
| **Guard** | A rule running before a command takes effect — cooldowns, caps, role gating |
| **Ack** | A threaded reply to one viewer confirming or rejecting their command |
| **Announcement** | A top-level broadcast to the whole channel — results and winners |
| **Effect** | Something a game asks the runtime to do — send chat, patch overlay, set a timer |
| **Entrant** | A viewer who won a tournament seat, with their claimed slot |
| **Pool** | Everyone who typed `!join`, before the draw narrows it to entrants |
| **Break-even** | Required average win per bonus for a hunt to profit |
| **Unresolved queue** | Chat requests the catalog couldn't match, awaiting a human decision |
| **Streamer** | The person running a session |
| **Admin** | You, the platform operator |

---

*End of specification. Version 1.0 — two games, Kick only.*
