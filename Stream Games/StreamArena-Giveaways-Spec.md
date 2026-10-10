# StreamArena — Game 5: Giveaways

**Status:** design, pre-build · **Revision 1** · **Depends on:** Slot Tournament (entry pool, seeded draw, reserved picks), Team Battles (committed-randomness doctrine, takeover animation as playback), Bingo (standby pool), Core (winner announcement, stream delay) · **Companion:** `StreamArena-Giveaways-UI.md` · **Excluded by decision:** prize custody and delivery (§17), watch-time auto-drops (§17)

---

## 1. Concept

The streamer opens entry and announces a prize. Chat types one word. A countdown runs. Entries lock, a reel of real usernames spins down, and one name settles. That viewer has a clock to type `!claim`. If the clock runs out, the prize moves to the next name on a list that was fixed before anyone entered.

That is the entire game, and it is the shortest thing in the catalog by an order of magnitude — three to six minutes end to end, against forty-five for a tournament and two hours for a team battle.

Its shape is different from everything before it in three ways worth naming, because each one changes what the build has to be good at.

**It is the only game where the whole channel is in it.** Bonus Hunt takes thirty slot requests. Tournament seats sixteen. Team Battles draws fifteen. A giveaway takes everybody, and the entry bar is one word with nothing at stake. The participation number is not a vanity metric here — it is the only measure of whether the game worked, and the design should be read as a long argument about removing reasons not to type.

**It has no scoreboard and nothing to watch.** Every other game in the catalog earns attention by having state that changes. During a giveaway's entry window the overlay has one number on it that goes up. The drama is entirely in the clock and entirely in the reveal, which means the two things this build must get right are a countdown and an animation — and almost nothing else.

**It is the only game the streamer is not playing.** They are not buying bonuses or entering results. They open it, and three minutes later they read a name. This makes it the natural filler between segments and the natural opener for a stream, and it is also why it will be run more often than anything else in the catalog.

**One structural warning up front.** The thing this game most wants is to run *inside* another game — a giveaway during the collection phase of a bonus hunt, between tournament rounds, while a team battle waits on a buy. The runtime does not support concurrent sessions on a channel (Product Overview §9, "later"), so v1 is a standalone session that the streamer stops the other game to run. That is survivable and it is not ideal, and Giveaways is the strongest argument the platform has yet produced for making concurrency a real priority. Noted in §18 rather than solved here.

---

## 2. The clock trap, and why the entry window has a floor

This is the decision the game hinges on, and it is not about randomness at all. It is about the fact that **the viewer is watching the past.**

A Kick stream reaches a viewer somewhere between 8 and 30 seconds after it happens, and considerably later than that on a phone, a poor connection, or a re-buffering session. Chat, meanwhile, is close to instant in both directions. So a viewer's usable entry window is not the window the streamer set:

```
usable window  =  announced window  −  their stream delay  −  reaction time
```

At a five-second reaction, that produces this:

| Announced window | Delay 10s | Delay 20s | Delay 30s | Delay 45s |
|---|---|---|---|---|
| 30s | 15s | 5s | **none** | **none** |
| 60s | 45s | 35s | 25s | 10s |
| 120s | 105s | 95s | 85s | 70s |
| 180s | 165s | 155s | 145s | 130s |

**A thirty-second giveaway is not a fast giveaway. It is a giveaway that excludes every viewer on a slow connection**, which correlates with mobile, which correlates with a meaningful share of the channel. And it excludes them silently — they type, the entry is rejected as late, and their experience is that the giveaway was over before they saw it start.

There is a second, nastier half. When the streamer closes entry at wall-clock time *T*, the viewer's overlay countdown reaches zero at *T + delay*. A viewer who types the instant their own countdown hits zero has typed **after** the server closed. They did exactly the right thing and were rejected for it. This is the single most common giveaway support complaint in the wild and it is entirely an artefact of the delay.

Four rules come out of this, and they are not preferences:

**1. The entry window has a hard floor of 60 seconds and a default of 180.** The config screen refuses to go below the floor. Anything shorter is not a design choice, it is a bug with a number on it.

**2. The overlay countdown is the contract, and the server closes late to honour it.** Entry closes at countdown-zero plus a grace period, and the grace equals the channel's configured stream delay plus five seconds. A viewer who types when their screen says zero always makes it. The grace is invisible — nothing is announced, nothing is badged, the count simply keeps accepting for a few more seconds and then stops.

**3. There is no snap close.** The streamer can shorten the window, and doing so restarts a visible countdown of at least fifteen seconds plus grace. A "closing entries now" button that closes entries now would re-create the exact failure the grace period exists to prevent.

**4. The chat announcement is not how entry opens.** By the time a bot message about a thirty-second window has been read, the window is gone. Chat announces the *prize*; the overlay countdown runs the *clock*. Every timing decision in this document assumes the viewer is looking at the overlay, because that is the only surface where the clock and the video are on the same delay.

**The corollary that matters most:** everywhere else in this document, when a duration is defended, the defence is this section. The claim window in §8 has a floor for the same reason and the floor is larger.

---

## 3. Provable fairness — commit the seed, publish the order

Every game in this catalog attracts the accusation that it was rigged. This is the one where the accusation is worth money, and it is also the one where the streamer has an actual friend in chat they would plausibly like to win.

Team Battles solved its version of this by committing the flip sequence before the session opened (§6.1 of that document), because a coin flip is bound to a *pick index* and can be decided before anyone exists. **A giveaway cannot do that** — the draw depends on who entered, and the entrants do not exist when the session opens. So the commitment moves one level down.

**The construction, in full:**

At `OPEN`, before a single entry is accepted, the server generates a random seed, stores it, and publishes `SHA-256(seed)` — truncated to twelve characters for legibility — to the overlay and to chat, once. The seed itself stays secret.

At `AWARDED` or `COMPLETE`, the server publishes three things: the seed, the complete entry list in join order with each entrant's weight, and a pointer to the documented draw function. Anybody can recompute the entire result. The draw is deterministic: seed plus ordered entry list plus weights produces one ordered output, every time, for anybody who runs it.

**This is what makes it airtight:** the streamer could not have chosen a favourable seed, because the seed was fixed and published-in-hash before they knew who would enter. And they could not have chosen a favourable entry list, because the entries arrived from chat. Neither half is under their control, and the two halves together are the whole result.

**The draw produces an order, not a winner.** This is the most important sentence in the section. One run of the draw function against the committed seed yields the full ranked list of every entrant — first place, second, third, all the way down. The winner is position one. When a prize goes unclaimed (§8), it moves to position two. When there are three prizes, they go to positions one, two and three.

So **a reroll is not a new random event.** It is a cursor advancing down a list that was determined before the first person typed. There is no re-roll button in the product, there is no code path that draws twice, and the state machine has no transition that regenerates a seed inside a session. That closes the entire category of accusation, permanently, and it costs one hash.

**Abandoned sessions are recorded.** A streamer who opens a giveaway, sees a name they dislike, and abandons the session leaves a public row in history saying exactly that, with the seed published anyway. The escape hatch stays open — a streamer must always be able to stop — but it is not silent, on the same doctrine as every other Abandon in the catalog.

**Publish a verification page.** A permanent, linkable page per completed giveaway showing the hash, the seed, the ordered entry list, and the resulting order, with the draw function's algorithm stated in plain terms next to it. This costs a template and it turns "prove it" into a URL.

---

## 4. Phases

```
IDLE → OPEN → LOCKED → DRAW → CLAIM ⇄ PASSOVER → AWARDED ─┐
                        ↑                                  │
                        └────── next prize ────────────────┘
                                                           ↓
                                                       COMPLETE
```

- **OPEN** — entries accepted. The countdown runs. The only phase with a clock the audience controls anything in.
- **LOCKED** — entries closed, draw not yet run. A deliberate held beat, three to five seconds, showing the final entry count. Do not skip it; the number is the payoff for the window and the audience has been watching it climb.
- **DRAW** — the reel runs (§7). Playback only.
- **CLAIM** — the winner's clock (§8).
- **PASSOVER** — the claim clock expired; the cursor advances and the reveal replays for the next name. A distinct phase, not a silent state change, because it must be shown.
- **AWARDED** — this prize is settled. If more prizes remain, back to `DRAW` with the cursor already advanced.
- **COMPLETE** — all prizes settled. Seed and entry list published.

`IDLE` exists so a configured giveaway can sit ready on the dashboard and be fired with one button when the streamer reaches a natural break. That is how this game will actually be used.

---

## 5. Entry

`!enter` — one word, one entry, and the keyword is the most themeable string in the product. Streamers will set it to `!drop`, `!gates`, the name of the prize, or an emote, and they should: a giveaway keyword that matches what the streamer is saying out loud converts better than a generic one. The config field is prefilled `!enter` and expects to be changed.

| Rule | Behaviour |
|---|---|
| One entry per viewer | Repeats are counted once and ignored silently. A second `!enter` is not an error |
| Case and punctuation | Insensitive, and trailing text is tolerated — `!enter please` enters |
| Gating | Anyone / followers / subscribers, per `entryGate` |
| Follow age | `minFollowAgeMins`, default 0. See §10 — this matters more than the gate itself |
| Account age | `minAccountAgeDays`, default 0. The alt-farm guard |
| Blocklist | Channel blocklist plus per-session removals by a mod |
| Late entries | Accepted within the grace period (§2), rejected after, never acked |
| Re-entry after a passover | The passed-over viewer stays in the order at their original position and cannot be drawn again this prize. For the *next* prize, `allowPreviousWinners` (default false) decides |

**Nothing is acked to an individual entrant. Ever.** This is a deliberate departure from the platform's errors-only default (Product Overview §5) and it is a quota decision before it is a design one: eight hundred entries in a follower-gated session produces eight hundred rejections, and a bot that replies to each of them is both impossible within Kick's rate limits and the worst thing that has ever happened to that channel's chat.

What replaces it:

- **The overlay states the gate permanently**, in the footer, at overlay-legal size: *"Followers only · following for 10+ minutes"*. Nobody should ever have to discover a gate by being rejected by it.
- **One batched rejection summary**, posted once at thirty seconds remaining and only if the count is non-trivial: *"41 entries didn't count — followers only. Follow and type !enter again, there's still time."* One message, actionable, timed so there is still a window left to act in.
- **The dashboard shows the rejection breakdown live**, so a streamer can see gating set too tight while they can still loosen it.

**The entry count is the hero number of the whole phase** and it should be treated as one. It counts up, it never counts down, and it is the largest thing on the overlay for three minutes.

---

## 6. Weighting

Flat by default. Streamers can weight by role or by activity, and the design work here is almost entirely about making the weighting *legible* rather than about the weighting itself.

| Mode | Behaviour |
|---|---|
| `flat` | One entry each. **Default.** |
| `role` | Multipliers per role — follower, sub tier 1 / 2 / 3, VIP, mod. Each configurable, capped |
| `activity` | Multipliers by messages sent this session, bucketed (§below) |
| `custom` | Role and activity multiplied together, for streamers who want both |

### 6.1 Weighting behaves as advertised — until the prizes get large relative to the pool

The intuitive worry is that weighted entries stop meaning what they say when several prizes are drawn from one pool without replacement. Simulated over 400,000 draws with 20% of the pool weighted at an advertised 5×:

| Pool | Prizes | Prizes as % of pool | P(weighted wins) | P(flat wins) | **Real multiple** |
|---|---|---|---|---|---|
| 400 | 1 | 0.25% | 0.7% | 0.1% | **4.99×** |
| 400 | 5 | 1.25% | 3.5% | 0.7% | **4.94×** |
| 100 | 5 | 5% | 13.6% | 2.8% | **4.77×** |
| 40 | 3 | 7.5% | 20.3% | 4.3% | **4.71×** |
| 100 | 10 | 10% | 26.4% | 5.9% | **4.49×** |
| 40 | 10 | 25% | 59.7% | 16.3% | **3.65×** |
| 400 | 100 | 25% | 59.3% | 16.4% | **3.61×** |
| 40 | 20 | 50% | 91.6% | 39.6% | **2.31×** |

The finding is cleaner than expected and worth stating plainly, because it kills a feature nobody now needs to build: **what matters is prizes as a percentage of the pool, and pool size is irrelevant.** Below about 5% of the pool the advertised multiple holds to within five percent of itself. It degrades slowly to about 10%, and only becomes a real distortion — 5× advertised behaving as 3.6× — when a quarter of the pool wins something.

So for the normal case (one to five prizes, a pool in the hundreds) the honest answer is that the weighting does exactly what the streamer told chat it does, and no correction, no disclaimer and no compensating machinery is needed. The distortion only appears in "everyone here gets a shot" sessions with tiny pools, and there it should simply be shown:

**The overlay displays computed odds, never ticket counts.** *"You: 1 in 214"* is a true statement a viewer can act on. *"You have 5 entries"* is a number whose meaning depends on facts the viewer does not have. The odds figure is recomputed live as the pool grows and it is computed against the actual number of prizes, which means it stays true in exactly the small-pool case where the ticket count would have lied.

### 6.2 The cap, and the argument for staying near flat

`maxWeight` is capped at **5× by default and 10× hard**, and the reason is not fairness. It is that **the purpose of a giveaway is participation, and heavy weighting suppresses it.** A non-sub who reads "subs get 20× entries" correctly concludes there is no point typing, and the entry count — the only number this game produces — falls. A giveaway that 200 people enter is a better giveaway than one that 60 people enter for a prize weighted toward the 60.

If the goal is genuinely to reward subscribers, a **sub-only session** does that honestly and completely, and it does not ask non-subs to participate in something they have been told they will lose. Heavy weighting is the worst of both: it looks open and isn't.

### 6.3 Activity weighting is bucketed, never linear

Linear weighting on message count is a machine for producing chat spam, and it rewards exactly the behaviour a streamer would otherwise mod against. Buckets:

| Messages this session | Weight |
|---|---|
| 0 | 1× *(they can still enter — see below)* |
| 1–4 | 1.5× |
| 5–19 | 2× |
| 20+ | 3× |

Three buckets, a low ceiling, and no reward at all for going past twenty. A lurker who types only `!enter` is never excluded and never zero-weighted; the mode rewards presence, it does not gate on it.

**Activity mode has an upstream dependency** — a per-session message counter that the runtime does not currently keep. It is small (a counter incremented in the existing chat pipeline, discarded at session end) but it does not exist today, and it is the only thing in this specification that has to be built outside the game module. Flagged in §18.

---

## 7. The draw

### 7.1 A reel of real names, and no fake-out

The animation is a vertical reel of usernames — real entrants, pulled from the actual pool — accelerating, blurring, decelerating, and settling on one. Three and a half to five seconds. It reuses the takeover machinery built for the Team Battles flip and it is playback, not decision: the order was fixed at `OPEN` (§3) and the client is animating a result it already holds.

**Team Battles' scripted fake-out is explicitly not used here, and the contrast is the design point.** There, the reel settles onto the losing colour, holds, and snaps — and the trick works because a coin has two faces and neither of them belongs to anyone. Here the faces are people. A reel that settles on `@bonusbandit`, holds long enough for chat and for @bonusbandit to believe it, and then moves to somebody else has shown a viewer they won a prize they did not win. There is no framing that makes that acceptable, and a streamer who runs it twice will be accused of the reroll this entire specification is built to make impossible.

**The rule, stated as a rule:** the reel decelerates through real names and settles exactly once. After the settle, nothing moves. Every other giveaway product's near-miss theatre is available in the deceleration — names passing slowly enough to read for the last second is all the tension the moment needs, and it is honest.

### 7.2 The reveal sequence

```
0.0s   LOCKED holds — final entry count, large, still           ← the payoff for the window
1.5s   the reel starts, names blurring upward
3.0s   deceleration, names become readable one at a time
4.3s   settle — the name lands and locks, card scales up
4.8s   the claim clock appears beneath it and starts            ← §8, and see the delay note
6.0s   card settles into the claim state
```

**Multiple prizes are revealed one at a time, smallest first.** The reel runs once per prize, the previous winner's card slides into a winners strip, and the last reveal of the session is the best prize. Revealing all winners at once throws away the only repeatable moment the game has, and revealing the best prize first makes everything after it an anticlimax.

**Skip control.** A "skip animation" button jumps to the settle frame. It changes nothing — the order was committed — and it exists for the streamer who is running the fifth giveaway of a long stream.

**Reconnect during the reel jumps to the settled state and never replays**, per the platform law (UI Brief §5) and for a sharper reason than usual: a replayed name reel is indistinguishable from a redraw.

---

## 8. The claim window

### 8.1 The clock starts when chat sees the name, not when the reel stops

The winner announcement goes to chat behind the standard stream delay, so it cannot spoil the reveal for viewers watching the overlay. **The claim clock starts when that message lands, not when the draw resolved.** Starting it at the draw would silently spend the delay — twelve to thirty seconds of a three-minute window — before the winner had any way of knowing they had won.

The overlay clock and the server clock both run from the announcement. They agree, because the thing they are counting is the same event.

### 8.2 The window

`!claim` in chat. Default **180 seconds**, floor **stream delay + 60 seconds**, enforced at config.

The floor is §2 again, one level harder. This viewer is not necessarily looking at the stream. They may be in another tab, on a phone in a pocket, or away. Sixty seconds of usable time is the minimum that gives an attentive viewer a real chance, and the default of three minutes is what gives a distracted one a chance.

**The claim countdown is better television than the reveal.** The reveal takes five seconds and resolves. The claim window is a named person with a visible clock and a chat full of people shouting at them, running for three minutes, with a real chance of a reversal at the end. It is the longest sustained tension this game produces and the overlay should treat it as the main event, not as an administrative postscript.

**Reminders in chat**, `@`-mentioning the winner, at 50% and at 20% remaining. This is the one place in this game where per-event chat writes are unambiguously worth the quota, because the message is addressed to exactly one person who needs to receive it.

### 8.3 Passover

When the clock expires, the cursor advances to the next position in the committed order (§3), and the overlay says so — the passed-over name stays on screen, struck through, labelled *"didn't claim in time"*, while the next name is revealed beneath it. **Openly, every time.** A silent substitution is the single most suspicious thing this product could do, and the whole construction in §3 exists so that this moment can be shown rather than hidden.

`maxPassovers` defaults to **3**. The justification, given a claim rate *p*:

| Claim rate | Prize still unclaimed after 0 / 1 / 2 / **3** / 4 passovers |
|---|---|
| 40% | 60% · 36% · 22% · **13%** · 8% |
| 50% | 50% · 25% · 13% · **6.3%** · 3.1% |
| 60% | 40% · 16% · 6.4% · **2.6%** · 1.0% |
| 70% | 30% · 9.0% · 2.7% · **0.8%** · 0.2% |
| 80% | 20% · 4.0% · 0.8% · **0.16%** · 0.03% |

At a 70% claim rate — achievable with a three-minute window and a prize worth claiming — three passovers settle 99.2% of prizes without the streamer having to make a judgement call. Below a 50% claim rate the dial is not the problem: the window is too short, or the prize does not matter to the audience, and both of those are visible on the dashboard.

**Watch the claim rate.** It is the health metric of this game, it is recorded per session, and a channel trending below 50% is being told something specific about either its timing or its prizes.

### 8.4 When the passovers run out

The streamer decides, explicitly, from three options on screen:

- **Award it to the last name anyway** — they may have replied in Discord, or the streamer may simply know them. Recorded as a manual award, with the mechanism named in the record.
- **Void this prize** — recorded, announced.
- **Run a fresh giveaway for it** — which is a *new session* with a *new seed*, publicly and by construction. There is no path that re-draws inside a session, and this option is deliberately shaped so that the only way to get a second draw is one that is visibly a second draw.

**Mods can award manually at any point** with `!ga award @user`, for the case that always happens: the winner is right there, talking, and typed `!clam`. Every manual award is logged, badged on the overlay as a manual award, and appears as such in the verification record. Visible generosity, again, rather than invisible discretion.

---

## 9. Prizes

A prize is a title, an optional description, an optional image, and an order. That is the entire model, and the sparseness is deliberate — see §17.

Sessions carry a prize list. Three prizes means three draws from one committed order, revealed smallest to largest (§7.2). Entrants remain eligible across prizes unless `allowPreviousWinners` is false, which is the default: winning one prize takes you out of the running for the rest, which spreads the session across three people instead of concentrating it in one.

**The winners record** — username, prize, claim time, claimed or manually awarded or voided — is the deliverable of the whole session. It exports, it appears on the verification page, and it is what a streamer looks at afterwards to see who they still owe.

---

## 10. The abuse surface

This is the only game in the catalog where a viewer can gain something by cheating, so it is the only one that needs this section at length.

### 10.1 Alt accounts

The attack is trivial: make ten Kick accounts, enter ten times, take ten times the odds. It costs a few minutes and it scales.

| Guard | Config | Notes |
|---|---|---|
| Account age | `minAccountAgeDays`, default **7** | The single most effective guard. A farm built this week is worthless; a farm built last month was built by somebody willing to plan a month ahead for a €50 prize, and there are not many of those |
| Follow age | `minFollowAgeMins`, default **10** | See §10.2 — this is the one people get wrong |
| Channel blocklist | shared across sessions | Known alts, known farms |
| Per-session removal | `!ga remove @user` | Mods, live |

**Both age guards depend on Kick's API exposing account creation timestamps and follow timestamps.** Follow timestamps are near-certain; account creation is less so. **This is the one genuine unknown in this specification and it should be verified against the live API before the build starts**, because if account age is unavailable, `minAccountAgeDays` cannot ship and the alt-farm guard reduces to follow age alone — which is materially weaker, and which the streamer needs to be told rather than left to assume.

### 10.2 Follower gating is weaker than it looks, and follow *age* is what you want

`entryGate: 'followers'` is the setting every streamer reaches for, and on its own it stops nothing. Following a Kick channel takes one click and can be undone immediately afterward. A gate that can be satisfied in two seconds by anyone who wants to satisfy it is not a gate; it is a follow button with extra steps, and the follows it produces churn out within the day.

**`minFollowAgeMins` is the setting that actually does the work.** Ten minutes is enough to defeat the click-follow-enter reflex without excluding a genuine new viewer who found the channel that evening — they need only to have been there for the ten minutes before the giveaway opened, which a real viewer was and a farm was not.

Both are offered. The config screen states this distinction in one line rather than leaving the streamer to discover it.

### 10.3 What is not defended against

**A determined operator with aged accounts.** Nothing in a chat-keyword giveaway stops somebody with twenty year-old accounts and a script. Defeating that requires identity verification, which this product will not do for a prize the platform does not hold. The honest position is that the guards raise the cost above what a normal prize is worth, and a streamer running something genuinely valuable should be told to gate on subscribers, where Kick's own payment rail does the verification.

**Anything after the draw.** There is no mechanism to remove a winner for suspicion once the reel has settled. This is the same doctrine as Team Battles' veto ordering (§6.2 of that document): curation happens before the draw, or it does not happen. A streamer who can void a winner they dislike has all of the discretion that §3 exists to remove. Mods remove entries during the window, or they live with the result.

---

## 11. Commands

**Viewer**

| Command | Notes |
|---|---|
| `!enter` | The themeable one. One entry, repeats ignored silently |
| `!claim` | Winner only, during their window. Ignored from anyone else — never acked, or the winner's window fills with noise |
| `!odds` | Their current odds and the entry count. Throttled to one batched reply per 30s |

**Mod**

| Command | Notes |
|---|---|
| `!ga remove @user` | Remove from the pool. Legal during `OPEN` and `LOCKED` only |
| `!ga close` | Close entry — triggers the fifteen-second visible countdown, never an instant close (§2) |
| `!ga extend 60` | Add seconds to the entry window or the claim window, whichever is running |
| `!ga award @user` | Manual award (§8.4). Logged and badged |

**Streamer, dashboard only**

| Action | Notes |
|---|---|
| Open entry | Generates and commits the seed. Publishes the hash |
| Close entry | Fifteen-second countdown plus grace, then lock |
| Run the draw | Fires the reel. The order was already committed |
| Skip animation | Jumps to the settle |
| Pass over now | Ends the claim window early — for when the winner has visibly left. Recorded with a reason |
| Extend claim | Adds time |
| Award manually | Same as the mod command, with a reason field |
| Next prize | Advances the cursor to the next prize |
| End session | Publishes the seed, the entry list and the winners record |
| Abandon | Always available. Seed published anyway, no winners recorded (§3) |

There is no re-draw action, at any privilege level, in any phase. Its absence is a feature and it should be stated on the setup screen.

---

## 12. Chat behaviour

The quota profile here is the inverse of every other game: very few events, potentially thousands of entries. The discipline that follows is simple — **the bot never speaks to an entrant, and speaks to the winner as often as it needs to.**

| Moment | Priority | Notes |
|---|---|---|
| Entry accepted | **never** | §5. Not once, not batched, not for the first entrant |
| Entry rejected | **batched, once** | At 30s remaining, only if the count is non-trivial |
| Session open, prize, seed hash | `announce` | Once. Announces the prize, not the clock (§2) |
| Entry closing | `announce` | Once, at the start of the closing countdown |
| Entries locked, final count | `announce` | The count is worth a message; it is the number chat produced |
| Winner | `announce` | Behind the stream delay. **Starts the claim clock** (§8.1) |
| Claim reminder | `announce` | At 50% and 20% of the window, `@`-mentioning the winner. **Not delayed** — the name is already public and the delay would spend the window |
| Passover | `announce` | Names who was passed over and who is up. Openly (§8.3) |
| Claimed | `announce` | Short. Congratulations plus the prize |
| Session complete, seed published | `announce` | With the verification link |

### Templates

**Open**
```
GIVEAWAY OPEN — {prizeTitle}. Type {keyword} on stream to enter.
{gateLine}
Draw seed committed: {hashShort}
```
> GIVEAWAY OPEN — €100 bonus buy. Type !drop on stream to enter. Followers only, following 10+ minutes. Draw seed committed: 7f3a91c208de

**Rejection summary**
```
{n} entries didn't count — {reason}. {remedy}, there's still time.
```
> 41 entries didn't count — followers only. Follow and type !drop again, there's still time.

**Locked**
```
Entries closed — {n} in. Drawing now.
```

**Winner**
```
@{username} WINS {prizeTitle}. Type !claim in the next {claimMins} minutes to lock it in.
```

**Claim reminder**
```
@{username} — {remaining} left to !claim {prizeTitle}.
```

**Passover**
```
@{username} didn't claim in time. {prizeTitle} goes to @{nextUsername} — {claimMins} minutes on the clock.
```

**Complete**
```
That's the giveaway. Winners: @{u1}, @{u2}, @{u3}. Seed and full entry list: {verifyUrl}
```

The winner and passover messages are the only ones in this game that a viewer might read rather than see, so they carry the prize name in full rather than referring to "the prize". Everything else can assume the overlay.

---

## 13. Overlay

**Entry open** — the entry count is the hero and it is enormous. The command sits beneath it at the largest size the layout allows, because a viewer arriving mid-window needs to know what to type before they need to know anything else. The countdown is third. A feed of joining names scrolls at the edge, and it is doing more work than it looks like it is: **the feed is the proof that entries are landing**, and without it a viewer who typed has no confirmation of anything.

```
┌───────────────────────────────────────────────────────────┐
│  GIVEAWAY — €100 BONUS BUY                                │
│                                                           │
│                      847                                  │
│                    entered                                │
│                                                           │
│                   !drop                                   │
│              1:24 remaining                               │
│                                                           │
│  @reelqueen  @slotgoblin  @maxwin  @lateshow  @…          │
│  Followers only · following 10+ min · you: 1 in 847       │
└───────────────────────────────────────────────────────────┘
```

**Entries locked** — the count holds, still, for three to five seconds with the countdown replaced by "ENTRIES CLOSED". This beat is the payoff for the window and it is the last calm frame before the reel.

**The reel** — full-frame takeover, per §7.2. The one moment the entry count is allowed to leave the screen.

**Claim** — the winner's name large, the prize beneath it, and **the claim countdown as the second-largest element on screen**, ticking. This state is on screen for up to three minutes and it must be worth looking at for all of them: the clock does that work, and the winners strip and remaining-prizes indicator sit at the edges.

**Passover** — the expired name stays, struck through, greyed, labelled, while the next name reveals beneath it. The strike-through persists in the winners strip for the rest of the session. Nothing about this is hidden or brief.

**Claimed** — a confirmation card, the winner and the prize together, four seconds, then either the next prize's reel or the resting state.

**Resting state** — the winners board: every prize with its winner, claim status, and the passed-over names visible. This is what the stream sits on while the streamer talks, so it is a real design surface and not a placeholder. The seed hash and the verification URL live in its footer.

**One law worth restating for this game.** The entry count must never appear to go backwards. Rejected and removed entries are subtracted from the *dashboard* figure; the overlay figure counts accepted entries only and is monotonic. A hero number that drops by forty in front of the whole channel invites exactly one conclusion.

---

## 14. State

```ts
type GiveawayState = {
  phase: 'idle' | 'open' | 'locked' | 'draw' | 'claim' | 'passover' | 'awarded' | 'complete'
  seed: string | null                    // null until OPEN; withheld from clients until COMPLETE
  seedHash: string                       // published at OPEN
  seedRevealed: boolean

  config: GiveawayConfig

  prizes: {
    index: number
    title: string
    description: string | null
    imageUrl: string | null
    status: 'pending' | 'drawn' | 'claimed' | 'voided'
  }[]
  currentPrizeIndex: number | null

  entries: {
    userId: string
    username: string
    role: 'viewer' | 'follower' | 'subscriber' | 'vip' | 'mod'
    subTier: 1 | 2 | 3 | null
    weight: number                       // computed at entry time, frozen
    messageCount: number                 // for activity mode
    joinedAtSeq: number                  // the ordering the draw is committed against
  }[]

  rejected: { reason: string; count: number }[]   // aggregate only — never per-user
  removedUserIds: string[]

  entryOpensAtMs: number | null
  entryClosesAtMs: number | null         // countdown-zero; server accepts until this + graceMs

  // computed once from (seed, entries in joinedAtSeq order, weights) — never regenerated
  drawOrder: string[]                    // userIds, full ranking
  cursor: number                         // position in drawOrder currently holding a prize

  claim: {
    userId: string
    username: string
    prizeIndex: number
    startedAtMs: number                  // when the chat announcement landed, not the draw
    expiresAtMs: number
    remindersSent: number
  } | null

  awards: {
    prizeIndex: number
    userId: string
    username: string
    method: 'claimed' | 'manual' | 'voided'
    manualReason: string | null
    awardedAtMs: number
  }[]

  passovers: {
    prizeIndex: number
    userId: string
    username: string
    reason: 'expired' | 'passed-over-by-streamer'
  }[]
}
```

### Derived — computed, never stored

```ts
entryCount      = entries.length
oddsFor(u)      = weight(u) / sum(all weights)          // displayed as "1 in N"
claimRemaining  = claim.expiresAtMs - now
claimRate       = awards.filter(method === 'claimed').length / (awards.length + passovers.length)
nextInOrder     = drawOrder[cursor + 1]
```

`drawOrder` is computed exactly once, at `LOCKED`, and is immutable for the life of the session. There is no code path that writes to it twice, and that invariant is worth a test of its own.

---

## 15. Config

```ts
{
  keyword: string                        // default '!enter' — expects to be changed
  prizes: Prize[]                        // at least one

  entryWindowMs: number                  // default 180_000, floor 60_000 (§2)
  graceMs: number                        // default = streamDelayMs + 5_000, hidden
  entryGate: 'anyone' | 'followers' | 'subscribers'
  minFollowAgeMins: number               // default 10  (§10.2)
  minAccountAgeDays: number              // default 7   (§10.1 — verify API support)

  weightMode: 'flat' | 'role' | 'activity' | 'custom'   // default 'flat'
  roleWeights: Record<string, number>    // capped at maxWeight
  activityBuckets: { minMessages: number; weight: number }[]
  maxWeight: number                      // default 5, hard ceiling 10 (§6.2)

  claimWindowMs: number                  // default 180_000, floor streamDelayMs + 60_000
  maxPassovers: number                   // default 3 (§8.3)
  allowPreviousWinners: boolean          // default false

  reelMs: number                         // default 4_500
  announceWinnerInChat: boolean          // default true — this one should not be turned off
  publishSeed: boolean                   // default true
  verificationPageEnabled: boolean       // default true
}
```

**Three things the config screen must compute and show live**, rather than leaving to the streamer:

- **The usable entry window at the channel's stream delay** — "180s window · about 155s of real time for a viewer on a 20s delay". This is §2 rendered as a number that moves while they drag the slider.
- **The claim window floor**, enforced and explained inline, not as a validation error after the fact.
- **The odds preview under weighting** — "a sub is 3× a viewer; with 200 entries at your typical mix, roughly 1 in 90 against 1 in 270". Weighting is the setting most likely to be set thoughtlessly and it is the one chat will do arithmetic on.

**`announceWinnerInChat: false` must carry an inline warning.** With it off, a winner who is not looking at the overlay has no way of learning they won, and the claim rate collapses. It exists for the streamer who reads winners out loud themselves; it should not be reachable by accident.

---

## 16. Edge cases

| Case | Behaviour |
|---|---|
| Zero entries at close | No draw. The overlay says so plainly and the session ends without a winner. Do not auto-extend — a giveaway nobody entered is information |
| Fewer entrants than prizes | Draw what there is. Remaining prizes are voided and announced, or the streamer re-opens entry as a new session |
| Entry lands inside the grace period | Accepted, counted, indistinguishable from any other entry to everyone including the entrant (§2) |
| Entry lands after the grace period | Rejected silently, counted in the aggregate |
| Winner is banned or times out mid-claim | Their claim window continues. If they claim, the streamer decides — the draw is not re-run |
| Winner leaves the channel entirely | Nothing changes. The clock runs, expires, passes over |
| Winner types `!claim` twice | Idempotent. No second ack |
| Someone else types `!claim` | Ignored, never acked. This will happen constantly and must be silent |
| Mod awards manually while the clock is running | Clock stops, award is recorded as manual with the reason, overlay badges it |
| Streamer passes over early | Recorded with a reason and shown on the overlay as a streamer action, not as an expiry. The distinction matters and hiding it would be dishonest |
| All passovers exhausted | Streamer chooses from the three options in §8.4. The session cannot silently resolve this itself |
| Reconnect during the reel | Jump to the settled state. Never replay (§7.2) |
| Reconnect during a claim window | Resync the clock from `expiresAtMs`, never from elapsed time on the client |
| Kick chat drops mid-window | Entries stop arriving. The overlay keeps its count and its clock; the dashboard rail shows the failure. **Extend the window by the outage duration** and say so on the overlay — this is the one case where changing the clock mid-session is correct |
| Two prizes, same winner, `allowPreviousWinners` false | The cursor skips them. Their strike-through is not shown — they won, they are not a passover |
| Streamer abandons mid-session | Seed published, no winners recorded, history row states it (§3) |
| Weighting set with `maxWeight` above the cap | Rejected at config. The hard ceiling is not overridable |
| The same viewer enters from two accounts | Not detectable by the platform. §10.3 — this is stated as a limit rather than pretended away |

---

## 17. What's excluded, and what's deferred

### Excluded by decision

**Prize custody and delivery.** StreamArena will not hold, escrow, generate, store, or deliver anything a prize consists of — no bonus codes, no gift card numbers, no payment rails, no "the platform sends the winner a DM with the code". A prize in this product is a string the streamer typed, and the record of who won it. Settlement happens entirely off-platform between the streamer and the winner.

This is the same line as Product Overview §10 and it is drawn here specifically because this is the feature that would erode it. Storing a prize code is one small step from being the party responsible when it is wrong, already used, or worth more than the streamer said, and it makes the platform a participant in a transaction it currently only reports on. The winners record and the verification page give the streamer everything needed to settle honestly. They do the settling.

**Watch-time and engagement auto-drops.** The catalog's "Soon" card currently advertises *"automated drops to active chatters based on watch time and engagement"*, and that is a **different game** wearing this one's name — no entry window, no keyword, no claim, a completely different overlay, and an upstream dependency on presence tracking the platform does not have. It should not be smuggled in as a mode of this one. Either it gets its own specification or the catalog copy changes to match what is being built. **The copy should change**, and the tagline should read closer to *"Keyword entry, gated or open, an animated draw and a claim clock."*

**Re-draws of any kind.** §3. There is no privilege level at which this exists.

### Deferred

- **Running inside another session.** The thing this game most wants (§1), blocked on concurrent sessions in the runtime. First real customer for that work
- **Cross-session entry history** — "you've entered 14 giveaways and won 0", which is both a good engagement hook and a way to weight toward long-suffering regulars. Needs the points ledger already sitting in Product Overview §9's "later"
- **Sub-only sessions as a first-class preset** rather than a gate setting. Trivial, and worth doing once there is evidence streamers are reaching for heavy weighting instead (§6.2)
- **Keyword-free entry** — everybody present is entered automatically. Removes the last barrier to participation and requires presence tracking. Genuinely appealing and it belongs with the auto-drops game, not here
- **Multi-channel giveaways** across collaborating streamers. Interesting, and an entirely different trust problem

---

## 18. Build ledger

The cheapest game in the catalog to build, by some distance — and the one whose value depends least on the code and most on two durations and one animation being right.

**Reused unchanged**

| Primitive | From |
|---|---|
| Entry pool, gating, one-entry-per-viewer, mod removal | Tournament §Joining |
| Seeded deterministic draw over an ordered pool | Tournament §The draw / `core/primitives/draw.ts` |
| Committed-randomness-with-published-hash doctrine | Team Battles §6.1, Bingo §5.1 |
| Full-frame takeover animation as playback | Team Battles §6.3 |
| Winner announcement, stream delay, priority lane | Game-Specs §Winner announcements |
| Overlay reconnect, resync, never-replay | Core / UI Brief §5 |

**New, and small**

| Piece | Notes |
|---|---|
| Name reel animation | The one real front-end build. Simpler than the flip — no fake-out, no branching (§7.1) |
| Claim clock and passover cursor | A timer and an integer. The design work was §8, not the code |
| Entry grace period | One addition on a timestamp comparison, and the single highest-value line in the game (§2) |
| Live odds computation | One division, recomputed on entry |
| Verification page | A template over data already stored. Highest trust-per-hour in the whole specification |
| Per-session message counter | **The only upstream dependency** — required by activity weighting only. Ship `weightMode: 'activity'` disabled if it slips |
| Account-age and follow-age guards | **Blocked on Kick API capability — verify before build** (§10.1) |

**Build order position:** any time after Tournament. It depends on the draw primitive and on nothing that Bingo or Team Battles introduced, so it can be built in parallel with either, and it is small enough to fit in the gap while a larger game waits on design review. Its natural slot is immediately after Team Battles, as the fifth game and the first one that takes days rather than weeks — which is the claim the plugin architecture has been making since the architecture document, and this is the game that tests it.

**The two things to get right before anything else:**

**Prototype the name reel in isolation**, exactly as Team Battles prototyped the flip, and for the same reason — it runs several times a session and it is the entire reveal. It is a simpler animation than the flip and the bar is higher, because there is no colour, no team, and no second signal carrying the moment. Just names and a settle.

**Then verify the two clocks against a real stream.** Open a giveaway on a live channel with a real delay, and watch what fraction of entries land inside the grace period and what the claim rate looks like. Both numbers are recorded per session precisely so this can be checked rather than assumed, and §2 and §8 are the two sections of this document most likely to need a revision after contact with an actual audience.
