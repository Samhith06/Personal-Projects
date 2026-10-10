# StreamArena — Game Specifications

Detailed rules, state, and chat interactions for the first three games.

Each game implements the `GameModule` contract from `StreamArena-Architecture.md`: it owns state and rules, and nothing else. No game touches Kick, the database, or the overlay transport directly.

**v1 rewards are bragging rights only** — winners are announced on the overlay and in chat. No points ledger, no cross-session balances, no stakes.

---

## Game 1 — Bonus Hunt (with Guess the Balance)

### Concept

The streamer sets aside a balance and plays slots until they've collected a target number of bonuses. Viewers suggest which slots to play. Once the list is locked, viewers guess what the final balance will be after every bonus is opened. Then the bonuses get opened one by one and the guess closest to the true final balance wins.

Guess the Balance is what turns a bonus hunt from something viewers *watch* into something they're *invested in* — every single bonus opening now matters to every viewer who guessed, not just the streamer.

### Phases

```
COLLECTING → GUESSING → OPENING → COMPLETE
```

| Phase | What happens | Chat can |
|---|---|---|
| **Collecting** | Streamer plays slots, banks bonuses. Viewers suggest slots. | `!sr <slot>` |
| **Guessing** | Collection closed, full list visible. A countdown window opens for guesses. | `!guess <amount>` |
| **Opening** | Guesses locked. Streamer opens each bonus and enters the win. | *(watching)* |
| **Complete** | Final balance known. Winner announced. | — |

**Why guessing sits between collecting and opening:** viewers need the finished slot list and the break-even figure to make an informed guess. Opening guesses during collection means guessing blind, which makes the winner arbitrary rather than skilful.

The guessing window is streamer-configurable, default **3 minutes**, with a manual "lock now" override. The countdown is prominent on the overlay — it's a natural hype moment and a good time for the streamer to talk through the list.

### Chat commands

| Command | Who | Rules |
|---|---|---|
| `!sr <slot name>` | Viewers (gated) | One entry per viewer by default; cooldown; resolves against the slot catalog |
| `!guess <amount>` | Viewers | One guess per viewer, **editable until lock** (last guess counts) |
| `!hunt` | Viewers | Bot replies with current status — rate-limited to one reply per 60s per channel, batched |
| `!myslot` | Viewers | Bot confirms what that viewer submitted |
| `!close` / `!lock` | Streamer, mods | Advance phase manually |
| `!remove <n>` | Mods | Remove a bad entry |

**Guess validation:** must parse as a positive number. Strip currency symbols, commas, spaces, and `k`/`K` suffixes (`!guess 6.5k` → 6500). Reject anything above a sanity ceiling (default 100× the starting balance) — otherwise someone guesses one billion "for the meme" and it clutters the list without ever being close.

### Winner rule

**Closest in either direction**, by absolute difference from the final balance.

**Tiebreak:** earliest submitted guess wins. Deterministic, requires no randomness, and rewards committing early — which is exactly the behaviour you want.

If nobody guessed, skip the announcement entirely rather than showing an empty winner card.

### State

```ts
type BonusHuntState = {
  phase: 'collecting' | 'guessing' | 'opening' | 'complete'
  currency: 'EUR' | 'USD' | 'GBP'
  startBalance: number
  targetBonuses: number

  entries: {
    id: string
    slotId: string | null          // null while unresolved
    rawText: string                // what the viewer actually typed
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
    submittedAt: number            // sequence number, not wall clock
  }[]

  guessWindowEndsAt: number | null
  guessesLocked: boolean

  totals: { spent: number; won: number }
  winner: { userId; username; amount; difference } | null
}
```

### Derived values (computed, never stored)

```
spent            = startBalance − balanceAtEndOfCollection
breakEvenPerBonus = spent / entries.length
currentBalance   = totals.won
profit           = totals.won − spent
returnMultiple   = totals.won / spent
remainingBonuses = entries.filter(e => e.status !== 'opened').length
```

`breakEvenPerBonus` is the emotional centre of the whole game. It should be the largest number on the overlay during collection.

### Edge cases

| Situation | Behaviour |
|---|---|
| Streamer removes an entry after guesses lock | Allowed. Guesses stand — the hunt changed, that's part of the risk |
| Duplicate slot in the list | Allowed (different bet sizes are normal). Duplicate *request from the same viewer* is blocked |
| Viewer guesses twice | Last guess replaces the first, silently |
| Hunt abandoned mid-way | No winner declared, session saved as incomplete |
| Zero guesses submitted | Skip the winner card |
| Two guesses equidistant above and below | Earlier submission wins |
| Streamer mistypes a win | Editable until the session completes |

---

## Game 2 — Slot Tournament

> **Terminology note:** below, "streamer" means the person running the session. In the architecture and UI docs, "admin" refers to you as the platform operator — a different role with a different panel.

### Concept

Viewers claim a slot in chat with `!join <slot>`. From everyone who joined, **8, 12, or 16 seats** are filled — some hand-picked by the streamer, the rest drawn at random. Those slots seed a knockout bracket where **each slot belongs to a viewer**.

Each match, the streamer buys a bonus on both slots and enters what it cost and what it paid. The higher multiplier advances, computed automatically. Meanwhile the whole chat — selected or not — predicts every match.

The session ends with **two winners**: the viewer whose slot took the bracket, and the viewer who called the most matches correctly.

Tying slots to people is what makes this work. A bracket of slots is a spreadsheet; a bracket of *viewers* is a tournament, and every eliminated player is a real moment. Crucially, the prediction layer keeps the other several hundred viewers invested even though only 16 got a seat.

### Phases

```
JOINING → DRAW → SEEDING → [ VOTING → PLAYING → ADVANCE ] × matches → COMPLETE
```

### Joining

`!join <slot name>`

| Rule | Behaviour |
|---|---|
| One entry per viewer | Second `!join` replaces the first while the window is open |
| **Slots are unique** | First come, first served. A slot already claimed is rejected |
| Slot must resolve | Unresolvable names go to the unresolved queue for the streamer or a mod to fix |
| Optional gating | Anyone / followers / subscribers only |
| Window | Manual close, or countdown (default 5 minutes) |

The pool is uncapped — hundreds of joiners is fine, it's just a list.

**The duplicate rejection must reach chat.** If a viewer's `!join` is silently dropped because someone claimed that slot two seconds earlier, they'll sit there believing they're entered and find out only when the draw passes them by. This is exactly the case the errors-only ack policy exists for:

> ↳ @viewer Gates of Olympus is already claimed by @slotgoblin — pick another slot.

### The draw

Seats: **8, 12, or 16**.

1. **Reserved seats** — the streamer hand-picks any number of entrants from the pool, searching by username. This is how a smaller or newer viewer gets a guaranteed shot instead of being drowned out by a hundred other joiners.
2. **Random fill** — remaining seats are drawn from everyone else who joined, using the session seed so the draw is reproducible on replay.

**Label reserved picks visibly on the overlay** — a "Streamer's pick" badge. Hiding them is far worse than showing them: a bracket that quietly contains hand-chosen entrants alongside a supposedly random draw will eventually get noticed, and "the draw is rigged" is a very hard accusation to walk back. Shown openly, it reads as generosity instead.

**Make the draw an on-stream moment.** Names cycling and landing one seat at a time, with a beat between each, is free hype and costs you one animation. Filling a list silently wastes the single most anticipated moment of the session.

### Bracket structure and byes

| Seats | Bracket | Byes | Rounds | Real matches |
|---|---|---|---|---|
| 8 | 8 | 0 | 3 | 7 |
| 12 | 16 | 4 | 4 | 11 |
| 16 | 16 | 0 | 4 | 15 |

With 12 entrants, four players skip round one. Assign byes by seeded random draw and mark them clearly as **BYE** on the overlay — an unexplained gap reads as a bug.

Narratively, frame round one of a 12-player bracket as a **play-in round**: eight players fighting for four spots while four wait. Easier for the streamer to explain and it gives round one its own identity.

### Match resolution

The streamer enters four numbers per match:

```
Slot A:  buy cost  €100    payout  €425     →  4.25x
Slot B:  buy cost  €200    payout  €610     →  3.05x
                                    Slot A advances
```

**Winner is the higher multiplier — payout ÷ buy cost.**

This is the right metric because bonus buy costs vary enormously between slots (100× bet to 500× bet is a normal range). Ranking by raw payout would mean the most expensive buy wins almost every time, and viewers would learn within one session to only ever join with the priciest-buy slot. Multiplier is also the number slot viewers already think and talk in.

Show **both multipliers large** on the overlay, with cost and payout smaller beneath. The multiplier is the verdict; the raw figures are supporting evidence.

**Tiebreak ladder** — ties are common, especially when both bonuses die:

1. Higher raw payout
2. Lower buy cost (better value for the same return)
3. Seeded coin flip — derived from session seed + match id

Two dead bonuses both paying €0 is a real and frequent case: 0.00× vs 0.00×, equal payouts, so it resolves on lower buy cost and then the coin flip. The overlay should say explicitly when a match was decided by coin flip.

**Validation:** buy cost must be greater than zero. Payout may be zero. Reject a zero cost rather than dividing by it.

### Predictions

| Command | Notes |
|---|---|
| `!vote a` / `!vote b` | One vote per match, changeable during the window, locked when the match starts |
| `!vote <slot name>` | Alternative form, fuzzy-matched against the two contenders only |
| `!bracket` | Current standings, batched reply |
| `!score` | That viewer's prediction record |

Voting window default **60 seconds**, with a manual "start match" override. The overlay shows the live A/B vote split as a bar while the window runs — watching the split swing is its own entertainment, and it gives the streamer something to react to.

**Participants may vote on their own matches.** They'll back themselves, they'll usually be wrong half the time, and stopping them isn't worth the special case.

**Scoring:** +1 per correct pick. Leaderboard ties break on accuracy percentage, then on earliest join.

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
    userId: string
    username: string
    role: 'viewer' | 'follower' | 'subscriber' | 'mod'
    slotId: string
    slotName: string
    provider: string
    joinedAtSeq: number
  }[]

  reservedUserIds: string[]        // streamer's hand-picks

  entrants: {
    userId: string
    username: string
    slotId: string
    slotName: string
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
      decidedBy: 'multiplier' | 'payout' | 'cost' | 'coinflip' | 'bye' | null
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

### Overlay

**Join phase** — a live joiner count as the hero number, a scrolling feed of recent joins (username + slot thumbnail), and a persistent footer: "Type !join <slot> to enter". The count climbing is the whole visual.

**Draw** — full-frame takeover. Seats fill one at a time with a cycling-name animation, reserved picks badged.

**Match card** — the focus, and now built around people rather than slots. Each side shows the viewer's username prominently, then the slot thumbnail and name, then cost and payout, then the multiplier as the largest figure. Live vote split bar between them.

**Bracket minimap** — small, corner-anchored, structural only. Filled and empty nodes, no readable text.

**Between rounds** — five-second full-bracket takeover, readable because it owns the frame.

**Result** — champion viewer with their slot, then the top predictor.

### Chat announcements

Three moments, all respecting the stream-delay setting.

**Draw complete** *(optional, on by default)*
> Tournament locked in! 12 entrants: @slotgoblin, @kickfan92, @bonusbandit, … Predictions open now — type !vote a or !vote b each round.

Sixteen usernames plus slot names will overflow 500 characters. Announce usernames only, and if it still overflows, truncate with "…and 4 more — full bracket on screen."

**Champion**
> @slotgoblin wins the tournament! Gates of Olympus took the final at 4.25x against @kickfan92's Le Bandit at 3.05x.

**Top predictor** *(≈4 seconds later)*
> Best predictor: @bonusbandit with 9/11 matches called correctly.

Two separate messages, not one. The bracket winner and the prediction winner are different achievements for different people, and merging them buries both.

### Edge cases

| Situation | Behaviour |
|---|---|
| Fewer joiners than seats | Offer the next size down, or let the streamer fill remaining seats manually |
| Selected viewer's slot won't resolve | Remove from entrants, redraw that seat before locking |
| Selected viewer leaves or is banned mid-tournament | Their slot still plays and can still win — the entry stands |
| Streamer mistypes cost or payout | Editable until the winner advances; afterwards requires an explicit "revert match" |
| Match reverted | Votes restored and scores recalculated from the event log |
| Both bonuses pay zero | Resolves down the tiebreak ladder; overlay states how it was decided |
| Buy cost entered as zero | Rejected at input with an inline error |
| Streamer abandons mid-bracket | Session saved incomplete; prediction leaderboard still recorded and announced |
| Nobody votes on a match | Match proceeds, nothing scored |

## Game 3 — Bonus Bingo

### Concept

A single 5×5 bingo card lives on the overlay, shared by the whole chat. Each square is a condition — "a bonus pays 100×+", "a Pragmatic slot pays under 10×", "back-to-back 50× wins". As the streamer opens bonuses, squares mark themselves automatically. When a line completes, a viewer has to **call it** in chat to win.

Everyone watches one card together, which is exactly what makes it work on stream. No viewer ever leaves the broadcast, and the card becomes a shared object chat talks about for the whole session.

### The calling mechanic

This is the design decision that makes shared-card bingo actually a game rather than a passive graphic.

Squares mark themselves as conditions are met. But a completed line **does not win on its own** — a viewer must type `!bingo` while it stands. First correct caller wins.

That single rule does a lot of work:

- Chat has to actually watch the card, not just the slots
- It creates a race, and races generate chat volume
- It costs zero per-viewer state — just a short cooldown
- A false call (`!bingo` with no line complete) earns a 30-second cooldown, so spamming it pre-emptively is a losing strategy

Make it optional (`auto-complete lines` setting) for streamers who'd rather it just run itself.

### Square types

Cards are generated from a weighted pool at session start. Each square carries a machine-evaluable rule:

**Multiplier bands** — *auto*
`{ kind: 'multiplier', min: 50, max: 100 }` → "A bonus pays 50×–100×"

**Threshold** — *auto*
`{ kind: 'multiplier', min: 200 }` → "A bonus pays 200×+"

**Dead bonus** — *auto*
`{ kind: 'multiplier', max: 5 }` → "A bonus pays under 5×"

**Provider** — *auto*
`{ kind: 'provider', provider: 'Pragmatic Play', min: 100 }` → "A Pragmatic bonus pays 100×+"

**Specific slot** — *auto*
`{ kind: 'slot', slotId: 'gates-of-olympus', min: 100 }`

**Streak** — *auto*
`{ kind: 'streak', count: 3, max: 20 }` → "Three bonuses in a row under 20×"

**Aggregate** — *auto*
`{ kind: 'aggregate', totalMin: 5000 }` → "Total wins pass €5,000"

**Chat-linked** — *auto*
`{ kind: 'viewer-requested', min: 100 }` → "A viewer-requested slot pays 100×+"

**Manual** — *streamer or mod clicks*
"A retrigger" · "Max win" · "A wild line" — events the system can't observe from a win figure alone

Keeping rules as **data rather than code** is what lets you add square types later without touching the reducer, and it keeps card generation reproducible.

### Card generation

- Centre square is **free**, pre-marked
- Seeded from the session seed so the card is reproducible on replay
- Weighted for a difficulty mix: roughly 8 easy, 12 medium, 4 hard per card
- No duplicate rules on one card
- **Reject mutually exclusive pairs** — a card containing both "no bonus pays over 200×" and "a bonus pays 500×+" is unwinnable in one direction and confusing in the other
- Scale thresholds to the streamer's configured bet size, or the whole card is trivially easy or impossible depending on their stake level

That last point matters more than it looks. A card built for €2 spins is meaningless for a streamer playing €20 spins. Take bet size as a setup input and scale every multiplier band from it.

### Chat commands

| Command | Who | Rules |
|---|---|---|
| `!bingo` | Viewers | Claims a completed line. First valid call wins. False call → 30s cooldown |
| `!card` | Viewers | Bot replies with marked count and closest line, batched |
| `!mark <square>` | Streamer, mods | Marks a manual square |
| `!unmark <square>` | Streamer, mods | Corrects a mistake |

### Win conditions

Configurable at setup:

- **First line** — any row, column, or diagonal (default, shortest game)
- **Two lines** — longer, sustains a full session
- **Blackout** — all 24 squares, for marathon streams

Multiple lines completing at once is normal and fine — the caller wins on whichever line was standing when they called.

### State

```ts
type BingoState = {
  phase: 'active' | 'complete'
  seed: string
  winCondition: 'line' | 'two-lines' | 'blackout'
  requireCall: boolean

  card: {
    id: string
    position: number              // 0–24
    label: string                 // human text shown on overlay
    rule: SquareRule | 'free' | 'manual'
    marked: boolean
    markedAtSeq: number | null
    markedBy: 'auto' | 'manual' | null
  }[]

  bonuses: {
    slotId: string
    slotName: string
    provider: string
    bet: number
    win: number
    multiplier: number
    requestedBy: string | null
    seq: number
  }[]

  completedLines: { type: 'row'|'col'|'diag'; index: number; atSeq: number }[]
  calls: { userId, username, atSeq, valid: boolean }[]
  winner: { userId, username, line } | null
}
```

### Evaluation order

Every time a bonus result is entered, the reducer must run in this exact order:

1. Append the bonus to `bonuses`
2. Re-evaluate **every** unmarked auto square against the full history — not just the new bonus, because streak and aggregate rules depend on the sequence
3. Recompute completed lines
4. If `requireCall` is false and the win condition is met → complete
5. Emit effects: overlay patches for newly marked squares, and a chat message if a line just opened up

Step 2 is the one people get wrong. Evaluating only against the newly-entered bonus silently breaks every streak and aggregate square.

### Edge cases

| Situation | Behaviour |
|---|---|
| Square marked in error | Mod unmarks; completed lines recompute; any pending win is revoked |
| Two viewers call in the same second | Earlier sequence number wins — the event log is ordered, so this is unambiguous |
| Line completes and nobody calls | Line stays live indefinitely. Optional 5-minute auto-award setting |
| False `!bingo` calls flooding | 30s per-user cooldown; failed calls never reach chat |
| Card becomes unwinnable | Streamer can regenerate the card, which resets marks and restarts the game |
| Session ends with no bingo | No winner; card state saved for history |

---

## Cross-cutting — what these three games reveal

Designing three games at once surfaces the shared primitives. Build each of these **once, in `packages/core`**, not three times inside three game modules:

**1. Timed submission window**
Slot requests, guesses, tournament joins, match voting, and bingo calls all need the same thing: open a window, accept one submission per viewer, allow edits until lock, count down on the overlay, lock, resolve. One component, five uses.

**2. Entry pool and draw**
Tournament joining needs it now: collect an uncapped pool of viewer entries, let the streamer reserve seats manually, fill the rest by seeded random draw, and animate the reveal. Giveaways and raffles are the same mechanic with a different prize — build it once and the giveaway game is nearly free.

**3. Closest-value resolution**
Guess the Balance needs it now. Guess the Multiplier and Community Goals will need it later. Absolute difference, earliest-submission tiebreak.

**4. Streamer result entry**
Every one of these games is fundamentally the streamer typing numbers in while playing — hunt wins, buy cost and payout, bonus results. One well-designed inline entry component with fast keyboard input, undo, and edit-in-place serves every game you'll ever build, and it's the control the streamer touches most.

**5. Prediction scoring**
Per-viewer correct/total tracking, leaderboard with tiebreaks, top-scorer announcement. Tournament needs it now; predictions and guess-the-multiplier reuse it wholesale.

**6. Winner announcement**
Overlay takeover, delayed chat message, history record. Identical shape across all three, and the tournament needs two of them.

Build these six while implementing the first two games and the rest of the catalog becomes mostly rules and overlay work. That's the plugin architecture paying off in practice.

### Build order

**Bonus Hunt → Slot Tournament → Bonus Bingo.**

Hunt establishes the submission window, closest-value resolution, result entry, and the slot catalog dependency. Tournament is the biggest single build of the three — it adds the entry pool and draw, prediction scoring, bracket logic with byes, and the most complex overlay — but almost everything it adds is reusable. Bingo goes last because its rule DSL and card generation are genuinely new machinery, and it's the least dependent on anything else.

### Deliberately deferred

- **Points and leaderboards across sessions** — needs a ledger and anti-abuse work; a whole system, not a feature
- **Per-viewer bingo cards** — breaks the never-leave-the-stream principle; revisit only if streamers ask
- **Double-elimination or group-stage tournaments** — single-elimination first; the bracket engine can grow later
- **Real prizes handled by the platform** — never. Streamer-announced prizes settled off-platform only

---

## Winner announcements in Kick chat

Expands shared primitive #4. Every game ends by announcing its winner in chat.

### This is a different class of message from an ack

The "errors only" policy from earlier governs **acks** — per-request responses to individual viewers. A winner announcement is not an ack. It's a broadcast to the whole channel, it happens once per session, and it's the only way the winner actually finds out they won. It should be exempt from ack throttling and controlled by its own setting.

| | Ack | Announcement |
|---|---|---|
| Audience | One viewer | Whole channel |
| Delivery | Threaded reply (`reply_to_message_id`) | **Top-level message** |
| Frequency | Many per session | Once or twice per session |
| Governed by | Ack setting (off / errors / batched / all) | Separate "Announce winners" toggle, **on by default** |
| Priority | Batched, low | Priority lane, bypasses batching |

Top-level rather than threaded matters. Threading the announcement to the winner's original guess message buries it — that message may be thousands of lines up in chat, and a reply renders as a response to one person rather than news for everyone.

### The stream-delay problem

**Post the announcement the instant the game resolves and you spoil your own reveal.**

The overlay is composited into the video stream, so viewers see it on Kick's delay — typically 5–15 seconds behind real time. Chat messages arrive in near real time. So a chat announcement fired at the moment of resolution reaches viewers *before* they see the overlay reveal animation. Chat reads "@viewer won with €6,750" while the overlay is still counting up to the final balance.

**Fix:** a configurable announcement delay, default **12 seconds**, applied between the overlay reveal and the chat write. Expose it in settings as "Stream delay" with a plain-language hint — "How many seconds behind is your stream? We'll hold chat announcements this long so they don't spoil your overlay." Streamers know their own delay, and the ones running low-latency mode will want it near zero.

This applies to any dramatic reveal, not just winners — bingo line completions and tournament match results have the same problem.

### Message templates

Templates are per game, editable by the streamer, with token substitution. All comfortably inside the 500-character limit.

**Bonus Hunt — result**
```
Hunt complete! {startBalance} → {finalBalance} ({profit}).
Best slot: {bestSlot} at {bestMultiplier}x
```
> Hunt complete! €5,000 → €6,720 (+€1,720). Best slot: Gates of Olympus at 214x

**Guess the Balance — winner**
```
{winner} wins Guess the Balance! Final was {finalBalance} —
guessed {guess}, off by {difference}. {totalGuesses} players entered.
```
> @slotgoblin wins Guess the Balance! Final was €6,720 — guessed €6,750, off by €30. 247 players entered.

**Slot Tournament — champion**
```
{champion} wins the tournament, beating {runnerUp} in the final!
Top predictor: {topPredictor} with {correct}/{total} correct.
```
> Sweet Bonanza wins the tournament, beating Le Bandit in the final! Top predictor: @kickfan92 with 6/7 correct.

**Bonus Bingo — winner**
```
{winner} called BINGO! {lineDescription} completed on
{triggeringSlot} paying {multiplier}x. {markedCount} squares marked.
```
> @bonusbandit called BINGO! Middle row completed on Gates of Olympus paying 214x. 18 squares marked.

**Available tokens** vary by game and should be listed in the settings UI next to the template field, so streamers editing a template can see what they're allowed to use.

### Sequencing

A completed bonus hunt produces two announcements — the hunt result and the guess winner. Send them as **two messages roughly 4 seconds apart**, result first.

One crammed message is cheaper but reads badly and buries the winner. The rate-limit argument doesn't apply here: this is twice per session, not twice per request. Spend the writes.

### Rules

- Use the username **captured at submission time**, stored alongside the user id. Kick usernames can change mid-session
- Announcements go through the **priority lane** and bypass the batching window entirely
- If the announcement fails (rate limited, channel in sub-only mode, bot restricted), retry twice with backoff, then log it and give up silently. The overlay already showed the result — a failed chat write is not worth escalating to the streamer mid-stream
- **No winner** (zero guesses, no bingo called, abandoned session) → send nothing. An announcement saying nobody won is worse than silence
- Announcements still fire when the ack setting is `off`, unless the separate announce toggle is also off

### Settings additions

Two new controls on the Chat bot settings tab:

- **Announce winners in chat** — toggle, on by default
- **Stream delay** — number input in seconds, default 12, with the plain-language hint above

Plus a per-game template editor with a live preview rendered as a mock Kick message, and available tokens listed beside it.
