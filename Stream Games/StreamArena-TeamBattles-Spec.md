# StreamArena — Game 4: Team Battles

**Status:** design, pre-build · **Revision 2** — teams named Chaos vs Fortune, colours picked against colour-vision simulation (§3) · **Revision 1** · **Depends on:** Slot Tournament (entry pool, seeded draw, result entry), Bonus Hunt (running totals, the hero number), Slot Bingo (committed-order doctrine, standby pool) · **Companion:** `StreamArena-TeamBattles-UI.md` · **Excluded by decision:** channel-point side betting (§17)

---

## 1. Concept

Viewers claim a slot in chat with `!join <slot>`. The streamer draws one entrant at a time. Before their slot is played, a coin flip decides which of two teams they are fighting for — **50/50, animated, and irreversible**. The streamer buys the bonus, enters what it cost and what it paid, and the resulting multiplier is banked into whichever team the coin gave them.

Pick after pick, two scoreboards climb. At the end, the stronger team wins and everyone on it wins with it.

That is the whole game, and its shape is deliberately different from the three that came before it. Bonus Hunt is one long collective number. Tournament is a bracket that cuts people out. Bingo is a shared board where you live and die by your own square. **Team Battles is the first game in the catalog where a viewer's result is carried by other people.** Your 0.4× doesn't eliminate you — it drags eleven teammates down with you, and one of them can still bail you out on the next pick. That is a materially different feeling from anything else in the catalog, and it is the reason this game is worth building rather than reskinning Tournament.

It is also the cheapest game in the catalog to build. There is no bracket, no board geometry, no line arithmetic. Structurally it is **a bonus hunt with two buckets and a coin flip**, and almost every primitive it needs already exists.

### What makes it work

Three things, in order of importance.

**The flip is a second dice roll layered on top of the first.** In every other game, drawing a viewer's name resolves their fate — they're in the bracket, they own C3. Here, being drawn is only half the event. The name lands, chat reacts, and *then* there's a second beat where the thing that actually matters gets decided. Two reveals per pick, on a mechanic that costs one animation.

**Allegiance is free to hand out.** Only ten or fifteen viewers get drawn in a session, but every single person watching can pick a colour and mean it. The overlay is two coloured bars, and every viewer in the channel is on one side of them. Tournament needed a whole prediction layer to give the unselected majority a stake; Team Battles gives it away in the premise.

**Nobody is ever mathematically dead until the end.** A team down 40× with four picks left is one bonus away. There is no eliminated state, no dead line, no bust. The comeback is always live, which means the overlay never stops being worth looking at.

---

## 2. The math trap, and why the win rule is an average

This is the decision the whole game hinges on, so it is stated up front — same as Bingo §2.

The obvious rule is "the team with the highest total multiplier wins." It is wrong, and the reason is that **team sizes are themselves random**. Assigning each pick by an independent coin flip does not produce two teams of equal size; it produces a binomial split that is lopsided far more often than intuition suggests.

Simulated over 400,000 sessions:

| Picks | Teams end even | Size gap ≥ 4 | Size gap ≥ 6 | Mean size gap |
|---|---|---|---|---|
| 8 | 27.3% | 28.9% | 7.0% | 2.19 |
| 10 | 24.6% | 34.4% | 10.9% | 2.46 |
| 12 | 22.5% | 38.8% | 14.6% | 2.71 |
| 15 | — *(odd)* | 30.2% | 11.9% | 3.14 |
| 20 | 17.7% | 50.3% | 26.3% | 3.52 |

A ten-pick session lands **7–3 or worse a third of the time**. And when it does, a total-multiplier rule stops measuring anything about the slots:

> **Under total multiplier, the team that got more picks wins 80% of the time.**

That is not a competition, it is a report on the coin flips. So:

**Win rule: highest average multiplier per pick.** Team total ÷ team picks. Size-independent, immediately understandable ("Chaos are averaging 8.4× a bonus"), and it makes every single pick meaningful to its team rather than making the *count* of picks meaningful.

**Total multiplier and total cash are kept and displayed as secondary stats** — bragging rights, history records, clip captions. They just don't decide the session.

This choice is not cosmetic. Across the same simulation, **average and total disagree on the winner in roughly 19% of sessions** — one session in five, the metric you picked is the thing that chose the winner. Worth getting right before launch rather than after the first accusation.

### The whale problem, stated honestly

Average scoring has a known consequence and it should be designed with rather than papered over: in **86% of sessions, the single biggest multiplier of the night sits on the winning team.** One 180× on a five-person team moves that team's average by 36×, and nothing else in a normal session competes with that.

Three responses, and only the first two are recommended:

1. **Lean in.** This is a slots game. "One pull decided the whole thing" is not a bug in a slots game, it's the highlight clip. §8.2 turns it into a named, tracked award rather than an accident.
2. **Show it live.** The overlay makes it obvious that one big pull can flip the session (§9.3, the swing number), so the outcome never feels like it came out of nowhere.
3. **Trimmed mean** — drop each team's best result before averaging. Mathematically calmer, dramatically dead, and impossible to explain on stream in one sentence. Available as a config value, off by default, and probably nobody should use it.

### The balanced-bag alternative, and why it isn't the default

There is a way to guarantee equal teams: instead of flipping a coin per pick, pre-load a bag with *n*/2 chips of each colour and draw without replacement. Sizes come out perfectly even, and total multiplier becomes a legitimate win rule again.

It costs the thing the game is built on. As the bag empties, the flip stops being a flip:

| Picks | Mean picks with a forced (predetermined) result | Final pick forced |
|---|---|---|
| 10 | 1.65 (17% of the session) | **always** |
| 12 | 1.72 (14%) | **always** |
| 20 | 1.81 (9%) | **always** |

The last pick of the session — the most dramatic moment on the schedule, the one where a team can still steal it — has **zero suspense under a bag draw, in every single session, by construction.** Playing a five-second coin-flip animation whose outcome chat has already worked out is worse than playing no animation at all.

**Default is the honest 50/50 coin flip with average scoring.** Bag mode ships as `drawMode: 'bag'` for streamers who specifically want even teams, and when it's on, the overlay must show the remaining chips openly — a bag whose contents are secret while chat can count them anyway is the worst of both.

---

## 3. Team identity

**The two teams are CHAOS and FORTUNE.**

They need names that survive being shouted in chat, read at a glance in a 200px overlay bar, and turn into emotes. Chaos and Fortune do all three, and they carry a second advantage the alternatives don't: they name the two things this game is actually made of. Every pick is a coin flip you can't control and a bonus that either pays or doesn't. The teams are the premise.

| | CHAOS | FORTUNE |
|---|---|---|
| Colour | Electric violet `#B44BFF` | Gold `#FFC53D` |
| Glyph | ⚡ — angular, jagged, asymmetric | 🪙 — circular, closed, symmetric |
| Audio one-shot | A short discordant burst — detuned crash, static edge | A coin cascade resolving into a clean chime |
| Motion signature | Snaps, overshoots, settles late | Arrives smooth, eases in, lands square |

**Colour choice is not decoration here** — it was picked against colour-vision simulation, because the whole overlay is two colours telling you who's winning. Violet and gold separate further under every form of colour blindness than any of the thematically obvious pairs:

| Pair | Contrast on canvas | Greyscale separation | Worst-case CVD separation |
|---|---|---|---|
| **Violet / Gold** ← chosen | 5.0 / 12.3 | **2.80×** | 0.55 |
| Magenta / Emerald | 6.1 / 11.3 | 2.02× | 0.39 |
| Hot pink / Mint | 5.6 / 12.0 | 2.40× | **0.26** |
| Magenta / Gold | 6.1 / 12.3 | 2.22× | 0.44 |

The 2.80× greyscale ratio is the number that matters most: it means the two teams stay distinguishable on a monochrome capture, on a badly calibrated monitor, and to a viewer watching through a phone in daylight.

**One consequence for the app palette.** Chaos violet `#B44BFF` and the StreamArena app accent `#A855F7` (Master Spec §18) sit at **1.02:1 contrast** and 0.033 worst-case colour-blind separation — they are the same colour to a viewer. So **`--accent` is suppressed everywhere Team Battles renders**, dashboard included, and the primary action colour becomes neutral. Team colours own this game; the brand accent steps back entirely. This is the right outcome regardless of the measurement: the "Run the flip" button must not wear either team's colour.

**Glyph shape carries the same information as colour**, deliberately. Angular versus circular reads instantly at any size, in any colour mode, and it gives the animation team two distinct motion languages to work with (§6.3, §13).

### The one thing to watch

**"Fortune" sounds like the team you'd rather be on.** It means good luck; Chaos means things going wrong. Expect the crowd meter (§7) to skew toward Fortune, especially early, and don't read that skew as a signal about anything.

Two responses, and the first one is enough:

1. **Let it show.** A permanently lopsided crowd bar with Chaos winning on the scoreboard is a good picture, not a broken one — the underdog framing writes itself and the streamer will lean on it.
2. **Alternate which team is on the left** between sessions, seeded, so the naming bias isn't compounded by a reading-order bias. Cheap, and it costs nothing to do.

What is **not** a response is renaming, weighting, or balancing anything. The flip is 50/50 and the scoreboard doesn't know what the teams are called.

### Configurable, within limits

`teamAName` / `teamBName` and their colours are config, so a streamer with an established brand can run their own pair. What must **not** become configurable is the structure: exactly two teams, one colour each, high contrast, opposed glyph shapes. Three teams breaks the 50/50 flip, the two-column overlay, and side-picking all at once.

Alternatives worth offering as presets, all colour-checked: **Blaze / Frost** (`#FF4D2E` / `#2EC4FF` — maximum hue contrast, most literal), **Kraken / Phoenix** (deep purple / gold — closest to slot art conventions), **High / Low** (roulette-native, zero explanation, zero personality).

## 4. Phases

```
JOINING → [ PICK → FLIP → BUYING → RESULT ] × n → FINAL → COMPLETE
              ↑
   joins stay open throughout (§5)
```

- **PICK** — an entrant is drawn from the pool. Name and slot revealed. Team not yet known.
- **FLIP** — the coin animation runs. Team assigned, permanently (§6).
- **BUYING** — streamer buys the bonus. Overlay shows the live team card and what this pick needs to matter.
- **RESULT** — cost and payout entered, multiplier computed and banked.
- **FINAL** — the last scheduled pick has resolved; the result takeover plays before the session closes.

`JOINING` is a phase for the opening window only. After that, **joins never close** — same doctrine as Bingo §3. A viewer arriving at pick 9 of 15 can still enter the pool and still be drawn, and a `joinsOpen` flag tracks it independently of the phase enum.

---

## 5. Joining and the pool

`!join <slot name>` — identical rules to Tournament §14 and Bingo §4. Nothing new for a viewer to learn.

| Rule | Behaviour |
|---|---|
| One entry per viewer | A second `!join` replaces the first while that viewer is still undrawn |
| Slots are unique | First come, first served — `uniqueSlots`, default on |
| One pick per viewer per session | Once drawn, a viewer is out of the pool. `reentryAfterPicks` can re-add them after *n* further picks; default `null` (never) |
| Slot must resolve | Unresolvable names go to the unresolved queue for a mod |
| Optional gating | Anyone / followers / subscribers |
| Opening window | Countdown before pick 1, default 5 minutes, or manual close |
| After the window | Joins stay open. New entries land in the pool and are eligible for every remaining pick |

**The pool is uncapped by default, and the anti-spam work is done by the entry rules rather than by a cap.** A first-30-only race rewards whoever had the stream open with low latency and a fast keyboard, which is the exact failure mode Bingo §5.3 rejected for open squares. One entry per viewer, one pick per viewer, and a slot-uniqueness check already make repeat spam pointless — a viewer who types `!join` eleven times has one entry either way.

`poolCap` exists for streamers who want the smaller, more legible pool anyway (default `null`). When it's set, **say so in chat when the cap is hit**, because a silently closed door is the worst version of this:

> Pool is full — 30 slots claimed. Spots reopen as entrants get drawn.

And when a cap is set, drawn entrants free their spot, which turns the cap into a rolling window rather than a first-minute land grab.

**Reserved picks carry over from Tournament unchanged.** The streamer can hand-pick an entrant from the pool — a smaller viewer, a returning regular — and the overlay badges them **Streamer's pick**, visibly, for the same reason as always: a visible advantage reads as generosity, a hidden one reads as rigging. Note carefully that a reserved pick reserves *being drawn*. **It never touches the flip.** Nobody, including the streamer, chooses a team.

---

## 6. The flip

The centrepiece. Everything in this section exists to protect one five-second moment from being either boring or suspicious.

### 6.1 The sequence is committed before the session starts

At session creation, the full flip sequence is generated from the session seed — an array of `'A' | 'B'` of length `maxPicks`, stored, and **never re-rolled**. Pick 4 takes flip index 4 regardless of who gets drawn into it.

This is the same doctrine as Bingo's committed pick order (§5.1) and it exists for the same reason: *"the flip is rigged"* becomes a claim answerable with a fact rather than a promise. Because the sequence is fixed to the pick *index* and not to the *person*, it can be committed before anyone has even joined.

**Optional and recommended: publish a hash of the sequence at session start**, printed on the overlay and posted once in chat. At `COMPLETE`, publish the sequence itself. Anyone who cares can verify that the flips were decided before the first `!join` landed. This costs one hash and permanently ends an entire category of argument — worth it in a vertical where audiences are, correctly, suspicious.

The consequence for the front end is the important part: **the animation is playback, not decision.** The overlay is never computing anything during those five seconds. It already knows.

### 6.2 The veto rule

The streamer may reject a drawn slot — it's not on their casino, the buy is outside their bounds, it's a troll entry that slipped the filter. Fine. But:

> **A veto is only available before the flip animation begins. Once the flip runs, it is final — the slot is played and the result is banked to the team the coin gave.**

If a veto were available after the flip, then every veto is a re-roll of the team, and a streamer who vetoes a slot that just landed on the team they're rooting for has visibly rigged the session whether they meant to or not. Enforce this in the state machine, not in guidance: `veto` is a legal action in `PICK` and rejected in every phase after it.

A veto consumes the pick index and its committed flip. It does **not** shuffle the sequence. The vetoed entrant returns to the pool (or is removed, streamer's choice, with a reason logged).

### 6.3 The animation

Target: **4.5–6 seconds** from the name landing to the team locking. Shorter reads as a cut; longer and chat gets bored on pick eleven.

```
0.0s   name + slot card lands centre frame, teams greyed
0.5s   "3 … 2 … 1" over the card, rising pitch          ← chat's window to shout
2.0s   the coin/reel starts, colours alternating fast, blurred
3.4s   deceleration begins, alternation becomes readable
4.2s   FAKE-OUT — settles almost onto one colour, holds ~0.4s
4.8s   snaps to the true result, colour floods the frame,
       team one-shot fires, entrant card flies into that team's column
6.0s   overlay returns to the standing scoreboard, new member visible
```

**The fake-out is the whole trick and it must be scripted, not random.** The false settle always lands on the *losing* colour, so the snap is always a reversal. Chat is reacting to the false settle — half the channel already celebrating — when it flips. That half-second is the entire emotional payload of the mechanic.

Two guardrails:

- **The fake-out is on a schedule, not on every flip.** Ship it at roughly one flip in three, seeded so it's reproducible and so it can't be gamed. Every flip faking out becomes a rhythm chat learns by pick five, and a tell chat can read is worse than no tell.
- **Never fake out onto the true result.** A near-miss that resolves to where it was already pointing is an anticlimax with extra steps.

**Skip control.** The streamer needs a "skip animation" button for the session where they're running fifteen picks and behind schedule. It jumps to the snap frame. It does not change anything — the result was committed in §6.1.

### 6.4 When the coin overrides an allegiance

If a drawn viewer had declared a side in chat (§7) and the coin sends them to the other team, **the overlay calls it out** and the game does not care:

> **@slotgoblin declared FORTUNE — the coin says CHAOS.**

They play for Chaos. There is no opt-out, no re-flip, no "playing under protest." This is one of the best recurring beats the game has and it should be given a distinct visual treatment — a crossed-out allegiance badge on their card that stays there for the rest of the session, and a callout in the final result if that pick ended up deciding the session against the team they picked.

---

## 7. The crowd layer — picking a side

Only *n* viewers get drawn. Everyone else needs a colour, and this is the cheapest engagement the catalog has ever offered.

`!side chaos` / `!side fortune` — or `!chaos` / `!fortune` as aliases, since chat will type those anyway.

| Rule | Behaviour |
|---|---|
| Who can declare | Anyone in chat, drawn or not, subject to `sideGate` |
| Changing sides | **Never.** First declaration is permanent for the session |
| When it closes | At the halfway pick by default (`sideLockAtPick`), so late arrivals can still join a side but nobody can read the scoreboard and pile onto the winner at pick 14 |
| Being drawn | Overrides the declared side for *scoring* purposes (§6.4); the declaration is kept in the record |
| No declaration | Fine. They just don't collect a reward. Nobody is auto-assigned |

**No switching is non-negotiable.** A game where allegiance is fluid has no allegiance, and the reward at the end becomes a prize for correct timing rather than for backing a side.

**The crowd count is a live overlay element** — a thin bar under each team's score showing how many viewers are behind it. It has no effect on scoring whatsoever, and that is exactly why it works: it's a free popularity contest running in parallel to the real one, and the two diverging ("Fortune has 70% of chat and is losing by 12×") is good television.

### 7.1 Rewards, and the line we don't cross

Winning side gets something. Losing side gets something smaller, so that declaring a side always beats not declaring one.

Reasonable and safe:

- Loyalty points to everyone on the winning side, a smaller amount to the losing side *(engagement scoring, no monetary value, no redemption path — see Product Overview §10)*
- An emote or badge unlock for the winning colour until the next session
- Priority in the next session's reserved-pick shortlist
- A named callout on the overlay for the winning side's most active chatters

**What the platform does not do:** hold, escrow, distribute, or track anything with real-money value. Prize claims are streamer-announced and settled entirely off-platform. This game creates a very natural-looking slot for "winning side splits €500," and the answer is that StreamArena will happily *display* whatever the streamer announces and will not be involved in it in any other way.

---

## 8. Scoring

### 8.1 Per pick

```
Slot:      Gates of Olympus     (@slotgoblin, CHAOS)
Buy cost:  €200
Payout:    €400
                                 →  2.00×  banked to CHAOS
```

**Multiplier = payout ÷ buy cost**, identical to Tournament §Match resolution and for the identical reason: buy costs range from 100× to 500× bet, so any raw-cash metric turns the game into "whoever's slot has the priciest buy wins" and viewers learn that within one session.

Validation: buy cost must be > 0 and is rejected at input if it isn't. Payout may be 0 — a dead bonus is a real result and banks a 0.00×, which is the most damaging thing that can happen to a team's average and should be shown as such.

### 8.2 Team score and the awards

```
teamScore   = sum(multipliers) / count(picks)        ← decides the session
teamTotal   = sum(multipliers)                        ← secondary, displayed
teamCash    = sum(payouts) - sum(costs)               ← secondary, displayed
```

Three awards at the end, announced separately (§12):

**Winning team** — higher `teamScore`. Every member wins, plus everyone who declared that side.

**MVP — biggest single multiplier of the session.** Cross-team, one viewer, and deliberately independent of who won. This is what gives an individual something to chase while their team is being dismantled, it's the clip that leaves the stream, and per §2 it is very often the pull that decided the session anyway. Show it as its own full-frame card, not a footnote.

**The Anchor** — lowest multiplier of the session, awarded with affection and only if `showAnchor` is on (default on). Slots audiences are perfectly happy to laugh at a 0.00×, and giving the wooden spoon a name is better than pretending the worst pull didn't happen. It should never be framed as a punishment and it should never carry a penalty.

### 8.3 Ties

`teamScore` ties to two decimals are rare but will happen, most often at 0.00× vs 0.00× on a short session where nothing paid.

1. Higher team total multiplier
2. Higher single best multiplier (the better MVP)
3. Fewer picks — the same score off fewer bonuses is the better performance
4. Seeded coin flip from session seed + `'tiebreak'`

**The overlay states which rung decided it.** A tie resolved silently looks like a bug.

---

## 9. Ending the session

### 9.1 The pick count is declared before pick 1

The streamer sets `maxPicks` at setup — **10, 15, or 20**, or a custom number — and the overlay shows **PICK 8 / 15** at all times.

"The streamer stops whenever they want" is the default this game would fall into if nobody decided otherwise, and it's a real problem rather than a stylistic one: **a session that ends at the streamer's discretion can always be ended while the streamer's preferred team is ahead**, and there is no way to prove otherwise. That accusation is cheap to make and impossible to answer. A declared count answers it before it's made.

It's also just a better shape. A viewer who knows there are two picks left knows the swing number matters *now*. A viewer who doesn't know how long the game runs cannot get tense about anything.

| Picks | Session length | Suits |
|---|---|---|
| 10 | ~45–70 min | A single segment. Recommended default |
| 15 | ~1.5–2 hrs | A full stream's spine |
| 20 | ~2.5–3 hrs | Marathon / special event only — and check §2, the split gets *worse* with length, not better |

**Projected spend is shown on the config screen** — `maxPicks × your typical buy` — for the same reason Bingo §11 demands it. Fifteen picks at a €200 buy is €3,000 committed before the first name is drawn, and the streamer should see that number at setup, not at pick nine.

### 9.2 Sudden death

If the teams are within `suddenDeathThreshold` (default 5% of the leading score) when the last scheduled pick resolves, the overlay declares **SUDDEN DEATH** and one extra pick runs. Repeat up to `maxSuddenDeath` (default 3), then resolve on the tiebreak ladder regardless.

This is bounded and automatic, and both of those matter. Bounded, so it cannot become an unlimited discretionary extension — which would reintroduce exactly the problem §9.1 exists to solve. Automatic, so it fires on a rule everyone can see rather than on a judgement call.

The flip sequence has to cover it: generate `maxPicks + maxSuddenDeath` flips at commit time.

### 9.3 The swing number

Bonus Hunt has break-even. Bingo has the one-away line. **Team Battles has the swing number, and it should be the largest thing on the overlay after the two team scores:**

> **FORTUNE NEED 41.8× ON THIS PICK**

Computed live, the moment the flip resolves and the trailing team's next pick is known:

```
required = teamScore_leader × (n_trailer + 1) − total_trailer
```

That is: what this single bonus has to pay for the trailing team to take the lead right now. It updates on every flip, and it is the number that makes the *buying* phase watchable instead of dead air — the streamer is loading a bonus and there is a specific figure on screen it has to beat.

Three states, and all three are useful:

- **Reachable** (say, under 20×) — this pick is live, show it in the trailing team's colour and pulse it
- **A long shot** (20–100×) — show it plainly. Slots viewers know exactly what a 60× requires and that's the point
- **Effectively gone** (100×+, or the trailer has no picks left) — say so honestly: *"Fortune need 340× — this is Chaos's unless the last two both land Fortune."* Fake tension is worse than no tension, and in this game the real tension comes back the moment the coin gives the trailer two in a row

When the *leading* team is on the pick, the number inverts into how far they can put it out of reach, which is a weaker beat but keeps the slot on screen occupied.

---

## 10. Slot curation

The entry is a slot, the slot decides a multiplier, and the multiplier is banked to a team of a dozen people who had no say in it. So a bad-faith entry is not a personal loss any more — it's sabotage of a group, which is a genuinely new abuse surface for this catalog.

Guards, all automatic and all applied **at `!join` time**, so a rejected entry is rejected in front of the person who typed it rather than being quietly binned:

| Guard | Config | Behaviour |
|---|---|---|
| Buy must exist | — | A slot with no bonus buy feature cannot be entered. Catalog flag |
| Buy cost bounds | `minBuyX` / `maxBuyX` in bet multiples, default 50–500 | Keeps a €2,000 buy and a €12 buy out of the same session |
| Provider blocklist | `blockedProviders` | Streamer's casino doesn't carry it, it doesn't get entered |
| Slot blocklist | `blockedSlots` | The specific known-dead ones |
| Volatility floor | `minVolatility`, optional | Blocks the deliberately flat low-variance picks whose whole purpose is to drag an average down |

Rejections reach chat, per the errors-only ack policy:

> ↳ @viewer Sweet Alchemy's buy is 75× — this session takes 100×–400× buys. Pick another slot.

**Set the bounds as a range, not a floor.** A floor alone invites the opposite exploit: entering the most expensive buy available so the streamer has to spend €800 on your entry. Bounded both ways, the streamer's exposure per pick is known before the session starts, which is also what makes the projected-spend figure in §9.1 honest.

**The house rule the streamer should also have, in plain words:** the guards above stop the mechanical exploits, and a mod removing an obvious troll entry (`!tb remove @user`) covers the rest. What is explicitly *not* provided is a way to remove an entry after its flip — see §6.2. Curation happens before the coin, or it doesn't happen.

---

## 11. Commands

**Viewer**

| Command | Notes |
|---|---|
| `!join <slot>` | Enter the pool. One entry, replaceable while undrawn |
| `!side chaos` \| `!side fortune` | Declare allegiance. Permanent. Aliases: `!chaos`, `!fortune` |
| `!teams` | Current scores, batched reply |
| `!me` | This viewer's status — in pool / drawn / their team / their multiplier |

`!teams` is throttled hard (one batched reply per 30s serving every request in the window) because in a two-team game it is the single most spammable command in the catalog and the answer is already on screen.

**Mod**

| Command | Notes |
|---|---|
| `!tb remove @user` | Remove from pool. Illegal after that user has been drawn |
| `!tb fix @user <slot>` | Correct a misresolved slot, pool only |
| `!tb close` \| `!tb open` | Toggle `joinsOpen` |

**Streamer, dashboard only** — never chat commands, because every one of them is either irreversible or scoring-relevant:

| Action | Notes |
|---|---|
| Draw next | Runs `PICK`. Blocked until the previous result is entered |
| Reserve pick | Hand-pick from pool for the next draw. Badged on the overlay |
| Veto | `PICK` phase only (§6.2) |
| Run flip | Fires the animation. Point of no return |
| Skip animation | Jumps to the snap. Same result |
| Enter result | Cost + payout. Editable until the next flip starts, then requires an explicit revert |
| Revert pick | Explicit, logged, and shown on the overlay as a correction rather than silently applied |
| End session | Only enabled once `maxPicks` is reached or sudden death resolves — see §9.1 |
| Abandon session | Always available, saves incomplete, announces nothing |

The asymmetry between **End** and **Abandon** is deliberate. A streamer can always stop; what they can't do is stop *and have it count as a finished session with a winner*.

---

## 12. Chat behaviour

Fifteen picks × three events each is straight into the quota wall, so the same discipline as Bingo §12 applies: **per-pick results do not go to chat.** The overlay is where results live.

| Moment | Priority | Notes |
|---|---|---|
| Session open, flip hash published | `announce` | Once |
| Pool cap hit | `announce` | Only when `poolCap` is set |
| Flip result | **off by default** | It's a five-second animation; chat narrating it is noise |
| Lead changes hands | `announce` | Deduped, 90s cooldown — this is the one mid-session event worth the write |
| Sudden death declared | `announce` | |
| Winning team | `announce` | |
| MVP | `announce` | Separate message, ~4s later |
| Anchor | `announce` | Separate message, ~4s later, if enabled |

All held behind the **stream delay** (Game-Specs §Winner announcements), default 12s. This matters more here than anywhere else in the catalog: the flip animation is a reveal that chat can spoil, and a lead-change message that arrives while viewers are still watching the coin spin ruins the one mechanic the game is built on.

### Templates

**Session open**
```
TEAM BATTLES — {maxPicks} picks, {teamA} vs {teamB}.
!join <slot> to enter, !side chaos / !side fortune to pick who you're rooting for.
Flip sequence committed: {hashShort}
```

**Lead change**
```
{team} take the lead — {scoreA}x vs {scoreB}x with {remaining} picks left.
```
> CHAOS take the lead — 11.4x vs 9.8x with 6 picks left.

**Winner**
```
{winningTeam} WIN — {winScore}x average against {loseScore}x over {maxPicks} picks.
@{u1}, @{u2}, @{u3} … and everyone who called {winningTeam}.
```
> CHAOS WIN — 14.2x average against 9.6x over 15 picks. @slotgoblin, @bonusbandit, @reelqueen …and everyone who called CHAOS.

**MVP**
```
MVP: @{username} — {slotName} paid {multiplier}x off a {buyCost} buy. Biggest pull of the session.
```

**Anchor**
```
And the Anchor goes to @{username} — {slotName}, {multiplier}x. It happens.
```

Sixteen usernames plus slot names overflows 500 characters, so the winner message lists usernames only and truncates with "…and 7 more — full teams on screen", exactly as Tournament does.

---

## 13. Overlay

**Join phase** — the joiner count as the hero number, a scrolling feed of recent joins with slot thumbnails, the two team crests idle and greyed, and a persistent footer carrying both commands. The teams are on screen from the first second even though nobody is on them yet; they're the thing the session is about.

**Standing scoreboard** *(the default state, on screen most of the session)*

```
┌─────────────────────────────┬─────────────────────────────┐
│  CHAOS             14.2x    │    9.6x            FORTUNE  │
│  avg per pick               │               avg per pick  │
│  8 picks · 113.6x total     │      6 picks · 57.6x total  │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓ 62% of chat  │  38% of chat ▓▓▓▓▓▓▓▓       │
│  @slotgoblin   34.0x        │        @maxwinmike  22.1x   │
│  @reelqueen     8.2x        │        @lateshow     9.4x   │
│  …                          │                          …  │
├─────────────────────────────┴─────────────────────────────┤
│  PICK 15 / 15      FORTUNE NEED 41.8x ON THIS PICK        │
└───────────────────────────────────────────────────────────┘
```

Two columns, hard-split by colour, no shared elements between them. Team average is the largest figure on each side; picks and total sit under it small. Member lists are ordered by multiplier descending so the team's best pull is always at the top of its column.

**Pick card** — takes over centre frame: username, slot thumbnail, slot name, buy cost. Both team crests flanking it, both still neutral.

**Flip** — full-frame takeover, per the timing in §6.3. This is the one moment the scoreboard is allowed to disappear entirely.

**Result** — the multiplier as the biggest number of the sequence, cost and payout small beneath it, then the entrant's card flying into their team's column while the team average recalculates with a visible count-up. **Recount the average on screen rather than snapping to it** — watching 11.4× climb to 14.2× is the payoff of the whole pick.

**Final** — three sequential takeovers: winning team with its full roster, then MVP, then Anchor. Then the standing scoreboard as a resting state, because the stream will sit on it while the streamer talks.

**Reconnect resilience** — as everywhere, the overlay resyncs full state on reconnect. One extra rule specific to this game: **an animation interrupted by a reconnect is never replayed.** It jumps to the settled state. A flip animation that replays after an OBS hiccup, showing chat a result they already saw, looks exactly like a re-roll.

---

## 14. State

```ts
type TeamBattlesState = {
  phase: 'joining' | 'pick' | 'flip' | 'buying' | 'result' | 'final' | 'complete'
  seed: string
  joinsOpen: boolean

  config: TeamBattlesConfig

  teams: {
    A: { key: string; name: string; colour: string; emoji: string }
    B: { key: string; name: string; colour: string; emoji: string }
  }

  // committed at session creation, length maxPicks + maxSuddenDeath
  flipSequence: ('A' | 'B')[]
  flipSequenceHash: string
  flipSequenceRevealed: boolean          // true only at COMPLETE

  pool: {
    userId: string
    username: string
    role: 'viewer' | 'follower' | 'subscriber' | 'mod'
    slotId: string
    slotName: string
    provider: string
    buyCostX: number                     // buy in bet multiples, from catalog
    joinedAtSeq: number
  }[]

  reservedUserIds: string[]

  sides: Record<string, {                // userId →
    username: string
    team: 'A' | 'B'
    declaredAtSeq: number
  }>
  sidesLocked: boolean

  picks: {
    index: number                        // 0-based, maps into flipSequence
    userId: string
    username: string
    slotId: string
    slotName: string
    team: 'A' | 'B'                      // === flipSequence[index]
    declaredSide: 'A' | 'B' | null       // for the §6.4 callout
    source: 'random' | 'reserved'
    buyCostCents: number | null
    payoutCents: number | null
    multiplier: number | null
    fakeOut: boolean                     // seeded, for animation playback
    vetoed: { at: number; reason: string } | null
    revertedFrom: { buyCostCents: number; payoutCents: number } | null
    resolvedAtSeq: number | null
  }[]

  currentPickIndex: number | null
  suddenDeathPicks: number               // extra picks used so far

  result: {
    winner: 'A' | 'B'
    decidedBy: 'average' | 'total' | 'best' | 'fewerPicks' | 'coinflip'
    scoreA: number
    scoreB: number
    mvp: { userId; username; slotName; multiplier } | null
    anchor: { userId; username; slotName; multiplier } | null
  } | null
}
```

### Derived — computed, never stored

```ts
teamPicks(t)   = picks.filter(p => p.team === t && p.multiplier !== null)
teamTotal(t)   = sum(teamPicks(t).multiplier)
teamScore(t)   = teamPicks(t).length ? teamTotal(t) / teamPicks(t).length : 0
teamCash(t)    = sum(payoutCents) - sum(buyCostCents)  over teamPicks(t)
crowd(t)       = count(sides where team === t)
picksRemaining = (maxPicks + suddenDeathPicks) - picks.filter(resolved).length
swing(t)       = teamScore(other) * (teamPicks(t).length + 1) - teamTotal(t)
```

`teamScore` of an empty team is **0, not undefined** — see §16, the shutout case.

---

## 15. Config

```ts
{
  maxPicks: number                       // default 10. 8–25 allowed
  teamAName: string                      // default 'Chaos'
  teamBName: string                      // default 'Fortune'
  teamAColour: string                    // default '#B44BFF'
  teamBColour: string                    // default '#FFC53D'

  winMetric: 'average' | 'total' | 'trimmed'   // default 'average' (§2)
  drawMode: 'coin' | 'bag'               // default 'coin' (§2)

  joinGate: 'anyone' | 'followers' | 'subscribers'
  joinWindowMs: number | null            // default 300_000
  uniqueSlots: boolean                   // default true
  poolCap: number | null                 // default null — uncapped (§5)
  reentryAfterPicks: number | null       // default null — one pick per viewer

  sideGate: 'anyone' | 'followers' | 'subscribers'
  sideLockAtPick: number | null          // default floor(maxPicks / 2)

  minBuyX: number                        // default 50
  minVolatility: number | null           // default null — optional flat-slot filter
  maxBuyX: number                        // default 500
  blockedProviders: string[]
  blockedSlots: string[]

  suddenDeathThreshold: number           // default 0.05 (5% of leader)
  maxSuddenDeath: number                 // default 3

  fakeOutRate: number                    // default 0.33 (§6.3)
  animationMs: number                    // default 5500
  publishFlipHash: boolean               // default true
  showAnchor: boolean                    // default true
  announceLeadChange: boolean            // default true
}
```

**The config screen shows projected spend and session length**, recomputed live as `maxPicks` moves, on the same principle as Bingo §11: `10 picks × €200 typical buy ≈ €2,000, ~1 hour`. A streamer picking 20 because it sounds fun should watch that number double while they do it.

**`winMetric: 'total'` must carry an inline warning next to the control**, not buried in docs — one line, stating that with random team sizes the larger team wins roughly 80% of the time. Streamers will still choose it occasionally and that's their call, but they should choose it knowing.

---

## 16. Edge cases

| Case | Behaviour |
|---|---|
| Every flip lands the same side (shutout) | ~0.2% at 10 picks. The empty team scores **0** and loses. Do not special-case it into a draw — the overlay should say plainly that one team never got a pick, and it becomes a legendary session rather than a bug |
| Fewer joiners than `maxPicks` | Warn at setup. Offer a lower count, or let `reentryAfterPicks` recycle drawn entrants. Never draw the same person twice in a row |
| Pool empties mid-session | Pause draws, overlay switches to a "waiting for entries" state with the join command large. The session does not end — this is precisely why joins never close |
| Drawn viewer's slot won't resolve | Remove from pool, redraw. The pick index and its committed flip are untouched — no draw has happened yet |
| Streamer vetoes after the flip | Rejected by the state machine (§6.2) |
| Streamer mistypes cost or payout | Editable until the next flip begins; after that, explicit **revert pick**, logged and shown as a correction on the overlay |
| Pick reverted | Team score recalculated from the event log. The flip is **not** re-rolled — same person, same team, corrected numbers |
| Buy cost entered as zero | Rejected inline. Payout of zero is valid |
| Both teams end on 0.00× | Everything died. Resolves down the tiebreak ladder (§8.3), lands on the coin flip, and the overlay says so |
| Drawn viewer is banned or leaves mid-session | Their pick stands and can still win it for their team. Same rule as Tournament |
| Viewer declares a side after `sideLockAtPick` | Rejected with a chat ack. They can still `!join` — the pool never closes, only allegiance does |
| Viewer declared a side, then gets drawn onto the other | The coin wins (§6.4). Their declaration stays on the record and is called out |
| Two viewers request the same slot | First come, first served. Second is rejected in chat |
| Reconnect mid-flip | Overlay jumps to the settled state. Never replays an animation |
| Streamer abandons mid-session | Saved incomplete. **No winner announced, no rewards issued** — same doctrine as everywhere else in the catalog |
| Sudden death still tied after `maxSuddenDeath` | Tiebreak ladder, stated on the overlay |

---

## 17. What's excluded, and what's deferred

### Excluded by decision

**Channel-point side betting on the flip.** Letting chat wager points on which team a drawn viewer will land on is an obvious fit — the suspense beat already exists and the wager costs nothing to attach. It is excluded anyway.

The reason is that it changes what the game is. Right now a viewer picks a colour once and lives with it for two hours; that's an allegiance, and allegiance is what makes a comeback feel like anything. A per-flip wager replaces one long stake with fifteen short ones, and the thing chat is actually watching becomes their own point balance rather than the scoreboard. It also puts a points market on a mechanic whose result is committed in advance (§6.1), which is a category of thing worth being careful about even when the commitment is honest.

Revisit only if the crowd layer in §7 measurably fails to engage — and if it's ever built, it belongs on the *session* outcome, not on individual flips.

### Deferred

- **More than two teams.** Breaks the 50/50 flip, the two-bar overlay, and side-picking all at once. If it's ever wanted it's a different game
- **Cross-session team standings** — Chaos vs Fortune as a running war across a whole month. Genuinely good, and it needs the points ledger and anti-abuse work that Product Overview §9 already puts in "later"
- **Team captains** — a designated viewer who picks one slot per team per session. Interesting, and it introduces a skill asymmetry that this game deliberately doesn't have yet
- **Handicap for the trailing team** — no. The comeback should come from a bonus, not from a rule

---

## 18. Build ledger

Almost nothing here is new machinery, which is the argument for building it fourth.

**Reused unchanged**

| Primitive | From |
|---|---|
| Entry pool, `!join`, slot resolution, uniqueness, gating | Tournament §Joining |
| Seeded draw with reserved picks, badged on overlay | Tournament §The draw |
| Streamer result entry — cost, payout, edit, revert | Bonus Hunt / Tournament |
| Committed-sequence-from-seed doctrine | Bingo §5.1 |
| Winner announcement, stream delay, priority lane | Game-Specs §Winner announcements |
| Overlay reconnect and resync | Core |

**New, and small**

| Piece | Notes |
|---|---|
| Two-bucket scoring with average metric | Trivial. The design work was §2, not the code |
| Flip animation with scripted fake-out | The one real front-end build. Playback only — no logic |
| Side declaration and crowd counter | A map and a bar |
| Swing number | One formula, recomputed on flip |
| Buy-cost bounds guard at join time | Needs a `buyCostX` field on the slot catalog — **the only upstream dependency in this spec** |
| MVP / Anchor awards | Two `argmax` calls and two overlay cards |

**Build order position:** after Tournament, alongside or before Bingo. It depends on Tournament's draw and Hunt's result entry, and it depends on nothing Bingo introduces. If Bingo's retry dial slips, Team Battles can ship in front of it without reordering anything.

**The one thing to prototype first** is the flip animation, in isolation, before any of the game logic exists. The whole design assumes that five seconds carries the session fifteen times without wearing out. That assumption is cheap to test with a static page and two colours, and expensive to discover was wrong after the backend is done.
