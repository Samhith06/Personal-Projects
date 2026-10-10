# StreamArena — System Architecture

**Stack:** Node 22 + TypeScript · Fastify · PostgreSQL · Redis · BullMQ · React
**Deploy:** Managed PaaS (Railway / Render / Fly) — two processes, `web` + `worker`
**Context:** Solo build, structured so that game #2 through game #20 are cheap to add

---

## 0. The decision everything else follows from

StreamArena is **not a bonus hunt app that will later grow more games.** It is a *chat-driven game runtime*, and bonus hunt is its first plugin.

That distinction is the whole architecture. If you build bonus hunt first and generalise later, you will spend months untangling hunt-specific assumptions from the webhook layer, the command parser, the overlay, and the database schema. If you build the runtime first, bonus hunt takes a week and every game after it takes days.

Concretely, the runtime owns:

- Kick OAuth, webhook subscriptions, and chat delivery
- Session lifecycle (start, pause, end, crash recovery)
- Command parsing, dedupe, cooldowns, and role gating
- State persistence, event log, and overlay transport
- Rate limiting and quota management

A **game** owns only three things: what state it holds, how an event changes that state, and what it renders. Nothing else. A game never touches Kick, never opens a socket, never writes to Postgres.

---

## 1. High-level topology

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
│                                                              │
│  /webhooks/kick   → verify sig → dedupe → enqueue → 200      │
│  /auth/*          → OAuth PKCE, token exchange & refresh     │
│  /api/*           → dashboard REST (sessions, config, stats) │
│  /ws              → overlay + dashboard sockets              │
└───────┬─────────────────────────────────┬────────────────────┘
        │ BullMQ                          │ Redis pub/sub
        ▼                                 │
┌──────────────────────────────────────┐  │
│  WORKER PROCESS                      │  │
│                                      │  │
│  ┌────────────────────────────────┐  │  │
│  │  Command Router                │  │  │
│  │   parse → guards → dispatch    │  │  │
│  └───────────────┬────────────────┘  │  │
│                  ▼                   │  │
│  ┌────────────────────────────────┐  │  │
│  │  GAME REGISTRY                 │  │  │
│  │   bonus-hunt · slot-battle     │  │  │
│  │   giveaway · predictions · …   │  │  │
│  │   (pure reducers)              │  │  │
│  └───────────────┬────────────────┘  │  │
│                  ▼                   │  │
│  ┌────────────────────────────────┐  │  │
│  │  Effect Executor               │  │  │
│  │   chat · broadcast · persist   │──┼──┘
│  │   timer · catalog lookup       │  │
│  └────────────────────────────────┘  │
│                                      │
│  Also: chat sender (token bucket),   │
│  subscription manager, catalog sync  │
└───────┬──────────────────────────────┘
        │
   ┌────┴─────┬──────────────┐
   ▼          ▼              ▼
┌────────┐ ┌───────┐ ┌────────────────┐
│Postgres│ │ Redis │ │ Slot Catalog   │
│ truth  │ │ hot   │ │ Service        │
│ + event│ │ state │ │ (fuzzy match)  │
│   log  │ │ queues│ └────────────────┘
└────────┘ └───────┘
                            │ WebSocket
                            ▼
                  ┌──────────────────────┐
                  │  OBS Browser Source  │
                  │  (per-game overlay)  │
                  └──────────────────────┘
```

---

## 2. Runtime topology

Two deployables. Resist the urge to make more.

| Process | Responsibility | Scaling trigger |
|---|---|---|
| `web` | HTTP + WebSocket. Must stay responsive; does almost no work itself. | WS connection count, or webhook ingest latency |
| `worker` | All game logic, all outbound Kick calls, all scheduled jobs. | Queue depth |

**Why a modular monolith and not microservices:** you are solo. Every service boundary you add is a deployment, a health check, a network hop, and a debugging session at 2am. The module boundaries below are enforced in code — separate packages with explicit interfaces — so extracting a service later is a build-config change, not a rewrite. Take that option when you need it, not before.

**WebSocket caveat on PaaS:** the moment you run more than one `web` instance, overlay sockets land on arbitrary instances. Use Redis pub/sub as the broadcast backplane from day one (`@socket.io/redis-adapter` or your own thin layer over `ws`). Retrofitting this after you scale is painful; adding it now is twenty lines.

---

## 3. The Game Module contract

This is the most important interface in the system. Get it right and everything else is plumbing.

```ts
export interface GameModule<TState, TConfig, TEvent> {
  /** Stable identifier, never changes: 'bonus-hunt' */
  readonly id: string;
  /** Bump when TState shape changes; drives migration on load */
  readonly stateVersion: number;
  readonly displayName: string;
  readonly description: string;

  /** Streamer-facing settings, validated + rendered as a form automatically */
  readonly configSchema: z.ZodType<TConfig>;

  /** Commands this game listens for. Streamers may override the keyword. */
  readonly commands: CommandSpec[];

  /** Which Kick events this game needs. Drives webhook subscription scope. */
  readonly subscriptions: KickEventType[];

  /** Pure. No I/O. No Date.now(). No randomness except via ctx.rng. */
  initialState(config: TConfig, ctx: InitContext): TState;

  /** Pure. The heart of the system. */
  reduce(
    state: TState,
    event: TEvent,
    ctx: ReduceContext<TConfig>
  ): ReduceResult<TState>;

  /** What the overlay renders. Strips anything viewers shouldn't see. */
  project(state: TState): OverlayState;
}

export interface ReduceResult<TState> {
  state: TState;
  effects: Effect[];   // returned as data, executed by the runtime
}

export type Effect =
  | { kind: 'chat';      text: string; replyTo?: string; priority: Priority }
  | { kind: 'broadcast'; patch: unknown }         // to overlay
  | { kind: 'timer';     inMs: number; event: unknown }
  | { kind: 'lookup';    query: string; then: unknown }  // async → re-enters reduce
  | { kind: 'persist';   record: unknown }
  | { kind: 'end' };
```

### Why the reducer is pure

Three payoffs, all of which you will feel within a month:

**Testable without Kick.** Feed a reducer an array of events, assert on final state. Your entire bonus hunt test suite runs in milliseconds with no network, no database, no OAuth. You can simulate a 500-viewer spam storm in a unit test.

**Replayable.** Because every event is appended to the log (§6), you can rebuild any session's state by re-running the reducer. A streamer reports "the hunt lost three entries at 11pm" — you replay their session locally and watch it happen.

**Crash-safe by construction.** Worker dies mid-hunt? The new worker replays the event log into the reducer and resumes exactly where it left off. No reconciliation logic, no "did that chat message actually send" ambiguity.

The rule that makes this work: **effects are returned, not performed.** A reducer never calls `sendChat()`. It returns `{ kind: 'chat', ... }` and the runtime decides whether to batch it, throttle it, or drop it because the streamer turned acks off. That is precisely the setting you asked for in the last message, and it lives in the runtime — every game inherits it for free.

### Async inside a pure reducer

Slot lookup is async, but the reducer can't await. Resolve this with a two-pass pattern:

```
!sr gates
  → reduce() sees an unresolved slot name
  → returns state with a pending entry + { kind: 'lookup', query: 'gates' }
  → executor calls the catalog service
  → result re-enters as a SlotResolved event
  → reduce() fills the pending entry, or emits the "did you mean" chat effect
```

The viewer sees their entry appear as pending on the overlay immediately, then firm up. Feels fast, stays pure.

---

## 4. The event pipeline

```
1. INGEST      POST /webhooks/kick
               ├─ verify Kick signature against their public key
               ├─ check Kick-Event-Message-Id against Redis (24h TTL) → drop dupes
               ├─ enqueue raw payload to BullMQ
               └─ return 200 (target: <50ms, hard ceiling 2s)

2. NORMALISE   worker: KickEvent → InternalEvent
               unified shape across all Kick event types

3. ROUTE       broadcaster_user_id → active session?
               no session → drop (cheapest possible path, this is most traffic)

4. PARSE       message text → command? (only for chat.message.sent)
               resolve keyword against session's command registry

5. GUARD       ordered, fail fast:
               session accepting entries? → command enabled?
               → role gate (sub/follower/mod) → per-user cooldown
               → per-user entry cap → global entry cap

6. REDUCE      game.reduce(state, event, ctx) → { state, effects }

7. COMMIT      append event to session_events (Postgres)
               write new state to Redis
               both in one logical step; log is the source of truth

8. EXECUTE     effects dispatched:
               chat      → outbound queue (batched, throttled, per-channel bucket)
               broadcast → Redis pub/sub → WS → overlay
               timer     → BullMQ delayed job
               lookup    → catalog service → re-enters at step 2
```

Step 3 deserves emphasis. **Most webhook traffic is not a command.** On a busy stream, 95%+ of `chat.message.sent` deliveries are ordinary conversation. Make the "no active session" and "not a command" paths the fastest code in the system — a Redis hash lookup and a single character check on the first byte. Everything expensive happens after those two gates.

---

## 5. Kick integration layer

Isolated in `packages/kick`. Nothing outside this package knows Kick exists.

### 5.1 Auth service
PKCE flow, token exchange, automatic refresh ahead of the 3600s expiry. **Encrypt refresh tokens at rest** (libsodium sealed box, key in the platform's secret store — not in Postgres, not in the repo). A leaked refresh token means someone can post to a streamer's chat as them; treat it like a password.

### 5.2 Subscription manager — the quota guard

Per our earlier finding, unverified apps have a **daily webhook delivery cap** and raising it requires petitioning Kick Engineering. So:

- Subscribe to `chat.message.sent` **when a session starts**, unsubscribe **when it ends**
- Never hold standing chat subscriptions on idle channels
- Subscribe only to the event types the active game declares in `subscriptions`
- Reconcile on boot: list Kick's subscriptions, drop orphans from crashed sessions
- Track daily delivery volume per channel; surface it on your admin dashboard so you see the ceiling approaching instead of hitting it

Start the verified-app application before launch. That issue thread suggests the turnaround is slow.

### 5.3 Webhook receiver
Signature verification, replay-window rejection on the timestamp header, idempotency on message id. Return 200 fast and unconditionally on any *valid* payload you've accepted — a 500 triggers redelivery and burns quota twice.

### 5.4 Chat sender
- One outbound worker per channel, token bucket at ~1 msg/sec
- Batching window (5–10s) coalescing queued messages into one ≤500 char write
- `reply_to_message_id` threading for per-viewer responses
- Priority lanes: errors/corrections beat batched summaries
- 429 → respect `Retry-After`, exponential backoff, circuit break after repeated failure
- Vary text on repeated identical messages (Kick's anti-spam drops duplicates)
- Respect the streamer's ack setting: `off` / `errors only` / `batched` / `all`

---

## 6. Data model

### Postgres — source of truth

```
users               kick_user_id, display_name, created_at
oauth_tokens        user_id, access(enc), refresh(enc), scopes, expires_at
channels            broadcaster_user_id, slug, owner_user_id

game_sessions       id, channel_id, game_id, state_version,
                    config(jsonb), status, overlay_token,
                    started_at, ended_at

session_events      id BIGSERIAL, session_id, seq, type,
                    payload(jsonb), kick_message_id, created_at
                    UNIQUE(session_id, seq)
                    UNIQUE(session_id, kick_message_id)   ← idempotency

session_snapshots   session_id, seq, state(jsonb), created_at
                    (every N events, so replay isn't O(all events))

game_configs        channel_id, game_id, config(jsonb), commands(jsonb)
                    per-streamer overrides incl. custom keywords

slots               id, name, provider, rtp, max_win, volatility, thumbnail
slot_aliases        slot_id, alias, source(manual|learned), weight
```

### Redis — hot path only, always reconstructible

```
session:{id}:state          current projected state (JSON)
channel:{id}:session        active session id  ← step-3 lookup
dedupe:{kickMessageId}      24h TTL
cooldown:{session}:{user}   per-viewer command cooldown
bucket:chat:{channel}       token bucket
bull:*                      queues
```

**Nothing lives only in Redis.** If Redis is wiped, every session rebuilds from `session_snapshots` + `session_events`. This is what makes a managed Redis on a PaaS acceptable rather than terrifying.

### On event sourcing

This is event-sourcing-lite and it is worth the modest cost here specifically because gambling streamers will dispute outcomes. When someone claims the giveaway picked wrong or their slot request vanished, "let me replay your session" is a complete answer. Full CQRS is overkill; an append-only log plus periodic snapshots is not.

---

## 7. Command routing

Per-session registry assembled at session start from the game's `commands` merged with the streamer's overrides:

```ts
interface CommandSpec {
  id: string;                    // 'submit-slot'
  defaultKeyword: string;        // '!sr'
  aliases?: string[];
  args: ArgSpec[];               // rest-of-line, integer, enum…
  scope: 'viewer' | 'mod' | 'broadcaster';
  cooldownMs?: number;
  maxPerUser?: number;
}
```

Streamer overrides let one person run `!sr` and another `!slot` for the same underlying command. The game module never learns which keyword was used — it receives `{ commandId: 'submit-slot', args: ['gates'] }`.

Guards run in a fixed order, cheapest first, and each returns either `pass` or a rejection carrying a chat-effect template. Rejections are where your "only speak when useful" policy pays off — the guard layer is the single place that decides whether a rejection reaches chat.

---

## 8. Overlay & realtime

- Browser source URL: `https://overlay.streamarena.gg/s/{sessionId}?t={overlayToken}` — opaque token, per session, revocable. Never a cookie; OBS won't have one.
- On connect: server sends a **full snapshot**. After that, **patches**.
- Client keeps a sequence number; a gap triggers a resync request. This is essential — OBS browser sources drop and reconnect constantly and a diff-only stream desyncs silently.
- Each game ships its own overlay bundle, code-split and loaded by `game_id`. Shared primitives (animations, sound, layout, theming) live in a common package so game #9's overlay isn't built from scratch.
- Overlay state comes from `project(state)`, never raw state — so a predictions game can hold hidden outcomes without leaking them to a viewer who opens devtools on a stream-visible URL.

---

## 9. Adding game #7

The test of whether this architecture works. To add a new game:

```
packages/games/wheel-spin/
  index.ts       ← implements GameModule
  state.ts       ← TState, TConfig types
  commands.ts    ← CommandSpec[]
  overlay/       ← React bundle
  __tests__/
```

Then register it. That's the entire integration.

**Zero changes** to the webhook layer, command parser, chat sender, session manager, database schema, overlay transport, or dashboard. The dashboard renders its settings form from `configSchema` automatically.

If adding a game ever requires touching core, that's a signal the contract is missing an abstraction — fix the contract rather than special-casing the game. This discipline is the entire return on building the runtime first.

---

## 10. Repository structure

```
streamarena/
├── apps/
│   ├── web/           Fastify: HTTP, WS, webhooks, OAuth
│   ├── worker/        BullMQ consumers, effect executor
│   ├── dashboard/     Next.js streamer UI
│   └── overlay/       React overlay host + per-game bundles
├── packages/
│   ├── core/          GameModule contract, effects, registry
│   ├── kick/          OAuth, webhooks, chat sender, subs manager
│   ├── catalog/       slot search, fuzzy matching, alias learning
│   ├── db/            Drizzle schema, migrations, repositories
│   ├── games/
│   │   ├── bonus-hunt/
│   │   ├── slot-battle/
│   │   └── …
│   └── shared/        types shared with overlay + dashboard
└── docker-compose.yml (local Postgres + Redis only)
```

Turborepo or pnpm workspaces. The `packages/games/*` boundary is what keeps game logic from leaking into core — enforce it with an ESLint rule banning imports from `apps/*` inside `packages/games/*`.

---

## 11. Scaling path

| Stage | Trigger | Action |
|---|---|---|
| 1 | Launch | 1 web + 1 worker, managed PG + Redis |
| 2 | Queue depth grows | Scale worker instances (already stateless) |
| 3 | WS count grows | Scale web; Redis adapter already in place |
| 4 | Webhook ingest spikes | Split ingest into its own tiny service — it shares nothing |
| 5 | Catalog search hot | Extract catalog service; it's already a clean interface |
| 6 | Real scale | Partition sessions by channel across workers |

Each step is independent and reversible. You are not committing to any of them now.

---

## 12. Build order

1. **Runtime skeleton** — GameModule contract, registry, reducer harness, in-memory event loop. No Kick, no DB. Prove the model with a trivial test game.
2. **Kick auth + webhook ingest** — OAuth flow, signature verification, dedupe, subscription lifecycle. Verify against a real channel.
3. **Persistence** — event log, snapshots, Redis projection, crash recovery. Kill the worker mid-session and watch it resume.
4. **Chat sender** — batching, throttle, ack settings, 429 handling.
5. **Overlay transport** — snapshot/patch, reconnect, resync.
6. **Bonus hunt** — the first real game. Should feel almost anticlimactic.
7. **Slot catalog** — the hard one. Ship hunt with exact-match first; layer fuzzy matching behind the same interface.
8. **Dashboard** — session control, config forms, history.
9. **Game #2** — the real validation. If it takes days rather than weeks, the architecture is sound.

Note that bonus hunt is step 6, not step 1. That ordering is deliberate and it is the single most valuable thing in this document.

---

## 13. Risk register

| Risk | Impact | Mitigation |
|---|---|---|
| Webhook daily cap hit mid-stream | Game dies live | Session-scoped subs, quota telemetry, verified-app application filed early |
| Kick API breaking change | Platform down | All Kick contact isolated in `packages/kick`; contract tests against real endpoints |
| Slot name matching poor | Product feels broken | Alias table + learned aliases from mod corrections; "did you mean" fallback |
| Redis loss | Sessions drop | Full rebuild from event log; test this deliberately |
| Chat ack spam / rate limit | Bot silenced | Batching + priority lanes + per-streamer setting |
| Overlay desync | Streamer shows stale data | Sequence numbers + snapshot resync on gap |
| Token leak | Impersonation | Encrypted at rest, minimal scopes, rotation, per-session overlay tokens |
| Regulatory scope creep | Licensing exposure | Keep a hard line: no real-money stakes, no wagering, tracking and engagement only |

---

## 14. What this architecture deliberately does not include

- **Microservices** — premature for a solo build; boundaries are in code instead
- **Kubernetes** — PaaS handles your scale for a long time
- **A message broker beyond Redis/BullMQ** — Kafka solves problems you don't have
- **Full CQRS** — the event log gives you the useful 80%
- **Multi-region** — every streamer is latency-tolerant at the ~1s scale you're operating in

Each of these is a deliberate deferral, not an oversight. Revisit when a specific measured problem demands it.
