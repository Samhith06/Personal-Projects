# StreamArena — Game 3: Slot Bingo

**Status:** design, pre-build · **Revision 3** — the retry dial (§6.5) · Revision 2 — late entry via open squares · **Supersedes:** the deferred "Bonus Bingo" (shared condition card) in `StreamArena-Game-Specs.md` §Game 3 · **Depends on:** Slot Tournament (draw, result entry), Bonus Hunt (running totals)

---

## 1. Concept

The streamer picks a board — **3×3 or 5×5**. Viewers claim a slot in chat with `!join <slot>`. From an uncapped pool, most squares are filled — some hand-picked by the streamer, the rest drawn at random — and each entrant lands on **one square of the board**, slot and username printed on it. A few squares are deliberately held back as **OPEN**, and unlock later in the session for viewers who tune in mid-board.

Then the streamer works the board. One square at a time, in an order committed before play starts, a square is drawn, its bonus is bought, and the result is entered. **Profit turns the square green. A loss turns it red.**

*Whether a red is permanent, or the square gets another life, is a setup toggle — §6.5. The default is permanent, and everything up to that point assumes it.*

The board fills. Lines die as reds land on them. Lines that survive get closer. If a line ever goes **fully green**, that's a bingo — everyone on it wins, immediately. If the board fills with no bingo, the **line with the highest combined multiplier** takes it.

Nobody is eliminated. Every viewer on the board is alive until their own square flips, and alive through their line until it dies. That is the difference between this and Tournament, and it's why both are worth having.

It's also why Bingo has **no prediction layer**. Tournament needs one because a bracket cuts people out; here the board is one shared object and the way in for a latecomer is an actual square, not a side bet. One game, one scoreboard.

### What makes it work

Tying squares to people, same as Tournament ties slots to people. A bingo board of slot names is a graphic; a bingo board of *viewers* is a game. And unlike a bracket, the tension is shared — one red in the centre of a 5×5 kills four lines at once and takes a dozen people's hopes down with it.

Structurally, **Slot Bingo is a bonus hunt with a board on top.** The streamer is doing exactly what they'd do anyway — opening bonuses one after another, watching a running total. The board is the layer that turns that into a competition.

---

## 2. The math trap, and why the win rule has two halves

This is the decision the whole game hinges on, so it's stated up front.

Green means the buy profited — multiplier ≥ 1.00×. Real bonus buys clear their cost roughly **one time in three**. Run that through the board:

| Board | Squares | Line length | Lines | Chance a line ever completes |
|---|---|---|---|---|
| 3×3 | 9 | 3 | 8 | ~20–25% |
| 5×5 | 25 | 5 | 12 | **~5%** |
| 7×7 | 49 | 7 | 16 | **<1%** |

Instant-bingo-only means a 5×5 session buys 25 bonuses, spends a few thousand, and ends with **no winner nineteen times out of twenty**. Loosening the green threshold to a coin flip only lifts 5×5 to about 30%. Bingo works in real life because numbers keep getting drawn until someone wins; here the squares are finite and each is a coin flip that usually loses.

**So there are two win conditions:**

1. **Instant bingo** — a line goes fully green. Play stops immediately. Everyone on that line wins. Rare by design, which is exactly what makes it land when it happens.
2. **Best line** — the board fills with no bingo, and the line with the **highest combined multiplier** wins. Guaranteed ending, and it makes a dead bonus cost something without killing anyone: a red doesn't eliminate a line, it just weighs it down.

The knock-on benefit is that a square's *size* matters, not just its colour. A 180× on one square can carry a line that a 1.2× can't. Every result stays interesting right up to the last square.

**And a third lever, added in revision 3: retries.** The two conditions above solve the *ending* problem — the board always resolves, nobody goes home with nothing. They do not solve the *bingo is rare* problem, and a streamer who wants a board that actually completes a line has no way to ask for one. Giving a red square another life does that, at a price measured in bonus buys and specified in full in §6.5. It is a dial, off by default — not a replacement for either win condition above.

---

## 3. Phases

```
JOINING → DRAW → PLACEMENT → [ PICK → BUYING → RESULT ] × n → COMPLETE
                                        ↑
                            UNLOCK ─────┘  (interleaved, §5.3)
```

`PICK → BUYING → RESULT` repeats until a bingo fires, the board is full, or the streamer settles early.

With retries on (§6.5) the bracketed loop runs in **rounds**: round 1 is the committed order, and each later round replays the squares that are still red. `COMPLETE` is reached on a bingo, on the last round finishing, or on a cap.

**Joining is not a phase.** `!join` is live from session start to the last unlock — a viewer arriving at pick 14 can still enter. The phase enum describes what the *board* is doing; joins run alongside it and are tracked by a separate `joinsOpen` flag. This is deliberate: a 5×5 is 25 bonus buys and runs for hours, and a locked board is a locked door to everyone who tunes in late.

---

## 4. Joining

`!join <slot name>` — identical rules to Tournament §14, deliberately. Nothing new to learn, nothing new to build.

| Rule | Behaviour |
|---|---|
| One entry per viewer | Second `!join` replaces the first while the window is open |
| **Slots are unique** | First come, first served |
| **One square per viewer** | Nobody holds two squares |
| Slot must resolve | Unresolvable names go to the unresolved queue |
| Optional gating | Anyone / followers / subscribers |
| Opening window | Countdown to the main draw, default 5 minutes, or manual close |
| **After the draw** | Joins stay open. Entries go to **standby** and compete for open squares (§5.2) |

The duplicate rejection reaches chat, same as Tournament:

> ↳ @viewer Gates of Olympus is already claimed by @slotgoblin — pick another slot.

A `!join` that arrives after the main draw — including during the 20-second reveal animation, which is exactly when the most people are typing — is **acknowledged, never rejected**:

> ↳ @viewer You're in the standby draw. 2 squares still to open — next one after 3 more picks.

---

## 5. The draw and placement

### 5.1 The main draw

Reuses `drawSeats()` unchanged: reserved seats first, labelled **Streamer's pick**, then seeded random fill. The draw runs once. No re-roll button, anywhere.

**Placement is the new part, and it is not neutral.** On a 5×5:

| Square | Lines it sits on |
|---|---|
| Centre | 4 (row, column, both diagonals) |
| Diagonal, non-centre | 3 |
| Corner | 3 |
| Everything else | 2 |

That's a 2× spread in win odds decided purely by where you land. So placement is **seeded random, derived from the session seed, and shown openly** as part of the reveal. The same reasoning as reserved seats: an advantage that's visible reads as luck, an advantage that's hidden reads as rigging.

**Commit the pick order at draw time.** The order squares will be played in is shuffled from the session seed the moment the draw runs, stored, and never re-rolled. Play just reveals it one square at a time. This makes the whole session replayable from the log, and it means "you picked that square on purpose" is answerable with a fact rather than a promise. *(Optional, later: publish a hash of the order before play starts so it's provable rather than merely true.)*

**The reveal.** Names cycling and landing one square at a time, under ~20 seconds for the whole board — same treatment as the Tournament draw. This is the most anticipated moment of the session; filling a grid silently wastes it.

### 5.2 Open squares

The board's geometry is fixed, so a late joiner can't be given a 26th square. Instead, **squares are held back at the draw.**

A 5×5 fills 22 squares from the pool and leaves **3 marked OPEN** — on the board from the first second, visibly empty, labelled, counted in the line arithmetic like any other square. A 3×3 holds back 1. The number is configurable and declared before the draw, so nobody discovers it mid-session.

**Ownership and pick order are independent.** The order squares get played in is committed at the draw and never changes; *who owns C3* was never part of that commitment. So late entry costs nothing in fairness — the commitment made in §5.1 is untouched.

This independence is what makes the re-entry retry model in §6.5 cheap to build: a square that reopens after a loss is refilled by exactly the same mini-draw against exactly the same standby pool as a scheduled unlock. One pool, one primitive, two reasons a square might need an owner.

### 5.3 The unlock schedule

If all three open at the moment the draw ends, the three fastest typists take them and the viewer who arrives at hour two is exactly where they started. So they unlock **spread across the board**, and each unlock is a **mini-draw**, not a race.

| Board | Open squares | Unlock after pick |
|---|---|---|
| 5×5 | 3 | 6, 12, 18 |
| 3×3 | 1 | 4 |

General rule: unlock *k* of *n* open squares after pick `round(k × total ÷ (n+1))`.

At each unlock, the square is filled by a seeded draw among **everyone who joined since the previous unlock**. Five seconds, same `drawSeats()` primitive, on stream. The effect is a recurring hype beat every twenty minutes rather than one big moment at the start — and the reward for arriving late is a real shot instead of an apology.

The overlay counts down to it continuously: **"next square opens in 3 picks."**

**Retries break these numbers, and it matters.** Picks 6/12/18 are two-thirds of the way through a 25-pick board. On a 5×5 with one retry the board runs ~42 picks, and Endless runs ~60 — so the last unlock lands in the first third of the session and joins close while the stream is still filling up. That is the precise failure this section exists to prevent.

**Unlock points are a fraction of the *expected* total, not a fixed pick number.** Scale by the same multiplier §6.5 uses for projected spend:

| Board | Retries | Expected picks | Unlock after pick |
|---|---|---|---|
| 5×5 | 0 | 25 | 6, 12, 18 |
| 5×5 | 1 | ~42 | 10, 21, 31 |
| 5×5 | 2 | ~53 | 13, 26, 40 |
| 5×5 | Endless | ~60 | 15, 30, 45 |

Under the **re-entry** model (§6.5) this pressure largely lifts on its own: every loss reopens a square, so the board generates its own entry points continuously and a viewer arriving at hour two has a real queue to stand in rather than a countdown that already expired. Scheduled unlocks still rescale — they are the guarantee, not the only route in.

**Constraint on the committed order:** an open square's position must fall strictly *after* its unlock point. Otherwise you unlock C3 at pick 18 and find it was played at pick 5. The order stays deterministic and committed — open squares are placed into their eligible window first, then the remaining squares are shuffled into what's left.

**A late square may be a long shot, and the overlay says so.** A square claimed at pick 18 can sit on lines that are already dead. Show its live-line count at claim time. Better a viewer knows they're taking a bad seat than finds out four picks later.

Once every open square is gone, joins close. A `!join` after that gets an honest answer rather than silence:

> ↳ @viewer All squares are taken — this board is full. Next session, get in early.

### 5.4 Underfilled board

Fewer joiners than squares, in order:

1. **Keep the open squares.** They're the last thing to give up — an underfilled board is exactly the session where late entry matters most.
2. Offer the next size down (5×5 → 3×3).
3. Still short — the streamer fills the remaining squares with slots of their own choosing, marked **HOUSE**. House squares play and colour normally and count toward lines, but they win nothing. If a winning line contains house squares, only the viewer-owned squares in it take the prize.

---

## 6. The play loop

### PICK

The next square comes off the committed order. The overlay cycles a highlight across the unplayed squares, decelerates, lands.

**Keep this to ~3 seconds.** The draw animation is seen once and can afford 20; this one is seen 25 times and anything longer becomes the thing people complain about.

The streamer may instead play a specific square manually — for a viewer who just subbed, or to build a moment. It's allowed, and it's badged **Streamer's pick** on the square and in the log. Same stance as reserved seats: visible, not hidden.

### BUYING

Square is armed, slot art up, the streamer buys the bonus. Overlay shows which lines this square sits on and what each of them needs.

### RESULT

The streamer enters two numbers — **buy cost** and **payout**. Multiplier is computed, never entered. Identical to `match.result` in Tournament; reuse the same component.

```
Square C3 · Gates of Olympus · @slotgoblin
  buy €100   payout €425   →  4.25×   GREEN
```

**Validation:** buy cost must exceed zero. Payout of zero is valid and common.

### Colour tiers

| Tier | Rule | Meaning |
|---|---|---|
| **Red** | multiplier < green threshold | Loss. Every line through it is now weakened. |
| **Green** | multiplier ≥ green threshold (default **1.00×**) | Profit. Counts toward a bingo line. |
| **Gold** | multiplier ≥ big-win threshold (default **50×**) | Green, plus a celebration. Cosmetic to the rules; carries enormous weight in best-line scoring. |

Green threshold is configurable. Raising it makes greens rarer and instant bingo nearly impossible — the config screen should say so in words, not leave the streamer to discover it live.

---

## 6.5 Retries — the second-chance dial

**Default: off.** Everything above describes a board where a square is played once and a red is permanent. That is still the default game, and every section outside this one assumes it.

But a 5×5 that reaches a real bingo once in twenty sessions is a design choice, not a law. `retriesPerSquare` is a dial: a red square can come back for another attempt, up to a configured number of lives.

| Setting | Name on the config screen | Behaviour |
|---|---|---|
| `0` | **Sudden Death** | Red is permanent. The game as specified above. Default. |
| `1` | **Second Chance** | One red is survivable. The second is fatal. |
| `2` | **Three Lives** | Two reds survivable. Bingo lands most sessions. |
| `null` | **Endless** | A square is retried until it greens. The board ends only on a bingo, a settle, or a cap. |

### 6.5.1 What the dial costs

Using the ~1-in-3 green rate from §2:

| Retries | Square ends green | Bingo odds, 5×5 | Bingo odds, 3×3 | Expected buys, 5×5 |
|---|---|---|---|---|
| **0** | 33% | ~5% | ~25% | 25 |
| **1** | 56% | ~45% | ~78% | ~42 |
| **2** | 70% | ~85% | ~97% | ~53 |
| **Endless** | 100% | 100% by construction | 100% | ~55–65 |

**A guaranteed bingo costs roughly 2.5× the bonus buys.** On a 5×5 at €100 a buy that is €2,500 becoming €6,000, and a two-hour session becoming four. §11's projected-spend figure must recompute the instant this dial moves — it is the number that decides whether a streamer can afford the board they just configured, and square 40 is far too late to find out.

The odds above hold for both retry models below. A square that needs three attempts costs three bonus buys either way; the models differ in *who is sitting on it*, not in what it costs.

---

### 6.5.2 Two ways to spend a life

**Model A — Square retry.** The owner keeps the square. It goes amber, loses a life, and is re-queued for another buy later in the round order.

**Model B — Re-entry draw.** The owner does **not** keep the square. A red returns them to the entry pool, the square reopens, and it is refilled by a mini-draw — the same `drawSeats()` call, against the same standby pool, as a scheduled unlock in §5.3.

The rule that makes Model B work, stated plainly:

> **Green locks you in. Red puts you back in the draw.**
>
> A viewer whose square greens holds it for the rest of the session and is out of the pool — they have their claim on a line and nothing can take it. A viewer whose square goes red loses the square but not the session: they drop back into the pool and can be drawn onto a different square later.

**Model B is the recommendation.** It is more work in state and less work everywhere else, and it fixes four things Model A leaves broken:

| Problem | Model A | Model B |
|---|---|---|
| Repeated slots | Buying Gates of Olympus three times is dull television — needs a `retrySlot: 'reroll'` sub-toggle to avoid | Solved for free. New owner, new slot, every time. |
| Chat goes quiet mid-board | Nothing for a losing viewer to do | Every loss is a hype beat and a reason to type. A loss reopens a square *and* refills it on stream. |
| Late entry (§5.3) | Unlock schedule has to be rescaled, joins still close early | The board generates its own entry points all session. The queue is always real. |
| New machinery | A retry queue and a re-shuffled round order | Reuses the standby pool and unlock mini-draw already specified in §5.2–5.3 |

What Model B costs: a square now has an ownership *history*, not an owner, and the state model has to carry it (§10). That is the whole bill.

**Model A is still worth having** as `retryModel: 'square'` for a streamer who thinks the viewer–slot bond is the point — a viewer who picked Sugar Rush 1000 should ride Sugar Rush 1000 until it pays or kills them. It is a legitimate taste. It is not the default.

---

### 6.5.3 Model B in detail

**The pool.** One pool, two sources: viewers who joined and have not yet been drawn (standby, §5.2), and viewers whose square went red. No distinction between them at draw time — a viewer who lost on pick 4 and a viewer who arrived at pick 40 have identical odds. Anything else needs defending on stream, and there is no defence.

**Re-entry is automatic.** A losing viewer is returned to the pool without having to do anything — they may have stepped away, and punishing that is punishing the wrong thing. But chat invites them back in, because that invitation is the point:

```
↳ @slotgoblin C3 didn't pay — you're back in the pool with 47 others.
  !join <slot> to switch slots, or sit tight with Gates of Olympus.
```

**Their slot follows them unless they change it.** A re-`!join` replaces it, same rule as §4. Whether the slot they just lost on is re-claimable by *anyone* is `burnPlayedSlots` — default **true**, so a slot that has been bought is done for the session and the board keeps producing fresh content. A streamer who wants revenge narratives can turn it off.

**No immediate redraw onto the same square.** A viewer cannot be drawn back onto the square that just burned them in the same draw — it reads as rigged even when it is seeded and provable. They are eligible again at the next reopening. Waived when the pool would otherwise be empty.

**Empty pool.** Same ladder as §13: the square stays OPEN and rolls into the next reopening, or the streamer fills it as HOUSE. On a small board with a small pool the losers are the pool, which is fine — Model B degrades gracefully into Model A rather than stalling.

**Cursed squares are free content.** A square that has burned three viewers is the best story on the board, and the overlay should say so — *"C3 · 3 burned"* on the tile, named in the reopening announcement. It costs one counter that the ownership history already contains.

**Winners are whoever holds the square when the line completes.** A viewer who went red on C3 at pick 4 has no claim on C3's line, even if they were on it longer than the person who greened it. Greens are the claim. Say it once at setup and it never comes up again.

---

### 6.5.4 Endless is a different game, not a longer one

Worth stating plainly, because it changes what the overlay is for. If red always resets, **no line can ever die.** The line state machine collapses to open / one-away / complete, `linesAlive` is a constant, and the moment §1 is built around — one red in the centre killing four lines at once — cannot happen.

Endless is a **race**: which line greens out first. The default board is a **survival**: who is still alive. Both are real games. They are not the same game, and the overlay has to declare which one is running:

| | Sudden Death / finite retries | Endless |
|---|---|---|
| Tension meter | `lines alive: 7 of 12` | line leaderboard — `Middle row 4/5 · Col C 4/5 · Diag A 3/5` |
| The antagonist | reds killing lines | **the money** — net position against the budget cap |
| Loudest moment | a line reaching one-away | **match point** (§7) |

In Endless the running total inherited from Bonus Hunt stops being a nice-to-have and becomes the doom clock: *"€4,200 spent · budget €5,000 · 3 lines at 4/5."* Without it Endless has no source of dread at all, and a game with a guaranteed happy ending and no dread is a screensaver.

**Finite retries (1 or 2) keep both halves.** A line dies when every square on it has spent its last life and at least one is still red — the counter still falls, later and less brutally — and bingo goes from a one-in-twenty novelty to something that lands most sessions. This is the setting for a streamer who wants bingos without wanting a marathon, and it should be what the config screen nudges toward.

---

### 6.5.5 A wounded square is scarred, not neutral

Whichever model is running, a square that has been hit does **not** return to the neutral unplayed look.

- **Model A:** amber, with remaining lives as pips — `●●○`.
- **Model B:** OPEN again, but marked — the burn count and the name of who it took.

Neutral would be a lie about state. Viewers need to see at a glance which squares are one bad buy from taking a line down, and a square on its last life is the most interesting object on the board. It also keeps the red landing meaningful in a mode where it is not fatal: something visibly happened, and it visibly cost somebody something.

---

### 6.5.6 The sudden-death tail

Endless and 2-retry boards have a shape problem in the back half: **a handful of stubborn squares get hammered for an hour while twenty settled greens have nothing left to watch.** Their square is played, their line is decided or not, and they are spectators in a game they are nominally still in. Model B softens this for the losers — they are back in the pool with something to want — but does nothing for the greens.

`suddenDeathAfterRound` fixes the shape. Once the configured round is reached (default **2**, when retries are on at all), every remaining red gets **one final attempt** and then locks permanently, and the board resolves by bingo or best line. The near-guaranteed bingo survives; the grind does not.

The transition is announced loudly on the overlay and in chat. The rules just changed and everyone watching needs to know it before the next buy, not after.

---

### 6.5.7 Option: rebuy tokens instead of a rule

Worth building instead of the dial, or alongside it: give the board **N rebuy tokens** and let the streamer spend them.

Every retry becomes a decision and a moment — *"I'm spending a token on C3 because it kills three lines"* — rather than an accounting rule that fires invisibly. It fits the **Streamer's pick** stance already set in §5.1 and §6: visible, badged, never hidden. It keeps reds genuinely frightening, because a rebuy is scarce rather than owed. And it is markedly cheaper to build than a full retry mode: no round-2 order to commit, no unlock rescheduling, no ownership history. The board is still 25 picks plus a handful of interruptions.

**`rebuyTokens: 3` with `retriesPerSquare: 0` is a coherent and probably better v1 than the dial.** If only one of the two gets built, build this one.

---

### 6.5.8 Round order and caps

With Model A the pick order runs in rounds. Round 1 is the committed order from §5.1, unchanged. **Each later round is the surviving reds, reshuffled deterministically from the session seed salted with the round index** — so the session stays replayable from the log and the same square is not permanently last in the queue.

Model B needs no round machinery at all: a reopened square keeps its position in the original committed order and is simply played again when the cursor comes back around, or appended to the end of the order if the cursor has passed it. The §5.1 commitment holds either way, because it was always a commitment about *squares*, never about *people* (§5.2).

**A budget or buy cap must respect round boundaries: do not start a round the cap cannot finish.** Otherwise squares late in the order silently get fewer attempts than squares early in it, which is exactly the invisible unfairness §5.1 exists to prevent. If the cap bites mid-board, the overlay says so plainly and the board resolves by best line, labelled the same way as a settle (§8).

---

## 7. Line arithmetic

**3×3** — 3 rows + 3 columns + 2 diagonals = **8 lines**
**5×5** — 5 rows + 5 columns + 2 diagonals = **12 lines**

Every line is in exactly one of four states, recomputed after each result:

| State | Definition | Overlay |
|---|---|---|
| **Open** | No permanent reds, not yet full | Normal |
| **One away** | No permanent reds, one square left to settle | **Pulsing.** This is the money state. |
| **Dead** | Contains a permanent red | Dimmed, struck through |
| **Complete** | All green | BINGO |

*Permanent* means what it says at `retriesPerSquare: 0` — any red at all. With retries on, see §7.1.

**Show a live "lines alive" counter.** `7 of 12` dropping to `3 of 12` on a bad centre square is the tension meter, and it costs one number on screen.

**One-away has to be loud.** A line one square from completing, and the next pick threatening it, is the single highest-value UI moment in this game. If the overlay renders nothing else well, render this.

### 7.1 With retries on

Two things change (§6.5). Neither touches the state machine — only the predicate that feeds it.

**Dead means exhausted, not red.** A line dies when a square on it is red *and* out of lives — or, under Model B, red with the pool empty and no reopening coming. Until then a red is a wound and the line stays open. Recompute exactly as before; the definition of a permanent red is the only thing that moved.

**One-away stops being the money moment.** With retries a line enters one-away constantly, leaves it, and re-enters — it is weather, not news. The state that carries the tension becomes **match point**: *the square about to be bought is the last unsettled square on a live line, and this buy can end the board right now.*

| | One away | Match point |
|---|---|---|
| A property of | a line | the square armed **now** |
| Fires when | the line reaches one square remaining | the armed square would complete a live line if it greens |
| Frequency with retries on | often | rare, and always meaningful |

Match point is to the retry board what one-away is to the default board. If the overlay renders one thing well in retry mode, render this.

**In Endless, drop `linesAlive` from the overlay entirely.** It is a constant, and a counter that never moves reads as broken software. Swap it for the line leaderboard from §6.5.4.

### Optional: free centre

A `freeCentre` toggle for 5×5 makes the centre square an automatic green that nobody owns. It roughly doubles instant-bingo odds (~5% → ~8%) because the four lines through the centre then need only four greens. Off by default; offered because some streamers will want the swing.

---

## 8. Resolution

### Instant bingo

The first line to go fully green ends the board immediately. Everyone on it wins. If a single square completes **two** lines at once, both are announced and everyone on either wins — don't pick one.

### Best line

The board fills with no bingo. Winner is the line with the **highest combined multiplier** across its squares.

**Tiebreak ladder** — same shape as Tournament §14:

1. Higher combined payout
2. More green squares
3. Lower combined buy cost
4. Seeded coin flip — session seed + line id

#### Scoring with retries on

**Combined multiplier is the wrong score once squares get retried, and it inverts the game.**

Score each square on the multiplier of its *settling* attempt and a square that went 0.2× → 0.4× → 80× contributes 80×, while a square that greened first time at 1.3× contributes 1.3×. The line that burned the most money got the most lottery tickets and is now the most likely to win. Failure is rewarded, directly and mechanically.

**So with `retriesPerSquare != 0`, best line is scored on net:**

```
lineScore = Σ payout − Σ buyCost
            across EVERY attempt on every square in the line, reds included
```

This restores the property §2 was built on — *a red does not eliminate a line, it weighs it down* — which retries otherwise delete by erasing the red from the square. The red is gone from the board and still on the line's ledger, which is exactly right. Under Model B it also means a viewer who lost on a square still leaves a mark on that line's score long after they have been drawn onto a different one.

The useful side effect: a line score is now a real bonus-hunt P&L, denominated in the same currency as the running total the streamer and chat have been watching all session. `Middle row · +€1,840` needs no explaining.

**Tiebreak ladder, retry mode:**

1. Higher combined payout
2. **Fewer total attempts** — the line that got there cleanest
3. Lower combined buy cost
4. Seeded coin flip — session seed + line id

*More green squares* drops out of the ladder: with retries, every square that settles is green, so it discriminates nothing.

**Show both scores all session, and name the one in force.** Combined multiplier and net can crown different lines, and a viewer who spent three hours tracking the wrong number will read the result as broken software — which is the same failure the next paragraph is about.

**Always state on screen how it was decided.** An unexplained winning line reads as broken software.

### Settle early

Real streams run out of time and money. `board.settleEarly` ends the board where it stands and awards the best line among **completed** squares only. It is announced on the overlay and in chat as **settled early** — never silently. A line with unplayed squares can't win a settle; only fully-played lines are eligible.

With retries on, *fully played* means every square on the line has settled — green, or red with no lives left and no reopening pending. A line still holding a wounded square is not eligible, on the same principle. A board stopped by a budget or buy cap (§6.5.8) resolves identically and is labelled **capped** rather than settled, so the log distinguishes the streamer choosing to stop from the streamer running out of room.

---

## 9. Commands

Deliberately minimal. Viewers who don't get a square are spectators in v1 — the prediction layer is deferred, see §14.

| Command | Who | Notes |
|---|---|---|
| `!join <slot>` | Viewers | Live from session start until the last square unlocks. Replaces previous entry. |
| `!board` | Viewers | Lines alive, squares played, current best line. Batched reply, 60s per channel. |
| `!mysquare` | Viewers | Which square you hold, what it paid, whether your lines are alive. With retries on, lives remaining. In standby **or back in the pool after a loss**, your position and what happens next. 20s per viewer. |

### Control actions (dashboard only)

`join.close` · `board.setSize` · `reserve.add` · `reserve.remove` · `pool.resolve` · `pool.remove` · `draw.run` · `unlock.run` · `unlock.skip` · `square.fillHouse` · `square.pick` · `square.pickManual` · `square.result` · `square.revert` · `square.rebuy` · `square.reopen` · `board.suddenDeath` · `board.settleEarly` · `bingo.abandon`

`join.close` now closes only the *opening* window and triggers the main draw. Joins reopen immediately into standby. `unlock.run` fires a scheduled mini-draw early; `unlock.skip` converts an open square to HOUSE when the streamer wants to stop taking entries.

`square.rebuy` spends a rebuy token on a red square (§6.5.7). `square.reopen` manually returns a square to the pool under Model B — for a viewer who has clearly left, or a result entered against the wrong square. `board.suddenDeath` triggers the tail early, locking every remaining red to one final attempt.

`square.revert` matters more here than in Tournament — a mistyped payout doesn't just flip one square, it can resurrect or kill four lines at once. Reverting must recompute line state from scratch rather than undoing incrementally.

**With retries, `square.revert` pops the last attempt and restores what it consumed** — the life under Model A, the ownership and the pool re-entry under Model B — then recomputes every line from scratch as above. Three guards:

- Reverting anything other than the square's most recent attempt is rejected outright.
- Under Model B, if the square has already been redrawn to a new owner, revert is rejected — un-drawing a viewer who has been announced on stream is worse than the typo. Use `square.reopen` and re-enter the correct result.
- Once the board is `complete`, revert is blocked entirely. A green that already fired a bingo and named winners in chat is not an edit; that is `bingo.abandon`.

---

## 10. State

```ts
type BingoPhase = 'joining' | 'draw' | 'placement' | 'pick' | 'buying' | 'result' | 'complete'

type SquareTier = 'red' | 'green' | 'gold'

interface Square {
  /** 'C3' — column letter, row number. Stable id used everywhere. */
  id: string
  row: number
  col: number
  /** null while OPEN, and for HOUSE and free-centre squares. */
  userId: string | null
  username: string | null
  slotId: string | null
  slotName: string | null
  owner: 'viewer' | 'house' | 'free' | 'open'
  source: 'reserved' | 'random' | 'unlock' | 'house'
  /** Set on held-back squares. Cleared when an unlock draw fills it. */
  unlockAfterPick: number | null
  claimedAtSeq: number | null

  /** Every bonus bought on this square. Length > 1 only with retries (§6.5). */
  attempts: Attempt[]
  /** Every viewer who has held it. Length > 1 only under Model B. Append-only. */
  history: Ownership[]
  /** Model A: retries left, starts at config.retriesPerSquare, null = Endless.
   *  Model B: unused — the pool is the life supply. */
  livesLeft: number | null
  status: 'unplayed' | 'wounded' | 'settled'
  /** Tier of the settling attempt. null until settled. */
  tier: SquareTier | null
  /** Streamer chose this square out of order. Badged openly. */
  manualPick: boolean
}

interface Attempt {
  seq: number
  round: number
  /** Who owned the square for this attempt. Not necessarily the current owner. */
  userId: string | null
  username: string | null
  slotId: string
  slotName: string
  buyCost: number
  payout: number
  /** payout / buyCost. Computed, never entered. */
  multiplier: number
  tier: SquareTier
  /** Paid for with a rebuy token rather than a life. §6.5.7 */
  rebuy: boolean
}

interface Ownership {
  userId: string
  username: string
  slotId: string
  slotName: string
  claimedAtSeq: number
  via: 'draw' | 'unlock' | 'reentry'
  /** Set when this owner went red and the square reopened. Model B. */
  burnedAtSeq: number | null
}

interface Line {
  id: string                 // 'row3' | 'col2' | 'diagA' | 'diagB'
  squareIds: string[]
  state: 'open' | 'oneAway' | 'dead' | 'complete'
  /** Sum of multipliers across settling attempts. Best-line score at retries: 0. */
  totalMultiplier: number
  /** Across EVERY attempt on the line, reds included. */
  totalPayout: number
  totalCost: number
  /** totalPayout − totalCost. Best-line score whenever retries are on. §8 */
  netScore: number
  /** Bonuses bought across the line. Retry-mode tiebreak 2. */
  attemptCount: number
  greenCount: number
}

interface BingoState {
  phase: BingoPhase
  size: 3 | 5
  greenThresholdX: number
  bigWinThresholdX: number
  freeCentre: boolean

  /** §6.5. 0 = sudden death (default). null = Endless. */
  retriesPerSquare: number | null
  /** 'square' = owner keeps it. 'reentry' = owner returns to the pool. §6.5.2 */
  retryModel: 'square' | 'reentry'
  /** Model A only. Model B always draws a fresh owner and slot. */
  retrySlot: 'same' | 'reroll'
  /** A played slot is done for the session. Model B. */
  burnPlayedSlots: boolean
  /** Streamer-spendable retries, independent of the dial. §6.5.7 */
  rebuyTokens: number
  rebuyTokensUsed: number
  /** Round after which every remaining red gets one final attempt. null = off. */
  suddenDeathAfterRound: number | null
  suddenDeathActive: boolean
  /** Hard stops. Board resolves by best line, labelled 'capped'. §6.5.8 */
  budgetCapCents: number | null
  maxBuys: number | null

  pool: PoolMember[]          // identical shape to Tournament
  reservedUserIds: string[]
  drawCompleted: boolean

  /** Waiting for a square: joined after the main draw, or knocked back into the
   *  pool by a red under Model B. One pool, no distinction at draw time. §6.5.3 */
  standby: PoolMember[]
  /** True from session start until the last square unlocks. */
  joinsOpen: boolean
  /** Pick numbers at which a held-back square opens, ascending. */
  unlockSchedule: number[]
  unlocksDone: number
  /** Seq at which the last unlock draw ran — scopes the next one's pool. */
  lastUnlockSeq: number | null

  squares: Square[]
  lines: Line[]

  /** Committed at draw time from the session seed. Never re-rolled. */
  pickOrder: string[]
  pickCursor: number
  currentSquareId: string | null
  /** 1-indexed. Model A: round 2+ is the surviving reds, reshuffled from
   *  seed + round index. Model B: always 1 — reopened squares keep their slot
   *  in pickOrder, or are appended if the cursor has passed. §6.5.8 */
  round: number
  roundOrder: string[]

  joinWindowEndsAt: number | null
  joinsClosed: boolean

  bingoLines: string[]        // populated only on instant bingo
  winningLine: string | null
  winners: { userId: string; username: string; slotName: string; squareId: string }[]
  decidedBy: 'bingo' | 'bestLine' | 'net' | 'payout' | 'greenCount' | 'attempts'
             | 'cost' | 'coinflip' | 'settledEarly' | 'capped' | null
  settledEarly: boolean

  lastStatusReplyAt: number | null
}
```

### Derived — computed, never stored

- `linesAlive` — lines not dead
- `squaresPlayed` / `squaresRemaining`
- `totalSpent` / `totalReturned` / `netPosition` — the bonus hunt meter, free
- `projectedSpend` — `squaresRemaining × averageBuyCost`
- `bestLineSoFar` — highest `totalMultiplier` among lines that could still win
- `picksUntilNextUnlock` — drives the overlay countdown and the `!join` ack
- `standbyCount` — how many people are waiting on the next unlock or reopening

Retry mode adds (§6.5):

- `matchPointLines` — lines the armed square would complete if it greens. Drives the loudest state on the retry overlay (§7.1)
- `lineLeaderboard` — lines ranked by greens then `netScore`. Replaces `linesAlive` in Endless
- `livesRemaining` — unspent lives across the board; feeds live projected spend
- `burnCount` per square — `history.filter(h => h.burnedAtSeq).length`. The cursed-square counter
- `poolCount` — standby plus knocked-back viewers, i.e. everyone still in with a shot

---

## 11. Config

```ts
{
  size: 3 | 5                          // default 5
  openSquares: number                  // default 3 on 5×5, 1 on 3×3. 0 disables late entry.
  greenThresholdX: number              // default 1.00
  bigWinThresholdX: number             // default 50
  freeCentre: boolean                  // default false, 5×5 only
  joinGate: 'anyone' | 'followers' | 'subscribers'
  joinWindowMs: number | null          // default 300_000
  uniqueSlots: boolean                 // default true
  announceDraw: boolean                // default true
  allowManualPick: boolean             // default true
  allowSettleEarly: boolean            // default true

  // §6.5 — retries
  retriesPerSquare: number | null       // default 0 (sudden death). null = Endless.
  retryModel: 'square' | 'reentry'      // default 'reentry'
  retrySlot: 'same' | 'reroll'          // Model A only. 'same' at 1, 'reroll' at 2+
  burnPlayedSlots: boolean              // Model B. default true
  rebuyTokens: number                   // default 0
  suddenDeathAfterRound: number | null  // default 2 when retries on, else null
  budgetCapCents: number | null         // default null. REQUIRED when Endless.
  maxBuys: number | null                // default null
}
```

**The config screen must show projected spend.** `25 squares × your typical buy` is a number the streamer needs before they start, not after square 14. A 5×5 is a full-session commitment and the UI should say so plainly.

**And it must recompute on the retry dial, in the same breath as the dial moves.** Switching a 5×5 from Sudden Death to Endless takes projected spend from €2,500 to roughly €6,000 and the session from two hours to four (§6.5.1). If that number does not move visibly when the toggle does, the toggle is a trap.

**`retriesPerSquare: null` without `budgetCapCents` must be refused, not warned about.** An uncapped Endless 5×5 has no upper bound on what it costs, and a warning is something a streamer clicks through at 9pm and regrets at 1am. Require the cap; the game still ends, it just ends on the cap instead of on nothing.

---

## 12. Chat behaviour

A 25-square board is 25 potential announcements, which is straight into the quota wall (§6.3) and straight past "only speak when useful" (§15.1).

**Per-square results do not go to chat by default.** The overlay is where results live. Chat gets:

| Moment | Priority |
|---|---|
| Board locked, draw complete | `announce` |
| Gold square | `announce` |
| A line reaches one-away | `announce`, deduped — once per line **per entry**, 5-minute cooldown |
| Match point — the armed square can end the board | `announce`, retry mode only |
| A red reopens a square and its owner rejoins the pool | `announce` (Model B) |
| A rebuy token is spent | `announce` |
| Sudden-death tail begins | `announce` |
| A square unlocks and is claimed | `announce` |
| BINGO | `announce` |
| Final result / best line | `announce` |

All held behind the stream delay (§15.3) — chat must not spoil a reveal the overlay hasn't shown yet.

The one-away dedupe changes shape with retries on: a line can reach one-away, get knocked back by a red, and reach it again, so *once per line ever* would silence the second and third time — which are the ones that matter. Once per line **per entry into the state**, with a cooldown so a square flipping back and forth cannot spam it.

### Templates

**Bingo**
```
BINGO! {lineName} completed — @{u1}, @{u2}, @{u3}, @{u4}, @{u5} all win.
Sealed by {slotName} paying {multiplier}x.
```
> BINGO! Middle row completed — @slotgoblin, @bonusbandit, @reelqueen, @tumblewin, @maxwinmike all win. Sealed by Gates of Olympus paying 214x.

**Best line**
```
Board complete, no bingo. {lineName} takes it on {total}x combined —
@{u1}, @{u2}, @{u3}, @{u4}, @{u5}. Best square: {slotName} at {multiplier}x.
```

**One away**
```
{lineName} is one square from BINGO — {squareId} decides it.
```

**Square unlocked**
```
{squareId} is OPEN — drawn from {n} standby entries: @{username} takes it
with {slotName}. Sits on {liveLines} live lines.
```
> C4 is OPEN — drawn from 47 standby entries: @lateshow takes it with Sugar Rush 1000. Sits on 2 live lines.

**Match point**
```
{squareId} for the board — @{username} on {slotName}.
Greens it and {lineName} is BINGO.
```

**Square reopened** *(Model B, §6.5.3)*
```
{squareId} didn't pay — @{username} goes back in the pool.
Square reopens, {poolCount} waiting. {burnCount} burned here now.
```
> C3 didn't pay — @slotgoblin goes back in the pool. Square reopens, 47 waiting. 3 burned here now.

**Rebuy**
```
@{username} gets another shot — {squareId} rebought on {slotName}. {n} tokens left.
```

**Sudden death**
```
SUDDEN DEATH — {n} squares left, one attempt each. No more rebuys.
```

The unlock announcement is the one place chat earns extra traffic mid-board: it's the only signal that tells a viewer who just arrived that there's still a way in.

Board ends with nobody winning is impossible by construction, which is the point of §2. A session **abandoned** mid-board sends nothing, per §15.4.

---

## 13. Edge cases

| Case | Behaviour |
|---|---|
| Fewer joiners than squares | Offer next size down, then HOUSE fill (§5) |
| Slot unresolvable at join | Unresolved queue, same as Hunt and Tournament |
| Duplicate slot claimed | Rejected to chat with the claimant named |
| Buy cost entered as zero | Rejected — cost must exceed zero |
| Payout zero | Valid and common. Red square, 0.00× |
| One square completes two lines | Both announced, everyone on either wins |
| Mistyped result | `square.revert`, then recompute all line state from scratch |
| Streamer settles early | Best line among fully-played lines only, labelled "settled early" |
| Nobody in standby when a square unlocks | Square stays OPEN and rolls into the next unlock — two drawn then. Last unlock with an empty standby → HOUSE |
| Open square reached in the pick order unclaimed | Plays as HOUSE. Rare by construction (§5.3) but must not stall the board |
| Standby entry duplicates a slot already on the board | Rejected at join time, same as any duplicate — checked again at unlock in case the board changed |
| Standby viewer already holds a square | Can't happen — one square per viewer, and a second `!join` replaces rather than adds |
| Streamer wants entries to stop mid-board | `unlock.skip` converts remaining open squares to HOUSE and closes joins |
| Session abandoned mid-board | No winner, no announcement, board state saved to history |
| Viewer's Kick username changes mid-session | Username captured at join, same as §15.5 |
| **Retry mode** — square greens on attempt 3 | Line scored on net across all three attempts, reds included (§8) |
| Endless configured with no budget cap | Config refuses to start the board. Not a warning (§11) |
| Model B — pool empty when a square reopens | Square stays OPEN and rolls into the next reopening; last one goes HOUSE. Same ladder as an empty standby |
| Model B — only losers left in the pool | Fine. Degrades gracefully into Model A rather than stalling |
| Model B — viewer redrawn onto the square that just burned them | Blocked for one draw. Waived if the pool would otherwise be empty (§6.5.3) |
| Model B — viewer goes red, leaves the stream, gets redrawn | Allowed. Re-entry is automatic and absence isn't a forfeit; the square plays normally |
| Model B — winning line contains a square that burned someone earlier | Only the current holder wins. Greens are the claim, reds leave a mark on the line's net score and nothing else |
| Slot burned then re-`!join`ed by someone else | Rejected while `burnPlayedSlots` is true (default). Allowed when off |
| Reroll can't find an unclaimed slot (Model A) | Falls back to `same`, announced as such |
| House square goes red with retries on | Locks immediately. House squares get zero lives — no spending real money on a square that wins nobody anything |
| Free-centre square with retries on | Never retried. It was never played |
| Rebuy token spent on a square whose lines are all dead | Allowed and badged. The streamer's call, visibly theirs |
| Sudden death triggered while a square is armed | Applies from the next pick. The in-flight buy resolves under the old rules |
| Budget or buy cap reached mid-round | Board resolves by best line, labelled **capped**, not settled (§8). Never start a round the cap can't finish (§6.5.8) |
| Revert requested on the green that fired the bingo | Blocked. `bingo.abandon` (§9) |

---

## 14. What's excluded and what's deferred

**No prediction layer. Not in v1, not later.** Tournament has one because a bracket eliminates people and the several hundred who didn't get a seat need somewhere to go. Bingo doesn't work that way — nobody is eliminated, the board is one shared object, and late arrivals get in through open squares. Bolting `!line` voting on top would add a second scoreboard competing with the board for attention and make the two games harder to tell apart. The board is the game.

### Deferred

- **7×7** — 49 bonus buys is a marathon, not a session. Behind a special-event flag later, if streamers ask.
- **Condition squares** — the original Bonus Bingo idea ("a bonus pays 100×+", "a Pragmatic slot pays under 10×") returns as optional **wildcard squares** mixed into a viewer board.
- **Per-viewer boards** — breaks the never-leave-the-stream principle. Excluded, same as §26.

---

## 15. Build ledger

**Reused unchanged**

| Piece | From |
|---|---|
| `drawSeats()` — pool, reserved seats, seeded fill | `core/primitives/draw` |
| Join window, one-entry-per-viewer, edit-until-lock | `core/primitives/submission-window` |
| Slot resolution + unresolved queue | `catalog` |
| Two-number result entry → multiplier | Tournament `match.result` |
| Money handling, multiplier computation | `core/primitives/money` |
| Seeded RNG for placement, pick order, coin flip | `core/primitives/rng` |
| Unlock mini-draws — same `drawSeats()` against the standby pool | `core/primitives/draw` |
| Running total / net position meter | Bonus Hunt derived values |

**Genuinely new**

1. Board geometry — square ids, line enumeration, membership lookup
2. Line state machine — open / one-away / dead / complete, recomputed after every result
3. Best-line scoring and the tiebreak ladder
4. Constrained pick-order commit — open squares placed after their unlock point, rest shuffled into what remains
5. Unlock scheduling — standby pool, scoped mini-draws, roll-forward on an empty standby
6. Board overlay — the grid, the pick animation, one-away pulsing, lines-alive counter, unlock countdown

**Retry mode (§6.5) adds:**

7. Lives and the attempts ledger — plus the round re-shuffle for Model A, and the sudden-death tail
8. Ownership history and pool re-entry for Model B — mostly wiring, since the draw and the pool already exist from item 5
9. Net line scoring alongside multiplier scoring, both on screen, with the active one named
10. Match-point detection, the Endless line leaderboard, and the wounded/burned square treatment

Items 1–5 are small and pure — a few hundred lines of reducer with heavy test coverage and no I/O. **Item 6 is the actual build.** The rules of this game are simple; the reason it will feel good or feel flat is entirely the overlay.

Items 7–10 are the same shape: 7–9 are pure reducer work, 10 is overlay. Item 8 is the cheapest of the four because §5.2–5.3 already built the pool and the mini-draw — Model B is largely a matter of calling them for a second reason.

**Build order:** board geometry + line state (tested in isolation) → constrained order commit → reducer wired to the existing draw and result-entry flow → overlay grid → pick animation and one-away treatment → unlock draws and countdown → chat templates → **rebuy tokens** → **retry dial and Model B** → match point and the Endless leaderboard.

Unlocks come late in the order deliberately: the board has to be worth watching before late entry is worth anything.

Retries come later still, and rebuy tokens (§6.5.7) come before the dial on purpose. Tokens are a fraction of the work, they exercise the same "a red isn't necessarily final" path, and they answer the question the dial exists to answer — *can this board reach a bingo?* — without committing to rounds, ownership history, or a rescaled unlock schedule. If tokens land and streamers don't ask for more, the dial was never needed.

If Tournament proved the architecture by taking days rather than weeks, Slot Bingo should take less than Tournament did. If it doesn't, that's the signal worth paying attention to.
