# Giveaways — Complete UI Specification

Companion to `StreamArena-UI-Brief.md` — paste that document's §1 (app context), §2 (design tokens), and §3 (primitives) first, then build from here. §5 of that document (overlay platform laws) governs every overlay state below. Game rules live in `StreamArena-Giveaways-Spec.md`.

**The organising principle:** this game has **no state worth looking at and two clocks that are everything.** There is no scoreboard, no bracket, no board, no running total. There is a number that goes up for three minutes, a five-second reveal, and then a named person with a countdown over their head for another three minutes. Every UI decision below follows from that: when there is only one thing on screen, it has to be enormous, and when the drama is a clock, the clock has to be built like a hero element rather than like a timestamp.

```
       OPEN  →  LOCKED  →  DRAW  →  CLAIM  ⇄  PASSOVER  →  AWARDED  →  COMPLETE

Dash   count      hold     fire     watch      advance      record      publish
       climbs     final    reel     clock      cursor       award       seed
Overlay COUNTER   held     TAKE-    CLAIM      struck-      confirm     winners
       + clock    count    OVER     CLOCK      through                  board
```

**What makes this UI different from every game before it:** Bonus Hunt, Tournament, Bingo and Team Battles all give the overlay something to display. This one gives it something to *wait for*. A build that treats the entry window as a loading state and the claim window as a confirmation dialog has produced a functional giveaway that nobody watches. Both of those phases are the product.

---

## The four highest-value UI decisions

**1. The claim clock is the main event, not the reveal.** The reel takes five seconds and resolves. The claim window is a named person, a visible countdown, a chat screaming at them, and a real chance of a reversal — running for up to three minutes (spec §8.2). It is the longest sustained tension this game produces and it is on screen roughly thirty times longer than the reveal is. Build it as a hero state with its own layout, not as a badge stuck onto the winner card.

**2. The entry counter is the only thing happening for three minutes, so build it like a hero.** 140px, tabular, counting up, never down (spec §13). It is the number the audience is collectively producing and watching it climb is the entire entertainment of the entry phase. Under it, at the largest size the layout allows, sits the command — because a viewer arriving mid-window needs to know what to type before they need to know anything else.

**3. Every clock the audience sees is the clock the server honours.** Stream delay means the viewer's countdown reaches zero after the server's does (spec §2), so the server accepts entries through a hidden grace period that exactly covers the gap. The UI consequence is absolute: **the overlay countdown never lies and never disappears early.** No "closing now", no instant close, no clock that hits zero while entries are still landing on the dashboard, and no visible mention of the grace — a viewer who typed at zero and got in should have no idea anything was extended for them.

**4. The reel settles exactly once.** Team Battles' scripted fake-out is deliberately not reused (spec §7.1), because a near-miss on a coin is theatre and a near-miss on a person is showing somebody they won something they didn't. Deceleration through readable real names is all the tension this needs. If the animation settles, holds, and moves — at any speed, for any duration — it is wrong and it will be read as a redraw.

---

## A note on the two clocks

This game has no team colours and does not override the palette. It uses `--accent` for primary actions as normal, `--gold` for the prize (a prize is exactly what that token means — best-or-notable), and `--loss` only where a clock is genuinely running out. Everything distinctive about this UI is in timing rather than colour, and the two clocks are its whole identity.

**They behave differently and they should look different.**

**The entry clock counts down toward something good.** It is neutral — `--text-primary` on `--overlay-panel` — for most of its run, and it is deliberately not urgent, because the goal of the entry phase is to get people to type, and a red clock at 90 seconds reads as "too late" to somebody who just arrived. It picks up `--gold` under 30 seconds and pulses on the last ten. It never turns red.

**The claim clock counts down toward something bad.** It starts `--gold`, moves to amber past halfway, and to `--loss` under 30 seconds with a one-second pulse. This is the one place in the product where a red countdown is correct: a prize is about to be lost, chat should feel that, and the pressure is the point.

```css
/* both clocks: Space Grotesk, tabular-nums, no exceptions */
--clock-entry-normal:  var(--text-primary);
--clock-entry-late:    var(--gold);      /* under 30s */
--clock-claim-early:   var(--gold);
--clock-claim-mid:     #FF9F3D;          /* past halfway */
--clock-claim-late:    var(--loss);      /* under 30s, 1s pulse */
```

**Three rules that come out of this:**

- **Neither clock ever ticks sub-second on the overlay.** Whole seconds, monospaced, no milliseconds. A 1920×1080 source re-encoded at low bitrate turns a fast-updating digit into mush, and a giveaway clock showing hundredths reads as a slot machine rather than a countdown.
- **Both clocks resync from an absolute timestamp on reconnect, never from elapsed client time** (spec §16). A clock that drifts a few seconds across an OBS reconnect and then jumps is worse than a clock that pauses.
- **Test both in greyscale.** The colour progression is a secondary signal; the number and the pulse carry it. If you cannot tell an expiring claim clock from a fresh one with the colour removed, the pulse is not strong enough.

---

## Screen inventory

**Dashboard**

1. Setup
2. Live control — entry open
3. Live control — locked & draw
4. Live control — claim & passover
5. Live control — complete

**Overlay**

6. Entry open
7. Entries locked
8. **The reel takeover**
9. Winner reveal
10. **Claim countdown** — the long state
11. Passover
12. Claimed confirmation
13. Winners board — resting state

**Components**

14. Entry counter
15. Name reel
16. Claim clock
17. Winners strip
18. Live odds line
19. Verification card
20. Prize list editor

---

## 1. Setup

> Build the Giveaways setup screen. Two columns — form left (60%), sticky summary right (40%). This is the shortest setup in the catalog and it should feel like it: a streamer running a giveaway between segments should be able to fire one in twenty seconds.
>
> **Prizes**
> - The prize list editor (§20) — at least one row required. Each row: title (required), description (optional), image (optional), drag handle.
> - Helper line beneath the list, muted, always visible: **"Prizes are announced and recorded. StreamArena never holds or sends anything — you settle with the winner yourself."** This is the §17 boundary rendered as product copy and it should not be cut.
> - When more than one prize exists, an info card: "Prizes are drawn one at a time, smallest first. The best one is revealed last."
>
> **Entry**
> - Entry keyword — text input prefilled `!enter`, with live preview: "Viewers type: !drop". Helper: "Match it to what you'll say out loud — !drop, !gates, the prize name."
> - Entry window — slider, 60s–600s, default 180s. **Beneath it, a live line that is the most important helper text on this screen:** *"3:00 window · about 2:35 of real time for a viewer on your 20-second delay."* It recomputes from the channel's configured stream delay and it must move visibly as the slider moves. The slider cannot go below 60s and the track shows the floor as a hard stop rather than letting the handle drift into an error state.
> - Who can enter — radio: Anyone / Followers / Subscribers.
> - Following for at least — number input in minutes, default 10, shown only when Followers is selected, with helper: **"Following takes one click. This is the setting that actually stops entry farming."**
> - Account age — number input in days, default 7. If the Kick API can't supply account age on this channel, the control is disabled with an explicit line saying so rather than silently defaulting to zero.
>
> **Odds**
> - Weighting — segmented: **Flat** (default) / By role / By activity / Both.
> - Flat selected shows only: "Everyone gets one entry."
> - By role reveals multiplier inputs for follower, sub tier 1 / 2 / 3, VIP, mod, each capped at 5 with a hard ceiling of 10 — the input refuses above the ceiling rather than validating after.
> - By activity reveals the three buckets as read-only rows with editable weights, plus: "Rewards being here, not spamming. Nothing above 20 messages counts for more."
> - **Live odds preview beneath any non-flat mode:** "A tier-1 sub is 3× a viewer. At 200 entries and your usual mix, that's roughly 1 in 93 against 1 in 280." Recomputes as the multipliers change.
> - When any weight is set above 3×, an inline note, not a warning: *"Heavy weighting lowers entries. A giveaway 200 people enter beats one 60 people enter."*
>
> **Claim**
> - Claim window — slider, default 180s, floor computed as stream delay + 60s and shown on the track. Same real-time helper line as the entry window.
> - Passovers allowed — number input, default 3, with helper: "At a normal claim rate, 3 settles about 99 in 100 prizes without you having to decide anything."
> - Announce winner in chat — toggle, **default on**. Turning it off reveals an amber inline warning that cannot be dismissed: *"With this off, a winner who isn't watching the overlay has no way to know they won. Claim rates collapse."*
>
> **Right column, sticky:** settings recap, the entry and claim windows as two large figures with their real-time equivalents beneath, overlay URL with copy button, and a primary **"Open entry"** button.

**The fairness commitment lives on this screen**, below the primary button, in muted text with a small lock glyph — the same placement and the same job as Team Battles' flip-sequence line:

> *The draw order is generated and locked the moment you open entry, before anyone has typed. A fingerprint is posted to chat now; the seed and the full entry list are published when the giveaway ends. There is no re-draw button anywhere in this product.*

That last clause is doing the most work. The absence of a feature is invisible unless you say it out loud, and this is the one absence the audience most needs to know about.

---

## 2. Live control — entry open

> Build the entry-open phase of the Giveaways live control screen.
>
> **Top bar:** LIVE dot · "Giveaway" · prize title · phase indicator (Open → Locked → Draw → Claim → Complete) · "Prize 1 of 3" when multiple · "Abandon" in red outline.
>
> **Hero row** — two cards, the first dominant:
> - **Entries** — very large, counting up with an accent flash on each increment. This mirrors the overlay and it is what the streamer glances at.
> - **Time remaining** — the entry clock, large, with "+ grace" shown in small muted text beneath it so the streamer understands why the count keeps moving for a few seconds after zero. *The streamer sees the grace; the audience never does.*
>
> **Entry feed** — the standard feed row component, newest at top: avatar, username, role badge, and their computed weight as a small mono chip (`3×`) when weighting is on. Slides in with an accent flash.
>
> **Rejection strip** — above the feed, always visible in this game rather than collapsed by default. A single line with a breakdown: **"41 rejected — not following (33) · following under 10 min (6) · account too new (2)"**. Each reason is clickable and loosens that specific guard live, with a confirm, because catching a gate set too tight *during* the window is the entire reason this strip exists.
>
> **Right rail:** live odds readout ("a viewer: 1 in 847 · a tier-1 sub: 1 in 282"), the seed fingerprint with a copy button, the overlay connection state, and the prize list with the current one marked.
>
> **Bottom action bar, sticky:** primary **"Close entry"** and a secondary "+60 seconds". Closing does not close — it starts a fifteen-second visible countdown plus grace, and the button becomes a disabled "Closing — 12s" for the duration. There is no way to make entries stop instantly and the UI should not pretend there is.

**The rejection strip is the highest-value control on this screen** and it is easy to under-build. A streamer who set follower-gating with a ten-minute follow age and is watching a third of their channel bounce off it has about ninety seconds to notice and fix it. Make the number large, make the reasons legible, and make loosening a guard one click and one confirm.

---

## 3. Live control — locked & draw

> Build the locked and draw phases.
>
> **LOCKED state:** the entry count holds as the dominant element, now static, with "Entries closed" beneath it. Final breakdown appears — total, by role, average weight. A single primary button: **"Draw {prizeTitle}"**.
>
> Beneath it, muted, with a lock glyph: **"The order was fixed when you opened entry. This reveals it."** The button is a reveal, not a decision, and the copy should stop a streamer from feeling — or being accused of — otherwise.
>
> **DRAW state:** the dashboard mirrors the overlay reel at reduced scale so the streamer isn't watching their own stream on delay to find out who won. **Every control on the page disables for the duration**, replaced by a single "Skip animation" text button that jumps to the settle frame.
>
> **After the settle:** the winner's card appears with their avatar, username, role badge and entry weight, and the screen advances to Claim.

**Hold the LOCKED state for three to five seconds before allowing the draw.** It is the payoff for the window — the final count is the number the audience just spent three minutes producing — and a streamer who slams straight from close to reel has thrown it away. Consider a brief non-blocking auto-hold rather than trusting the button.

---

## 4. Live control — claim & passover

The screen the streamer sits on longest, and the one where they most need to be able to intervene without it looking like intervention.

> Build the claim and passover phases.
>
> **Winner card, dominant:** avatar at 96px, username at 32px, role badge, prize title in `--gold` beneath. To its right, **the claim clock at 96px**, colour-progressing per the two-clocks note, with a thin progress ring around it.
>
> **Claim state line** beneath the clock, updating live: "Waiting for !claim" → "Reminder sent — 1:30 left" → "Claimed at 1:12 remaining" with a `--win` check.
>
> **The order panel, right rail** — the next three names in the committed order, greyed, labelled "Next up if unclaimed". This is deliberately visible to the streamer and **deliberately not on the overlay**: chat seeing the next name before the passover would replace the reveal with an anticlimax, and the streamer seeing it costs nothing because they cannot change it.
>
> **Action bar:**
> - "Extend claim +60s" — secondary, always available
> - "Award manually" — secondary, opens a small dialog with a required reason (Replied in Discord / Typo'd the command / I know them / Other). Confirmed, logged, badged on the overlay
> - "Pass over now" — destructive outline, confirmed, with a required reason. Only for the case where the winner has visibly gone
>
> **PASSOVER state:** the expired name moves to a struck-through row above the new winner card, labelled "didn't claim · 3:00". A passover counter shows "Passover 1 of 3". Then the new winner card takes over and the clock restarts.
>
> **When passovers are exhausted**, the action bar is replaced by the three explicit choices from spec §8.4, as three equal-weight buttons with one-line consequences beneath each: **"Award to @lastname anyway"** · **"Void this prize"** · **"Run a fresh giveaway for it"**. The third states its consequence plainly: *"A new session with a new seed. Everyone enters again."*

**Every intervention on this screen carries a required reason and appears on the overlay.** Manual awards, early passovers, extensions. The streamer has legitimate reasons to do all three and the product's entire trust position (spec §3) rests on discretion being visible rather than absent. A silent "award manually" button would undo more than it enables.

---

## 5. Live control — complete

> Build the complete state.
>
> **Winners table** — one row per prize: prize, winner, method (claimed / manual / voided) with the reason on hover, claim time, and the passed-over names beneath each as small struck-through chips.
>
> **Session stats row:** total entries · unique entrants · claim rate as a large figure · rejections by reason · total time.
>
> **The verification card (§19)** — full width, showing the seed, the fingerprint it matches, the entry count, and a "Copy verification link" button plus "Download entry list (CSV)".
>
> **Actions:** "Run another giveaway" (carries the settings forward, new seed), "Export winners", "Back to catalog".

**Claim rate is the health metric of this game** (spec §8.3) and it belongs on this screen as a large figure, not buried in stats. A streamer whose claim rate is under 50% is being told their claim window is too short or their prize doesn't land, and neither of those is discoverable any other way.

---

## 6. Overlay — entry open

On screen for three minutes with one number changing. This is the state most likely to be under-designed and it carries the participation rate of the whole game.

```
┌───────────────────────────────────────────────────────────┐
│  GIVEAWAY · €100 BONUS BUY                      1 of 3    │
│                                                           │
│                                                           │
│                       847                                 │
│                     ENTERED                               │
│                                                           │
│                     !drop                                 │
│                                                           │
│                     1:24                                  │
│                                                           │
│  @reelqueen  @slotgoblin  @maxwinmike  @lateshow  @…      │
│  FOLLOWERS · 10+ MIN          YOU: 1 IN 847               │
└───────────────────────────────────────────────────────────┘
```

> Build the entry-open overlay state. Edge-anchored per the platform laws — the centre third stays clear for gameplay and facecam, so this panel occupies the left or right third at the streamer's configured position, not the middle of the frame.
>
> **Hierarchy, and it is steep:** the entry count at 140px is first. The keyword at 64px in `--accent` is second. The clock at 48px is third. Nothing else competes.
>
> **The count animates on every increment** — a 900ms count-up per the motion rules, with a brief accent glow. At high entry rates it batches to at most three visible increments per second so it reads as climbing rather than flickering.
>
> **The joining feed** is a single horizontal marquee of recent usernames along the bottom of the panel, moving slowly, 20px minimum. It exists as proof that entries are landing — a viewer who typed and sees their name pass has confirmation the product otherwise never gives them, because entries are never acked in chat (spec §5).
>
> **The footer carries the gate, permanently**, at overlay-legal size: "FOLLOWERS · 10+ MIN", or nothing at all when entry is open to everyone. Nobody should discover a gate by being silently rejected by it.
>
> **The live odds line** sits opposite the gate: "YOU: 1 IN 847". It shows the flat-entry odds; under weighting it shows the flat viewer's odds, because that is the honest floor and the number a non-sub is entitled to see.
>
> **The clock is neutral until 30 seconds**, then `--gold`, then a one-second pulse on the last ten. **It never turns red** — see the two-clocks note.

**The count is monotonic on the overlay, always** (spec §13). Rejections and mod removals adjust the dashboard figure; the overlay figure only ever goes up. A hero number dropping by forty in front of the whole channel invites exactly one conclusion, and it is the wrong one.

**Test this state over game art before shipping it.** It is a large number on a transparent background composited over a slot reel that is itself full of large numbers, and it is the state in this document most likely to disappear into Gates of Olympus.

---

## 7. Overlay — entries locked

> Build the locked state. Three to five seconds, and it is a held frame rather than a transition.
>
> The count stays exactly where it was, at the same size and position — it does not move, resize, or re-animate. "ENTERED" beneath it changes to **"ENTRIES CLOSED"**. The keyword and the clock fade out over 400ms. The marquee stops.
>
> Nothing else happens for three seconds.

**The stillness is the design.** This is the last calm frame before the reel and it is where the audience registers the number they collectively made. Filling it with a spinner, a "drawing now…" label, or an early reel wind-up throws away the only moment in the game where the entry phase gets acknowledged.

---

## 8. Overlay — the reel takeover

The one real front-end build in this game, and the thing to prototype before anything else exists.

> Build the reel takeover — full frame, 4.5 seconds, playback only. The result is already held by the client (spec §3); nothing is being decided.
>
> **A vertical reel of real usernames** from the actual entry pool, scrolling upward.
>
> ```
> 0.0s   the count lifts away, the reel column appears centred
> 0.6s   acceleration — names blur into streaks
> 2.2s   full speed, 40px band of motion blur, individual names unreadable
> 3.0s   deceleration begins — names resolve, roughly three per second
> 3.9s   slow enough to read every name passing
> 4.3s   SETTLE — the name lands, scales to 96px, locks, accent flood
> 4.8s   the claim clock appears beneath and starts
> ```
>
> **The settle is absolute.** After 4.3s nothing about the name moves, changes, fades or is replaced. There is no hold-and-snap, no second settle, no near-miss that resolves elsewhere.
>
> **The names in the reel are real entrants**, sampled from the pool, not placeholders and not generated. A viewer seeing their own name flash past during the deceleration is one of the better free moments this game has.
>
> **Skip jumps to the 4.3s frame.** The claim clock still starts at 4.8s of wall-clock — skipping the animation must not shorten anybody's window.
>
> **Reconnect during the reel jumps to the settled state and never replays**, per the platform law and for a sharper reason than usual here: a replayed name reel is indistinguishable from a redraw.

**Prototype this standalone, with a hardcoded winner and a list of fake names, before any game state exists.** Same instruction as the Team Battles flip and the same reasoning: it runs several times a session, it is the entire reveal, and the bar is higher than the flip's because there is no colour and no team carrying the moment — just names and a stop. If the deceleration doesn't feel right on the fourth viewing, nothing else in this document matters.

---

## 9. Overlay — winner reveal

Technically the tail of §8 rather than a separate state, but it has its own composition and it holds for about four seconds before the claim layout takes over.

> Build the winner reveal. The settled username at 96px, centred. The prize beneath it at 48px in `--gold`, with its image at 120px if one was supplied. A single accent flood on the settle, then still.
>
> If the winner was drawn under weighting, **no mention of their weight, tier, or entry count appears.** They won; how many tickets they held is not the story and putting it on screen invites arithmetic at exactly the wrong moment.

---

## 10. Overlay — claim countdown

**The longest-lived state in the game and the one to build like a hero.** Up to three minutes on screen, and it is the best television this game produces.

```
┌───────────────────────────────────────────────────────────┐
│  €100 BONUS BUY                                           │
│                                                           │
│              @slotgoblin                                  │
│                                                           │
│                 2:14                                      │
│              TO !claim                                    │
│              ▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░                         │
│                                                           │
│  ✓ @reelqueen · €25 bonus      ✗ @maxwin (didn't claim)   │
└───────────────────────────────────────────────────────────┘
```

> Build the claim countdown state.
>
> **The clock is the largest element on screen at 140px** — larger than the winner's name, which sits above it at 72px. This inversion is deliberate: the name has been read, the clock is what is still happening.
>
> **A progress bar or ring beneath it**, draining left to right, giving the countdown a shape that reads peripherally without the viewer having to read digits.
>
> **Colour progression** per the two-clocks note: `--gold` → amber past halfway → `--loss` under 30 seconds with a one-second pulse. The pulse is a scale-and-glow on the whole clock block, not a colour blink, so it survives greyscale and low bitrate.
>
> **"TO !claim"** beneath the clock, in the session's actual keyword, at 32px. The winner may be arriving at this screen cold with no idea what they are supposed to do.
>
> **The winners strip (§17)** along the bottom — prizes already settled, with claimed names in `--win` and passed-over names struck through. It grows through the session and it is what makes a three-prize giveaway feel like one event rather than three.
>
> **The next name in the order is never shown**, at any point, in any state, before a passover actually happens. The streamer sees it on their dashboard; the overlay does not.

**Do not add an idle animation here.** Three minutes is long enough that the temptation to fill it is real, and the platform law is explicit: motion on the overlay means data changed. The clock is changing. That is the animation.

---

## 11. Overlay — passover

> Build the passover transition — 2.5 seconds, then straight into a new claim state.
>
> The expired clock hits `0:00` and holds for half a second. The winner's name gets a **strike-through drawn left to right over 400ms** and desaturates to `--text-muted`, with the label **"DIDN'T CLAIM IN TIME"** beneath it at 24px.
>
> The struck name then shrinks and moves up into the winners strip, and the next name reveals beneath it — **a short 1.2s reel, not the full 4.5s takeover.** The second reveal should feel like a continuation, not a restart.
>
> A passover counter appears in the corner: **"PASSOVER 1 OF 3"**.
>
> The struck-through name stays in the winners strip for the rest of the session.

**Nothing about this is hidden, brief, or softened**, and that is a trust decision rather than a design one (spec §8.3). The whole committed-order construction exists so that this substitution can be shown in full rather than performed off-screen. The passover counter matters for the same reason the sudden-death counter does in Team Battles — showing the bound is what stops it reading as the streamer trying again until they like the answer.

---

## 12. Overlay — claimed confirmation

> Build the claimed state — 4 seconds.
>
> The clock is replaced by a `--win` check at 96px. The winner's name and the prize sit together, centred, at their reveal sizes. Label: **"CLAIMED"**.
>
> **If the award was manual**, the label reads **"AWARDED BY {streamer}"** in `--text-secondary` instead, with the reason shown small beneath it. A manual award never renders identically to a claimed one.
>
> Then either the next prize's reel, or the winners board.

---

## 13. Overlay — winners board (resting state)

The stream will sit on this while the streamer talks, so it is a real surface rather than an end card.

> Build the winners board. Every prize as a row: prize title in `--gold`, winner's username, and a status glyph — `--win` check for claimed, neutral for manually awarded, `--text-muted` strike for voided. Passed-over names appear beneath their prize as small struck-through chips.
>
> **Footer, always present:** the seed fingerprint and the verification URL, at overlay-legal size. This is where somebody who wants to check gets told how.
>
> **Header:** total entries for the session as a secondary figure. The number the channel produced deserves to survive to the end card.
>
> No animation except the initial assembly. This state can be on screen for twenty minutes.

---

## 14. Component — entry counter

> Build the entry counter. Space Grotesk, tabular numerals, three sizes: 140 (overlay hero), 96 (dashboard hero), 32 (inline).
>
> Counts up over 900ms per the motion rules, eased, digits rolling. **Batches to a maximum of three visible increments per second** so a burst of two hundred entries reads as a climb rather than a strobe.
>
> **Monotonic on the overlay, adjustable on the dashboard.** Two props, one component, and the difference is deliberate (spec §13).
>
> Accent glow on increment, decaying over 400ms. Never a glow that persists between increments — at a high entry rate it would become a solid halo and stop meaning anything.

---

## 15. Component — name reel

> Build the name reel as a standalone, prop-driven component with no knowledge of game state: `names[]`, `winner`, `durationMs`, `onSettle`.
>
> Fixed-height viewport with a vertical strip of username rows scrolling upward. Motion blur applied as a CSS filter on the strip during the fast phase, removed during deceleration. Easing is a single long deceleration curve — not a spring, and with no overshoot, because an overshoot after the settle is a second movement and §8 forbids second movements.
>
> **Never accepts a "fakeOut" prop.** The absence is the specification.
>
> Two sizes: full-frame overlay (96px rows) and dashboard mirror (32px rows), same component, same timing, so the streamer's mirror and the audience's takeover stay in sync frame for frame.

---

## 16. Component — claim clock

> Build the claim clock: `expiresAtMs`, `size`, `variant` ('claim' | 'entry').
>
> **Always computes from the absolute expiry timestamp**, never from an elapsed counter, so a reconnect resyncs exactly rather than drifting (spec §16). Re-derives on every animation frame from wall-clock time, renders whole seconds only.
>
> Colour progression by variant per the two-clocks note. The claim variant pulses under 30 seconds with a scale-and-glow, not a colour blink.
>
> Progress ring or bar as an optional prop, drained proportionally.
>
> **At zero it holds at `0:00` and fires `onExpire` once.** It never shows negative time and it never disappears at the moment of expiry — the passover transition needs the zero on screen to land.

---

## 17. Component — winners strip

> Build the winners strip. A horizontal row of settled prizes, each a compact chip: status glyph, username, prize title truncated.
>
> States per chip: claimed (`--win` check) · manually awarded (neutral, small hand glyph) · passed over (struck, `--text-muted`) · voided (struck, with the prize name struck too).
>
> Used at the bottom of the claim state, the winners board, and the dashboard complete screen. One component, three densities.

---

## 18. Component — live odds line

> Build the odds line: "YOU: 1 IN 847".
>
> Under flat weighting it is the plain reciprocal of the entry count, adjusted for the number of prizes remaining. **Under any weighting mode it shows the unweighted viewer's odds**, because that is the honest floor and the figure a non-sub is entitled to (spec §6.1).
>
> Recomputes on every entry, animating only the digits that change.
>
> **Never displays ticket counts anywhere, in any surface.** "You have 5 entries" is a number whose meaning depends on facts the viewer doesn't have; "1 in 214" is a statement they can act on.

---

## 19. Component — verification card

> Build the verification card. Shown on the dashboard complete screen and linked from the overlay footer.
>
> **Contents:** the seed fingerprint published at open, the full seed published at close, the entry count, a plain-language statement of the draw algorithm in two sentences, "Copy verification link", and "Download entry list (CSV)".
>
> The public verification page is this card plus the ordered entry list and the resulting draw order, on a permanent URL, with no login.

**This is the highest trust-per-hour surface in the specification.** It is a template over data already stored, it takes an afternoon, and it converts "prove it wasn't rigged" from an argument into a link. Build it with the first version rather than adding it after the first accusation.

---

## 20. Component — prize list editor

> Build the prize list editor. Reorderable rows — drag handle, title input, optional description, optional image upload with a 64px thumbnail, remove button. "Add prize" beneath.
>
> Order is display order and **the reveal runs smallest-first**, so the list is labelled "revealed in this order, best last" with the final row subtly emphasised.
>
> Single-prize is the default and the common case: one row, no reordering affordances shown, no visual weight spent on a list of one.

---

## States to build

| State | Where | Behaviour |
|---|---|---|
| Zero entries so far | Entry open, overlay | Counter at 0, keyword at maximum size, no marquee. Must look expectant, not broken |
| Zero entries at close | Locked | "No entries" stated plainly, no draw, session ends. **Never auto-extend** |
| Fewer entrants than prizes | Locked | Draw what exists; remaining prizes voided and announced |
| Entry lands in the grace period | Overlay + dashboard | Counted, indistinguishable from any other entry to everyone including the entrant |
| Entry lands after the grace | Dashboard aggregate only | Silent. Never acked, never shown on the overlay |
| Gate rejecting heavily | Entry open, dashboard | Rejection strip large, reasons clickable to loosen live |
| Streamer shortens the window | Entry open | 15s visible countdown plus grace. **No instant close path exists** |
| Winner claims | Claim | `--win` check, 4s confirmation, advance |
| Winner never claims | Claim → Passover | Clock holds at 0:00, strike-through drawn, 1.2s short reel for the next name |
| Someone else types !claim | — | Ignored, never acked, no visual response anywhere |
| Winner claims twice | — | Idempotent, no second confirmation |
| Streamer awards manually | Claim | Clock stops, "AWARDED BY {streamer}" with reason. **Never renders as a claim** |
| Streamer passes over early | Claim → Passover | Shown as a streamer action, distinct from an expiry |
| Passovers exhausted | Claim | Three explicit choices, equal weight, consequences stated |
| Multiple prizes, same winner blocked | Draw | Cursor skips silently. They are a winner, not a passover — no strike-through |
| Kick chat drops mid-window | Overlay + rail | **Window extends by the outage and the overlay says so.** The one case where changing a clock mid-session is correct |
| Overlay disconnected | Dashboard rail | Red card with copy-URL. Nothing on the overlay itself, ever |
| Overlay reconnects mid-reel | Overlay | Jumps to settled state. **Never replays** |
| Overlay reconnects mid-claim | Overlay | Clock resyncs from `expiresAtMs`, never from elapsed client time |
| Session recovered after refresh | Dashboard | "Session restored" toast, clocks and cursor intact |
| Session abandoned | Complete | No winner, no announcement. Seed published anyway, history row states it |

---

## Build order

**§8 reel takeover (standalone) → §14 entry counter → §6 entry overlay → §16 claim clock → §10 claim countdown → §2 entry control → §3 locked & draw → §4 claim & passover → §11 passover → §12 claimed → §17 winners strip → §13 winners board → §19 verification card → §18 odds line → §5 complete → §20 prize editor → §1 setup.**

**The reel comes first and it comes before any state exists**, for the same reason the flip did in Team Battles: it is the entire reveal, it runs several times a session, and it is cheap to test with a hardcoded winner and a list of fake names. The bar here is actually higher than the flip's — there is no colour, no team, and no second signal doing any of the work. If four and a half seconds of names and a stop doesn't hold up on the fourth viewing, that is worth discovering on a throwaway page rather than after the backend is built around it.

**Then the counter and the entry overlay**, because that state is on screen for three minutes of every session and it carries the participation rate — which is the only number this game produces. **Then the claim clock and the claim state**, which is on screen even longer and where the real drama lives.

The dashboard follows the overlay deliberately, and that is a reversal of the usual order in this catalog. Every other game's dashboard is a live instrument the streamer plays continuously; this one is four buttons and a clock they mostly watch. Build the thing the audience sees first.

Setup comes last, as always — it runs once per session and blocks nothing. The prize editor sits just ahead of it because a hardcoded single prize is enough to build and test every other state in this document.
