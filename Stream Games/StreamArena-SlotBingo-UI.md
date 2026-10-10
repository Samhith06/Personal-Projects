# Slot Bingo — Complete UI Specification

Companion to `StreamArena-UI-Brief.md` — paste that document's §1 (app context) and §2 (design tokens) first, then build from here. Game rules live in `StreamArena-SlotBingo-Spec.md`.

**The organising principle:** unlike Bonus Hunt and Tournament, this game has **one object on screen the entire session**. The board is not a screen the UI visits — it's the thing the UI *is*. Every other element is either feeding the board or reacting to it.

```
        JOINING  →  DRAW  →  [ PICK  →  BUYING  →  RESULT ] × n  →  COMPLETE
                                        ↑
                              UNLOCK ───┘

Dash    pool        board      draw       enter 2      confirm      winners
        grows       fills      next       numbers      + lines      + spend
Overlay counter     reveal     spotlight  live figs    flip + kill  bingo or
                    + holes                            dead lines   best line
```

**What makes this UI different from Tournament:** the tournament's drama is sequential — one match at a time, everything else waits. Bingo's drama is **cumulative and simultaneous**. A single red square can kill four lines and a dozen viewers' hopes in one frame. The UI's whole job is making that legible in the second it happens.

---

## The three highest-value UI decisions

*(Four, if the board runs retries — see §19. Build these three first regardless; retry mode is a variation on a board that already works.)*

**1. The board exists at three fidelities.** Do not try to make one component serve all three — this is the same trap as the tournament bracket, and the same answer.

| Where | Density | Text |
|---|---|---|
| **Dashboard board** | Dense, interactive | Full — username, slot, cost, payout, multiplier |
| **Overlay compact board** | Colour and multiplier only, edge-anchored, live all session | **No usernames** |
| **Full-frame takeover** | Whole screen, 5–6 seconds, at one-away / unlock / resolution | Fully legible, usernames headline |

Twenty-five usernames will never fit legibly in a 480px panel. Stop trying at the point where you notice it isn't working, and push that job to the takeover.

**2. One-away is the money state.** A line sitting one square from bingo has to be the loudest thing on the overlay — the line path drawn across the board, pulsing, with the deciding square named. If the overlay renders nothing else well, render this. It is the only moment in the game where the audience knows something enormous is about to happen and has to wait for it.

**3. Lines have to visibly die.** When a red lands on the centre of a 5×5, four lines die at once. Show them dying — the line paths going dark in sequence over ~800ms, and the "LINES ALIVE" counter dropping 12 → 8. A red square that merely turns red wastes the single most dramatic event this game produces.

**4. With retries on, a red has to visibly cost something anyway.** This is the trap of retry mode (spec §6.5): if a red neither kills lines nor ends anyone's session, the biggest event in the game becomes a shrug. Each model has exactly one answer and the UI lives or dies on it — Model A **extinguishes a life pip**, Model B **flies the viewer's name off the board and into the pool**. §19.2 specifies both frame by frame. Build one of them properly or do not ship retries.

---

## A note on red and green

This game is built almost entirely on a red/green distinction, which is the worst available colour pair for the ~8% of viewers with red-green colour deficiency.

**Colour is never the only signal.** Every played square carries:

- **The multiplier, printed large.** `4.25x` versus `0.00x` reads correctly with no colour at all — and it's the number slot viewers already think in.
- **Luminance separation.** Greens are bright and saturated; reds are dimmed to roughly 55% and desaturated. The difference survives greyscale.
- **A shape cue.** Green squares carry a filled corner notch; red squares carry a diagonal strike through the tile.

**With retries on there is a third colour**, and amber against red and green is the worst possible addition to this pair. It is carried by shape, not hue: a wounded square is the only owned tile with a **dashed** border, and it is the only tile that carries **pips**. Neither cue needs colour to read. §19.1 has the full state set.

Test the board in greyscale before shipping it. If you can't tell who's winning, it isn't done.

---

## Screen inventory

**Dashboard**

1. Setup
2. Live control — joining
3. Live control — the draw
4. Live control — playing
5. Live control — unlock
6. Live control — complete

**Overlay**

7. Joining
8. Board reveal
9. Compact board — persistent
10. Active square spotlight
11. Result flip and line kill
12. One-away alert
13. Unlock takeover
14. Final result

**Components**

15. Dashboard board
16. Line status rail
17. Square result entry
18. Pool browser and reserve picker *(reused from Tournament §13, unchanged)*

**Retry mode** *(spec §6.5 — only if retries are enabled)*

19. Retry mode — the two boards *(square states, result sequence, tension meters)*
20. Overlay — reopening takeover *(Model B)*
21. Overlay — match point
22. Overlay — Endless line leaderboard
23. Overlay — sudden-death transition
24. Dashboard — retry controls

---

## 1. Setup

> Build the Slot Bingo setup screen. Two columns — form left (60%), sticky summary right (40%).
>
> **Board**
> - Size — segmented control: 3×3 / 5×5, default 5×5. Beneath it a live explainer that updates with the choice: "25 squares · 12 lines · up to 25 bonus buys" or "9 squares · 8 lines · up to 9 bonus buys"
> - **Projected spend** — this is the most important field on the screen and must not be buried. A currency input labelled "Your typical buy cost", defaulting to €100, feeding a large computed figure beneath: **"≈ €2,500 for a full board"** in Space Grotesk at 32px. Helper text: "A 5×5 is a full-session commitment. You'll know before square 14, not after."
> - Free centre square — toggle, 5×5 only, default off. Helper: "The centre square is an automatic green nobody owns. Roughly doubles the chance of a bingo, from about 5% to about 8%."
>
> **Scoring**
> - Green threshold — currency-free multiplier input, default `1.00x`, with the label "A square turns green at or above". Beneath it a **live odds readout that recomputes as the value changes**: "At 1.00x, roughly 1 buy in 3 goes green — about a 5% chance any line completes. Most boards will finish on best line."
>
>   That readout is the whole point of the field. A streamer who raises this to 5x without being told what it does will run a board that mathematically cannot bingo. Say it in words, on the screen, before they start.
> - Big win threshold — multiplier input, default `50x`. Helper: "Squares at or above this go gold. Cosmetic — gold squares count as green."
> - Read-only info card, not an input: **"If no line goes fully green, the line with the highest combined multiplier wins."** Worked example beneath in muted text: "Row 3 at 4.2x + 0.0x + 61x + 1.1x + 0.4x = 66.7x combined."
>
> **Joining**
> - Join command — text input, prefilled `!join`, with live preview: "Viewers type: !join gates of olympus"
> - Who can join — radio: Anyone / Followers only / Subscribers only
> - Opening window — slider 1–15 minutes, default 5, with a "no limit, I'll close it manually" checkbox
> - **Squares held back** — stepper, 0–4, default 3 on a 5×5 and 1 on a 3×3. Live explainer: "22 squares drawn at the start. 3 held back, opening after picks 6, 12 and 18 for viewers who arrive later." At 0, the explainer switches to a warning tone: "No late entry. Anyone who tunes in after the draw can only watch."
> - Info card: "Each slot can only be claimed once — first come, first served. One square per viewer."
>
> **Retries** *(spec §6.5)* — a disclosure block, collapsed by default and labelled "Second chances — off". A streamer who never opens it gets the default game, which is the intent.
> - **Retries per square** — segmented control: Sudden Death / Second Chance / Three Lives / Endless, default Sudden Death. Beneath it a live readout that recomputes on every change and is the most important thing in the block: **"About a 45% chance a line completes · roughly 42 bonus buys · ≈ €4,200"**. The projected-spend figure above must move in the same frame — a toggle that silently multiplies the session's cost by two and a half is a trap, not a feature.
> - **When a square goes red** — radio, shown only when retries are on, default the first: "**The viewer goes back in the draw**, the square reopens for someone else" / "**The viewer keeps the square** and buys again". Beneath each, one line of consequence: "Every loss reopens a square, so late arrivals always have a queue to join" and "The viewer rides their slot until it pays or kills them". These are Model B and Model A; do not use those names on this screen.
> - **Slot on retry** — segmented, Model A only: Keep the same slot / Draw a new one. Default new at Three Lives and above.
> - **Sudden death after round** — stepper, default 2, with "off" as a valid value. Helper: "Once this round ends, every surviving square gets one final attempt. Without it, a Three Lives board can run past fifty buys."
> - **Budget cap** — currency input. **Required when Endless is selected**, and the form must refuse to submit without it rather than warning: "Endless has no natural end. Set the ceiling here, or the board sets it for you at 2am." Optional otherwise.
> - **Rebuy tokens** — stepper, 0–5, default 0, and shown *outside* the disclosure because it is independent of the dial. Helper: "You decide when to spend one. Reds stay final unless you step in."
>
> **Bot messages** — same block as Bonus Hunt: ack frequency segmented control, announce toggle, stream delay input. Add one row specific to this game: "Announce every square result" — **default off**, with helper text "25 squares is 25 messages. Results live on the overlay; chat gets gold squares, one-aways and the finish."
>
> **Right column, sticky:** a live board preview at the chosen size, settings recap, overlay URL with copy button, and a large primary "Open joining" button.

---

## 2. Live control — joining

Structurally the tournament joining screen. Reuse it; the differences are small and all in the copy.

> Build the joining phase of the Slot Bingo live control screen.
>
> **Top bar:** LIVE dot · "Slot Bingo · 5×5" · elapsed timer · phase indicator (Joining → Draw → Playing → Complete) · "End session" in red outline.
>
> **Hero row** — three cards, the first dominant:
> - Entrants joined — large, counting up with a flash on each increment
> - Squares to fill — "22 of 25" with a subtitle "3 held back"
> - Time left — countdown, or "Manual close"
>
> **Reserved squares panel** — full width, purple border. Header "Reserved squares — 2 of 22", helper "Hand-pick entrants to guarantee them a square. The rest are drawn at random." Username search filtering the joined pool, selected picks as removable cards with avatar, username and claimed slot.
>
> **Join feed and claimed slots** — the two-column component from Tournament §2, unchanged.
>
> **Unresolved queue** — same component as Bonus Hunt §10, above the feed when non-empty.
>
> **Bottom action bar, sticky:** primary "Close joining & fill the board". If the pool is smaller than the squares to fill, a warning beneath with three actions in this order: "Only 14 joined for 22 squares — **keep the held-back squares**, drop to a 3×3, or fill the rest with your own slots." Keeping the held-back squares is listed first deliberately; an underfilled board is exactly the session where late entry matters most.

---

## 3. Live control — the draw

> Build the draw phase of the Slot Bingo live control screen.
>
> **Before the draw runs:** a centred confirmation panel. "Ready to fill 22 of 25 squares from 184 entrants. 2 squares are reserved. 3 will be held back." Large primary button, "Fill the board". Beneath it, in muted text: **"The draw runs once and can't be re-rolled."**
>
> **While drawing:** squares fill one at a time, ~600ms apart, mirroring the overlay. Reserved squares fill first with a purple "Streamer's pick" badge, then the random fill.
>
> **After the draw**, a panel that has no equivalent in the other games:
>
> **The committed pick order.** The order squares will be played in is generated here from the session seed and stored. Show a card containing a short hash of that order — `ORDER COMMITTED · a4f9c2e1` — with the explanation: "The order is fixed now and revealed one square at a time. Nobody sees it in advance, including you."
>
> **The streamer must not be shown the order.** No list, no peek, no debug toggle in production. A streamer who can see what's coming can steer around it, and the fact that they *could* is enough to poison the game. The hash exists so the claim is checkable after the fact rather than merely promised.
>
> **Held-back squares** render on the board as dashed purple outlines labelled "OPENS AFTER PICK 6" / "12" / "18".
>
> **Per-square actions**, available only before the board locks: "Replace" opens the pool browser, for a viewer whose slot turned out to be unresolvable or who's been banned.
>
> **Bottom bar:** primary "Lock the board & start". Confirm dialog notes this is final.

---

## 4. Live control — playing

The workhorse screen. It's live for the entire session and the streamer will run it twenty-five times, so every interaction on it should be reachable without the mouse.

> Build the playing phase of the Slot Bingo live control screen. Three regions: board left (55%), line rail right (45%), action bar fixed at the bottom.
>
> **Top bar:** LIVE dot · "Slot Bingo · 5×5" · elapsed · **"SQUARE 14 OF 25"** · "End session".
>
> **Running totals strip**, directly beneath the top bar, four figures in Space Grotesk with tabular numerals: Spent · Returned · **Net** · Best square. Net is the dominant figure, green above zero and red below, counting rather than snapping. This is inherited straight from Bonus Hunt and it's free — the streamer is running a bonus hunt underneath this game whether the UI acknowledges it or not.
>
> **Left — the dashboard board** (§15).
>
> **Right — the line status rail** (§16).
>
> **Bottom action bar**, the loop, one state at a time:
>
> 1. **Idle** — a single large primary button, "Draw next square". Space bar triggers it. Beside it, muted: "Next square opens after 4 more picks" when an unlock is approaching.
> 2. **Picking** — the button is replaced by the pick animation mirroring the overlay, ~3 seconds, ending on the square id. Non-interactive.
> 3. **Armed** — the square's card expands: slot thumbnail at 64×64, username, slot name, provider, and a line summary — "C3 sits on 4 lines · 2 still alive". Then the result entry (§17). Autofocus the buy cost field.
> 4. **Confirmed** — the square flips on the board, affected lines animate in the rail, and the bar returns to Idle.
>
> **Streamer's pick.** A secondary "Play a specific square" control opens a picker over the board of unplayed squares. Choosing one badges it "Streamer's pick" on the square, in the rail and in history. It is allowed and it is never hidden.
>
> **Recent squares** — a collapsed strip above the action bar: the last five played as small tiles with square id, multiplier and colour, each with an edit pencil. Editing reopens the result fields and, on save, **recomputes every line from scratch** — never incrementally. A corrected payout can resurrect a dead line, and an incremental undo will get that wrong.
>
> **Keyboard:** Space draws the next square · Tab cycles the two result fields · Enter confirms · E edits the last square.

---

## 5. Live control — unlock

> Build the unlock panel. It appears over the playing screen when the pick counter reaches a scheduled unlock, and blocks the "Draw next square" action until it's resolved.
>
> **Header:** "SQUARE C4 IS OPENING" with a subtitle, "Drawn from 47 viewers who joined since the last unlock."
>
> **Body:** the standby pool as a compact scrolling list — avatar, username, claimed slot, joined-at timestamp — with a live count. A large primary button, "Run the draw".
>
> **While drawing:** usernames cycle in the target square for ~2 seconds, then land. Five seconds total, mirroring the overlay. Show the winner's card with **how many live lines their square sits on** — "C4 sits on 2 lines, both still alive" or, honestly, "C4 sits on 3 lines, all dead."
>
> That last line is not a downer, it's the game being straight with someone who just joined. Hiding it means they find out four picks later and feel cheated instead of unlucky.
>
> **Empty standby:** the panel reads "Nobody joined since the last unlock — C4 rolls into the next one" and dismisses. On the final unlock with an empty standby it reads "C4 becomes a house square" instead.
>
> **Secondary action, low emphasis:** "Stop taking entries" — converts remaining held-back squares to house squares and closes joins. Confirm dialog.

---

## 6. Live control — complete

> Build the complete state.
>
> **If a bingo fired:** a gold hero panel, "BINGO — MIDDLE ROW", the completed line drawn across a frozen board, and the winners as a row of cards — avatar, username, slot, their square's multiplier. If one square completed two lines, show both lines and both winner sets; don't pick one.
>
> **If it went to best line:** a purple hero panel, "BEST LINE — COLUMN 2 · 66.7x COMBINED", the winning line drawn across the frozen board, winner cards beneath. **State the tiebreak if one was used**, in a plain sentence: "Tied with Row 4 on combined multiplier — decided on higher combined payout."
>
> **If settled early:** the same panel with a persistent amber pill, "SETTLED EARLY — 18 of 25 squares played", and a note that only fully-played lines were eligible. Never let this state look identical to a completed board.
>
> **Session summary** beneath: total spent, total returned, net, best square, worst square, squares played, lines that died, a full board export and a "Copy results for chat" button.

---

## 7. Overlay — joining

> *(Prefix with the overlay constraints block from `StreamArena-UI-Brief.md` §5.)*
>
> Build the Slot Bingo joining overlay. Anchored left edge, vertically centred, roughly 460px wide.
>
> **Header:** "SLOT BINGO" uppercase with purple underline glow, subtitle "5×5 · 12 LINES".
>
> **Hero number:** entrant count at 88px, Space Grotesk 700, counting up with a purple flash on each join. Label "ENTRANTS".
>
> **Board skeleton** beneath — the empty grid at ~360px, squares as dark tiles with 2px borders, three of them dashed purple. This teaches the shape of the game before it starts and makes the held-back squares a promise rather than a surprise.
>
> **Countdown** if a window is set — 32px, muted, red under 60 seconds. Label "JOINING CLOSES IN".
>
> **Footer, large and unmissable:** "Type !join <slot> to enter" at 24px, `!join` in purple. Two lines beneath, both at 20px muted: "Each slot can only be claimed once" and **"3 squares open later for latecomers"**.
>
> That second line is doing real work. It's the difference between a viewer who arrives at minute 40 and leaves, and one who types.

---

## 8. Overlay — board reveal

> Build the board reveal as a full-frame overlay takeover. Like the tournament draw, this is the most anticipated moment of the session and gets the whole screen.
>
> **Layout:** the board centred and large — a 5×5 at roughly 900×900, squares ~170px. Empty squares are dark tiles with dashed borders.
>
> **Fill animation, one square at a time, ~600ms apart:** the target square lights with a purple border, usernames cycle inside for ~350ms, then land — avatar, username at 24px, slot thumbnail, slot name at 20px. Flash and settle. Reserved squares fill first with a purple "STREAMER'S PICK" badge.
>
> **Header throughout:** "FILLING THE BOARD" with a live counter, "Square 14 of 22".
>
> **The ending is the point.** When the last drawn square lands, the board holds for two seconds with **three visible holes** — dashed purple, each labelled "OPENS AFTER PICK 6" / "12" / "18". The header changes to "BOARD LOCKED · 3 SQUARES STILL TO OPEN" before the panel transitions out.
>
> A completed grid with deliberate gaps in it is a better final frame than a full one. It leaves a question on screen.
>
> Total runtime under ~20 seconds for a 5×5, under ~10 for a 3×3.

---

## 9. Overlay — compact board (persistent)

The defining component. It is on screen for the entire session, which puts it in direct conflict with the rule that the centre of the frame stays clear — so it lives at an edge and gives up text to earn its place.

> Build the persistent Slot Bingo overlay board. Anchored right edge, vertically centred, roughly 480px wide. It never leaves the screen between the board reveal and the final result.
>
> **Grid:** 5×5 with 8px gaps, squares ~89px. Each square is a rounded tile.
>
> **Square states:**
> - *Unplayed* — `--bg-raised` at 88% opacity, 2px `--border`, slot thumbnail at 40% opacity behind, square id at 20px muted in the corner
> - *Open* — 2px dashed `--accent`, centred label "OPENS · PICK 12" at 20px
> - *Green* — `--win` border at 3px, tile tinted, **multiplier at 26px in Space Grotesk 700, white**, filled corner notch
> - *Gold* — as green but `--gold`, with a slow single shimmer on arrival only
> - *Red* — `--loss` at 55% luminance, desaturated, diagonal strike across the tile, multiplier at 26px in muted text
> - *House* — grey border, "HOUSE" at 20px
>
> **No usernames anywhere on this board.** At 89px a username at the 20px minimum either truncates to nonsense or forces the multiplier down to an unreadable size. The multiplier is the number that carries the drama; usernames belong to the spotlight card and the takeover.
>
> **Line overlays**, drawn on top of the grid:
> - *Alive* — nothing. Silence is the default state or the board becomes noise.
> - *Dead* — the line path in `--loss` at 20% opacity, drawn once over 800ms when it dies, then held static and faint
> - *One away* — the line path in `--gold` at 3px, pulsing at ~1.2s, with the deciding square's border pulsing in sync
>
> **Retry mode adds four more tile states** — wounded, reopened, match point and locked. They are specified in §19.1 and are additive: nothing above changes.
>
> **Header strip above the grid:** "SLOT BINGO" left, and right, the tension meter — **"LINES ALIVE 8/12"** at 28px in Space Grotesk. The number drops with a red flash and a brief shake when lines die. It is the single most informative element on the overlay and costs one line of text.
>
> The meter is mode-dependent: with retries on it gains a LIVES LEFT figure, and in Endless it is replaced outright. §19.3.
>
> **Footer strip:** "SQUARE 14 OF 25" left, net position right — green above zero, red below. When an unlock is near, the footer switches to "NEXT SQUARE OPENS IN 3 PICKS · TYPE !JOIN" in purple, and switches back after.

---

## 10. Overlay — active square spotlight

> Build the active square spotlight. Anchored bottom-centre, roughly 900×260, appearing when a square is drawn and dismissing ~3 seconds after its result confirms. The upper-centre frame stays clear throughout.
>
> **Pick animation, ~3 seconds and not a frame longer.** A highlight travels across the unplayed squares on the compact board, decelerating, landing on the target with a purple flash. The spotlight card slides up as it lands.
>
> This animation runs twenty-five times a session. Anything over three seconds becomes the thing the streamer's chat complains about by square eight. Build it short, and resist making it more elaborate later.
>
> **Card content, arranged horizontally:** square id at 32px in a purple pill · slot thumbnail at 96×96 · a text block with the **username at 30px in purple** as the top line, slot name at 24px white beneath, provider at 20px muted below · and on the right, the line summary: "SITS ON 4 LINES · 2 ALIVE" at 20px, with one of those lines named in gold if it's one away.
>
> Username above slot name, exactly as in the tournament. The viewer is the square; the slot is what they brought.
>
> **During the buy:** the right side of the card shows "BUY COST €100" as entered, with the payout field showing a pulsing placeholder. Viewers watch the numbers land in real time.
>
> **On result:** buy cost and payout at 20px muted, and the **multiplier at 56px** as the dominant figure — green, gold or red per the tiers.
>
> **House and free squares** use the same card with the username block replaced by "HOUSE SQUARE — NOBODY OWNS THIS ONE".

---

## 11. Overlay — result flip and line kill

The most important three seconds in the game, and the easiest to under-build. It is not one animation, it is a sequence.

> Build the result sequence that fires when a square's result confirms. Total runtime ~2.5 seconds, in strict order:
>
> 1. **0–400ms — the flip.** The square on the compact board flips on its Y axis and lands in its new colour, multiplier appearing at the halfway point. Gold squares add a single shimmer sweep and a brief particle burst.
> 2. **400–1200ms — the kill.** If the square went red, every line through it dies in sequence, ~150ms apart, each line path drawing itself in dim red across the board. Four lines dying one after another reads as a cascade — do not fire them simultaneously, the whole effect is the sequence.
> 3. **1200–1500ms — the counter.** "LINES ALIVE" drops with a red flash and a 4px shake. If it dropped by more than one, count it down rather than snapping: 12 → 11 → 10 → 9.
> 4. **1500–2500ms — the promotion.** If the square went green and any line is now one square from complete, that line's path draws itself in gold and begins pulsing, and the one-away alert (§12) fires.
>
> **Nothing loops after this settles** beyond the one-away pulse. Per the overlay constraints, motion happens when data changes and then stops.

**With retries on, this sequence fires only on a *final* red** — one that actually kills lines. Survivable reds run a different, shorter sequence per model, and greens are unchanged. See §19.2, which branches off this one rather than replacing it.

---

## 12. Overlay — one-away alert

> Build the one-away alert. It fires the moment a line reaches one square from complete and it is the loudest thing the overlay ever does short of a bingo.
>
> **A band across the lower third**, roughly 1100×120, gold border with an outer glow, sliding up from beneath.
>
> **Content:** "ONE SQUARE FROM BINGO" at 34px uppercase gold, and beneath at 26px white: "MIDDLE ROW · C3 DECIDES IT". The named square's tile on the compact board pulses in sync with the band.
>
> **It holds for six seconds, then collapses** into a persistent gold pip on the compact board's header: "1 LINE ONE AWAY". The band does not stay up — a permanent alert stops being an alert.
>
> **If the deciding square is the very next pick**, the band stays up through the pick and the buy instead of collapsing, and its second line changes to "PLAYING IT NOW". This is the highest-tension configuration the game can produce and the overlay should refuse to let it pass quietly.
>
> **Multiple lines one away** — the band lists up to two by name and shows "+2 MORE" beyond that.

**In retry mode this component is demoted.** A line can enter one-away, be knocked out and re-enter repeatedly, so the band would fire all session and stop meaning anything. It keeps the gold line path and the rail pinning, loses the band, and hands the lower third to **match point** (§21) — which fires only when the armed square can actually end the board. Dedupe the inline banner once per line per entry with a five-minute cooldown, matching spec §12.

---

## 13. Overlay — unlock takeover

> Build the unlock takeover. Full-frame, ~8 seconds, fired when a held-back square opens. The compact board stays visible behind a dimming scrim so the context is never lost.
>
> **Header:** "A SQUARE IS OPENING" at 40px, and beneath, "C4 · DRAWN FROM 47 LATE ENTRIES" at 26px muted.
>
> **The square itself, enlarged to ~320px, centred.** Usernames cycle inside it rapidly for ~2 seconds, decelerating, landing on the drawn viewer — avatar, username at 32px purple, slot thumbnail, slot name at 26px.
>
> **Beneath the square, in gold or muted depending on the answer:** "SITS ON 2 LINES · BOTH ALIVE" — or "SITS ON 3 LINES · ALL DEAD".
>
> **Footer through the whole takeover:** "2 SQUARES STILL TO OPEN · TYPE !JOIN" at 24px, `!join` in purple. On the final unlock this becomes "LAST SQUARE — JOINING IS NOW CLOSED".
>
> This takeover is the only mid-board interruption in the game, and it earns the interruption: it's the one moment that tells a viewer who tuned in twenty minutes ago that there's still a way in.

---

## 14. Overlay — final result

> Build the final result as a full-frame takeover, holding ~12 seconds before collapsing to a persistent summary card.
>
> **Bingo:** the board fills the frame. The completed line **draws itself across the board in gold over 800ms**, then the rest of the board dims to 30%. Header "BINGO" at 72px gold with a glow. The winning squares expand to show usernames at 28px. Winner names listed beneath at 32px. If two lines completed on one square, draw both and list both sets.
>
> **Best line:** same layout, purple instead of gold. Header "BEST LINE" at 64px, and immediately beneath, **"COLUMN 2 · 66.7x COMBINED"** at 32px. The winning line draws itself, the board dims, usernames expand. If a tiebreak decided it, a line at 24px states which: "Tied on combined multiplier — decided on higher combined payout."
>
> Always state how it was decided. An unexplained winning line on stream reads as broken software, and it's one sentence to prevent.
>
> **Settled early:** the same panel with a persistent amber pill, "SETTLED EARLY · 18 OF 25 PLAYED", and unplayed squares left visibly empty rather than dimmed. The frame must not be able to be mistaken for a completed board.
>
> **Collapsed summary card**, bottom-right, persists until the overlay is closed: winning line, winner usernames, combined multiplier, net position.

---

## 15. Component — dashboard board

> Build the interactive board for the dashboard. Square grid, sized to fill its column, squares ~120px on a 5×5.
>
> **Each played square:** username at 15px, slot name at 13px truncated, multiplier at 22px in Space Grotesk, coloured border by tier, small slot thumbnail as a 25%-opacity background.
>
> **Each unplayed square:** username and slot name only, on `--bg-raised`, with the square id in the corner.
>
> **Open squares:** dashed purple with "OPENS AFTER PICK 12".
>
> **Hover any square** — a popover with full detail: username with role badge, slot with provider, buy cost, payout, multiplier, the seq it was played at, and the list of lines it sits on with each line's current state. With retries on, the popover also carries the square's **attempts ledger** and, under Model B, its **ownership history** — see §24.
>
> **Hover any line in the rail (§16)** — the corresponding squares on the board highlight. This pairing is what makes the rail usable; without it the streamer has to decode "Column 2" against a grid in their head while live.
>
> **Line overlays** drawn on the grid at lower intensity than the overlay version: dead lines struck through faintly, one-away lines gold.
>
> **Click an unplayed square** in "play a specific square" mode to select it.

---

## 16. Component — line status rail

The streamer's narration fuel for the whole session — the direct equivalent of Bonus Hunt's guess leaderboard during opening. If this component is weak, the streamer has nothing to say between squares.

> Build the line status rail. A scrollable list of all 12 lines (8 on a 3×3), grouped and sorted.
>
> **Sort order, strictly:** one-away first, then alive lines by combined multiplier descending, then dead lines last and collapsed under a "4 dead lines" disclosure.
>
> **Each row:** line name ("Middle row", "Column 2", "Diagonal ↘") at 15px · a 5-pip mini-diagram of the line's squares in their current colours · combined multiplier at 20px Space Grotesk · squares remaining at 13px muted.
>
> **One-away rows** are gold-bordered, pinned to the top, and name the deciding square: "NEEDS C3".
>
> **Dead rows** are struck through and dimmed. They stay in the list — a streamer will be asked "what happened to the middle row" and needs to be able to answer.
>
> **Live updates:** a row changing state slides to its new sort position over 200ms with an accent flash. A row dying strikes through, then animates down into the collapsed group.
>
> **Header:** "LINES ALIVE 8 / 12" at 24px, matching the overlay figure exactly. The streamer and the audience should never be reading different numbers.

**Retry-mode changes to the rail:**

> **Score on net, and label it.** Spec §8 switches best-line scoring to net (Σ payout − Σ cost across every attempt) the moment retries are on, because combined multiplier rewards the line that burned the most money. The rail's primary figure follows: `+€1,840` at 20px in place of the combined multiplier, with the multiplier demoted to 13px muted alongside. **Both are always visible and the active one is labelled in the header** — "RANKED ON NET" — because the two crown different lines and a viewer tracking the wrong one reads the result as broken.
>
> **The mini-diagram needs the wounded pip**: a hollow amber ring, distinct from the solid green, solid red and empty grey it already has. In Model B a reopened square's pip returns to empty grey with a small amber dot — it is unplayed again, but it is not untouched.
>
> **Sort order is unchanged** — match point first, then one-away, then alive by net descending, then dead collapsed. Rows re-sort far more often in retry mode; keep the 200ms slide and resist the urge to damp it, because that churn is the mode's drama.
>
> **In Endless, drop the dead group entirely** — there is never anything in it — and add a "closest first" ordering that matches the overlay leaderboard (§22) exactly.

---

## 17. Component — square result entry

> Build the two-field result entry for a square. Structurally the tournament's match entry (§15 there) with one side instead of two — reuse the field components exactly.
>
> Buy cost and payout, side by side, both currency inputs with the symbol as a permanent prefix.
>
> **The computed multiplier appears live** beneath, in Space Grotesk at 40px, the moment both fields hold values — gold at or above the big-win threshold, green at or above the green threshold, red below. The formula sits under it in small muted text: "€425 ÷ €100".
>
> **The consequence line is what makes this component different from the tournament's.** Beneath the multiplier, before anything commits, state what this result will do:
>
> - Green, no promotion: "Turns C3 green. Row 3 and Column 3 stay alive."
> - Green, promotion: **"Turns C3 green — MIDDLE ROW WILL BE ONE AWAY."** in gold.
> - Green, completion: **"THIS COMPLETES THE MIDDLE ROW. BINGO."** in gold with a border.
> - Red: "Turns C3 red. **Kills 4 lines** — Row 3, Column 3, both diagonals." with the count in red.
>
> A streamer about to type a payout that ends the session should know that before they hit Enter, not after. It's also the cue to stop talking and let it land.
>
> **Retry mode rewrites the red cases, and this is where the streamer learns what mode they are actually running:**
>
> - Wounded, Model A: "Wounds C3 — **1 life left**. Row 3 and both diagonals survive for now." in amber, with the remaining pips drawn inline.
> - Wounded, Model B: "**Reopens C3.** @slotgoblin returns to the pool of 47. Lines survive until it's redrawn and played." in amber.
> - Final red: "Turns C3 red for good. **Kills 4 lines** — Row 3, Column 3, both diagonals." in red, unchanged from above and now rarer, which is the point.
> - Match point green: "**THIS COMPLETES THE MIDDLE ROW. BINGO.**" — unchanged, and it should be the loudest thing this component ever renders.
>
> The distinction between the first two lines is the entire difference between the two models, stated in the one place the streamer cannot miss it.
>
> Tab cycles the two fields, Enter confirms. Buy cost of zero blocks confirm with an inline error, "Buy cost must be more than €0". Payout of zero is valid and common — never warn on it.

---

## 19. Retry mode — the two boards

Everything from §9 to §17 describes the **Sudden Death** board: a square is played once and a red is permanent. Retry mode (spec §6.5) changes what a red *does*, and the two models change it in different directions. Build §9 first and correctly; these are variations on it, not replacements.

**The one-line difference the UI has to sell:**

| | Model A — square retry | Model B — re-entry draw |
|---|---|---|
| A red means | the square is wounded | the viewer is knocked back into the pool |
| The tile becomes | amber, owner intact, one fewer life | open again, unowned, scarred |
| The drama is | a life burning down | **a name flying off the board** |
| The meter is | LIVES LEFT | POOL |

Model B is the default and it is the more visual of the two, because the thing that changes is a *person*, not a counter. Build it as the primary and Model A as the variation.

---

### 19.1 Square states

Four new tile states join the five in §9. All of them have to survive greyscale (see the accessibility note near the top of this document — with amber in play, that test matters more, not less).

> Extend the compact board's square states. Existing states — unplayed, open, green, gold, red, house — are unchanged.
>
> **Wounded** *(Model A)* — the square is still owned, still in play, and has taken a hit.
> - `--warn` border at 2px **dashed** — the dash is the shape cue, and it is the only dashed border on a tile that has an owner
> - Tile at 70% opacity, slot thumbnail still visible behind
> - The failed multiplier printed small at 15px in the top corner, **struck through** — `0.42x` — so the board keeps a visible memory of what it cost
> - **Life pips bottom-right**: `●●○` at 14px. Filled pips in `--warn`, spent pips as hollow outlines at 30%. On the last life the pips are `●○○` and the whole tile border pulses slowly at ~2s
> - No multiplier at 26px — that slot is reserved for settled squares, and a wounded square has not settled
>
> **Reopened** *(Model B)* — nobody owns this square any more, and somebody used to.
> - 2px dashed `--accent`, same as a virgin open square, because functionally it is one
> - **But scarred, and the scar is the point:** a `--loss` diagonal notch in the top-left corner, and a label at 15px reading **"3 BURNED"** where a virgin open square reads "OPENS · PICK 12"
> - Centred label "REOPENED" at 18px
> - A virgin open square and a reopened square must never be mistakable for each other. One is a promise, the other is a graveyard.
>
> **Match point** *(both models)* — the armed square would complete a live line if it greens. `--gold` border at 3px with an outer glow, pulsing at ~1s, brighter than the one-away pulse and reserved for this. Only ever one square at a time.
>
> **Locked** *(sudden-death tail, §23)* — a red that was wounded and has now spent its last life. It is an ordinary red tile plus a small `--warn` padlock glyph at 14px in the corner, so the board can distinguish "died naturally" from "died because the tail locked it".

**Greyscale test, retry edition.** Green = corner notch. Red = diagonal strike. Wounded = dashed border + pips. Reopened = dashed border + corner notch in the *opposite* corner to green's. Four states, four distinct shapes, no colour required. If you cannot read the board in greyscale, the pips are too small — that is almost always what has gone wrong.

---

### 19.2 The result sequence, rewritten

§11's sequence assumes a red kills lines. Under retries it usually does not, and the sequence has to earn its 2.5 seconds a different way.

> Build the retry-mode result sequence. It branches on whether the red was **survivable** or **final**.
>
> **A. Red, survivable — Model A** *(~1.8s)*
> 1. **0–400ms** — the tile flips and lands amber, not red. The failed multiplier appears struck through in the corner.
> 2. **400–700ms** — **a life pip extinguishes.** It does not fade; it snaps dark with a 3px shake on the tile. This is the whole beat and it must be sharp enough to read at a glance.
> 3. **700–1400ms** — **the lines shudder.** Every line through the square flashes its path in `--loss` at 40% for 200ms and then goes clear again. They were threatened, not killed, and the flash is how the audience learns the difference.
> 4. **1400–1800ms** — the LIVES LEFT meter decrements with an amber flash.
>
> **B. Red, survivable — Model B** *(~2.6s, and this is the signature animation of the mode)*
> 1. **0–600ms** — the tile flips and lands **fully red**, multiplier at 26px. Let it be a loss for a beat. Do not soften it.
> 2. **600–1400ms** — **the name lifts off.** The owner's username rises off the tile, scales down, and travels in an arc to the POOL counter in the header, trailing faintly. This is the one moment in the game where the audience watches a person move from the board back into the crowd, and it is worth every one of its 800ms.
> 3. **1400–1700ms** — the POOL counter increments with a purple flash and a brief scale-up: `47 → 48`.
> 4. **1700–2200ms** — the tile transitions from red to the reopened state, the burn counter ticking up in place: `2 BURNED → 3 BURNED`.
> 5. **2200–2600ms** — the lines shudder as in A. They are alive but the square under them is now unowned and unplayed, which the line rail (§16) reflects immediately.
>
> **C. Red, final** — the square has no lives left, or the tail has locked it, or the mode is Sudden Death. **Run §11 exactly as written**, lines dying in sequence and the counter dropping.
>
> **This branch is the point.** Under retries, a line kill is rare — so when it does fire it should hit harder than it does on a Sudden Death board, not softer. Give the sequence in §11 an extra 200ms of hold before the counter drops when it fires in retry mode, and let the room notice.
>
> **D. Green** — unchanged from §11, with one addition: under Model B, a green **locks the viewer in**, and the tile should say so. A brief `--win` ring expands outward from the tile over 300ms and the spotlight card's username block gains a small "LOCKED IN" pill for its remaining dwell.

---

### 19.3 The tension meter, by mode

The header strip in §9 carries one figure. Which figure depends on the mode, and getting this wrong is what makes a retry board feel like it has no stakes.

> Build the header tension meter as a mode switch. It occupies the same slot in the compact board header in all cases.
>
> **Sudden Death** — `LINES ALIVE 8 / 12`. Unchanged.
>
> **Finite retries** — two figures, side by side, `LINES ALIVE 11 / 12` and **`LIVES LEFT 14`**. The second is the real clock: lines barely die early on, so lines-alive sits flat near 12 for most of the first round and communicates nothing. Lives-left falls steadily from the first red and is the honest measure of how much board is left. Same red flash and shake on decrement.
>
> **Endless** — **remove LINES ALIVE from the overlay entirely.** It is a constant, and a counter that never moves reads as broken software. In its place:
> - **The line leaderboard** (§22) replaces it in the header slot, showing the top three lines by greens
> - **The budget meter** takes the footer: `€4,200 / €5,000` as a thin horizontal bar in `--accent`, turning `--warn` past 80% and `--loss` past 95%, with the figure at 24px alongside
>
> In Endless the money is the antagonist. If the budget bar is not on screen, the mode has no source of dread and the board is a screensaver with good production values.

---

## 20. Overlay — reopening takeover *(Model B)*

The unlock takeover in §13 already does almost exactly this job. Reuse it wholesale; the differences are copy and frequency.

> Build the reopening takeover as a variant of §13. Full-frame, **~5 seconds rather than 8** — this fires far more often than a scheduled unlock and cannot be allowed to become the thing chat complains about.
>
> **Header:** "C3 IS BACK IN PLAY" at 40px, and beneath, "@slotgoblin went red · drawn from 48 in the pool" at 26px muted.
>
> **The square enlarged to ~320px, centred**, starting in its reopened state — scar and burn count visible — then usernames cycling inside it for ~1.5s, decelerating, landing on the drawn viewer. Avatar, username at 32px purple, slot thumbnail, slot name at 26px.
>
> **Beneath the square:** "SITS ON 3 LINES · 2 ALIVE" in gold or muted per the answer, exactly as §13. A viewer drawn onto a square whose lines are all dead is told so, plainly, at the moment they get it.
>
> **The burn line, and do not omit it:** "THIS SQUARE HAS BURNED 3" at 20px in `--loss`, with the previous holders' names listed small beneath. A cursed square is the best running story the board produces and it costs one line of text to tell it.
>
> **Footer:** "POOL: 47 WAITING · TYPE !JOIN TO GET IN" at 24px, `!join` in purple.
>
> **Frequency control.** On a busy board this can fire back to back. Cap the full takeover at **one per 90 seconds**; beyond that, reopenings collapse into an inline banner across the compact board's header — "C3 REOPENED → @lateshow" for 3 seconds — with the full takeover reserved for reopenings on lines that are still alive. The interruption has to stay rare enough to still mean something.

---

## 21. Overlay — match point

With retries on, this replaces §12 as the loudest thing the overlay does short of a bingo. Build §12 first — this is the same component with a different trigger and a tighter window.

**Why it replaces one-away:** on a retry board a line enters one-away, gets knocked out, and re-enters, over and over. One-away stops being news and becomes weather. Match point cannot be weather — it fires only when the square *currently armed* would end the board.

> Build the match point alert. It fires at the moment a square is armed, before the buy, and it is the highest-tension state this game can produce.
>
> **Structurally §12's band** — lower third, ~1100×120, gold border with an outer glow, sliding up from beneath. Two differences.
>
> **It does not collapse.** §12's band retreats to a pip after six seconds because a permanent alert stops being an alert. This one holds through the pick, through the buy, and through the result, then resolves with it. The window is bounded by the buy, so it cannot overstay.
>
> **Content:** "MATCH POINT" at 34px uppercase gold, and beneath at 26px white: "C3 GREENS AND THE MIDDLE ROW IS BINGO — @slotgoblin ON GATES OF OLYMPUS". The named square carries the match-point tile state from §19.1, pulsing in sync with the band.
>
> **As the payout is entered**, the band's second line switches live to the running multiplier and its verdict — "4.25x · BINGO" in gold, or "0.00x · NOT THIS TIME" in red — resolving the instant the result confirms.
>
> **Two lines at match point on one square:** name both. "C3 GREENS AND BOTH DIAGONALS GO." That is the single best frame this game can produce and it should not be summarised as "+1 more".
>
> **Demote §12 in retry mode.** One-away keeps its gold line path on the board and its rail pinning, but loses the band entirely — it becomes a 3-second inline banner in the compact board header instead. There is only room for one loudest thing, and match point is more deserving of it.

---

## 22. Overlay — Endless line leaderboard

Endless has no dying lines, so it needs a different way to show who is close. A race needs a leaderboard.

> Build the Endless-mode line leaderboard. It occupies the compact board header slot in place of LINES ALIVE, roughly 480×110, sitting directly above the grid.
>
> **Three rows, no more.** The top three lines by greens, then by net score.
>
> **Each row:** line name at 16px · a 5-pip mini-diagram in current colours, matching the rail's (§16) exactly · progress as **"4/5"** at 22px Space Grotesk · net at 15px muted, `+€1,840`.
>
> **The leader row is `--gold`-bordered.** Rows re-sort with a 250ms slide and an accent flash when the order changes — which happens often, and that churn *is* the drama in this mode. Do not damp it.
>
> **Any row at 4/5 pins to the top and pulses**, and the row shows which square decides it: "NEEDS C3".
>
> **Below the three rows, one muted line:** "9 other lines · best 3/5". The audience needs to know the leaderboard is a window onto twelve lines, not the whole field.
>
> Pair this with the budget meter in the footer (§19.3). Together they are the mode's entire tension model: how close the closest line is, against how much room is left to get there.

---

## 23. Overlay — sudden-death transition

The rules change mid-board. That is a heavy thing to do on a live stream and it needs a moment, not a toast.

> Build the sudden-death transition. Full-frame, ~4 seconds, fired when the tail begins (spec §6.5.6) — either on schedule or when the streamer triggers it.
>
> **The board fills the frame** and every square that still has lives left flashes its remaining pips once, in sequence, left to right — the board visibly counting what is about to be taken away.
>
> **Header:** "SUDDEN DEATH" at 64px in `--loss` with a hard shadow. Beneath at 28px: "7 SQUARES LEFT · ONE ATTEMPT EACH".
>
> **Then the pips extinguish**, all of them at once, over 400ms, and the affected tiles settle into a plain last-life state with the padlock glyph from §19.1.
>
> **If rebuy tokens are in play**, a final line at 22px muted: "NO MORE REBUYS." Any unspent tokens are shown being struck through in the dashboard's token row at the same moment.
>
> **After the takeover**, the LIVES LEFT meter is removed from the header and LINES ALIVE returns in its place — the board is a Sudden Death board again, and its meter should say so. That swap is the clearest possible signal that the rules changed, and it costs nothing.

---

## 24. Dashboard — retry controls

> Extend the playing screen (§4) with a retry control block. It sits beneath the result entry, not beside it — these are deliberate, occasional actions and must not compete with the two fields the streamer uses twenty-five times a session.
>
> **Rebuy tokens**, when configured: a row of token pips at 24px, filled for unspent, hollow and struck for spent. Beside them, a **"Spend a rebuy"** button, enabled only when the selected square is red and the board is not complete.
>
> **Confirmation is required and it must state the cost**, because this is the one action in the game that spends real money on a square that has already lost: "Rebuy C3? This buys another bonus on Sugar Rush 1000. 2 tokens will remain." Confirm / Cancel, no default focus on Confirm.
>
> **A rebuy is badged permanently** — on the tile, in the square's popover, in the log, and in the chat announcement. Same stance as Streamer's pick: visible, never hidden.
>
> **"Trigger sudden death"** — a secondary destructive-styled button with a confirm step that states the consequence in full: "7 squares still have lives. Each gets one final attempt, then the board resolves. This cannot be undone."
>
> **"Reopen square"** *(Model B)* — for a viewer who has clearly left, or a result entered against the wrong square. Confirm step names who is being removed: "Reopen C3? @slotgoblin returns to the pool of 47 and the square will be redrawn."
>
> **The pool panel** replaces the standby panel in Model B and is the same component with a fuller job. It lists everyone waiting, badged by route — `LATE` for a viewer who has never held a square, `BURNED ×2` for a viewer knocked back twice — sorted by wait time. Header: "POOL · 48 WAITING". The streamer will be asked "is @x still in?" repeatedly across a four-hour session and needs to answer without scrolling.
>
> **Square popover, extended** (§15): beneath the existing detail, an **attempts ledger** — one row per bonus bought on that square, with owner, slot, cost, payout, multiplier and seq. Under Model B this is the square's whole biography, and it is what the streamer reads aloud when a cursed square comes up again.

---

## States to build

| State | Where | Behaviour |
|---|---|---|
| Zero joins yet | Joining + overlay | "Waiting for the first !join", command shown large |
| Fewer joiners than squares | Joining, bottom bar | Three actions, held-back squares preserved first |
| All squares reserved | Joining | Note no random draw will run; button reads "Lock the board" |
| Entrant's slot unresolvable at draw | Draw | Square flagged amber with a "Replace" action |
| Duplicate slot attempted | Chat only | "Gates of Olympus is already claimed by @x — pick another" |
| Join arrives during the board reveal | Chat only | Warm ack into standby, never a rejection |
| Standby empty at an unlock | Unlock panel | "Rolls into the next unlock" — or HOUSE on the final one |
| Unclaimed open square reached in the order | Playing | Plays as HOUSE, spotlight card states so plainly |
| Late square lands on all-dead lines | Unlock takeover | Stated openly in muted text, not hidden |
| Square result edited | Board + rail | **All lines recomputed from scratch**, affected rows re-sort, toast confirms |
| Edit resurrects a dead line | Board + rail | Line un-strikes and animates back up the sort with an accent flash |
| Two lines complete on one square | Final result | Both drawn, both winner sets listed |
| Best line tie | Final result | Tiebreak stated in a plain sentence |
| Board full, no bingo | Final result | Best-line panel — never a "no winner" state, it cannot occur |
| Settled early | Final result | Amber pill, unplayed squares left visibly empty |
| Session abandoned mid-board | Complete | No winner panel, no announcement, board saved to history |
| Overlay disconnected | Dashboard right rail | Red card with copy-URL and troubleshooting link |
| Session recovered after refresh | Dashboard | "Session restored" toast, board and line states intact |

**Retry mode** *(§19–§24)*

| State | Where | Behaviour |
|---|---|---|
| Red on a square with lives left | Board + overlay | Wounded tile, pip extinguishes, lines shudder but hold (§19.2A) |
| Red under Model B | Board + overlay | Name flies to the pool, tile reopens, burn count ticks (§19.2B) |
| Red on the last life | Board + overlay | Full §11 kill sequence, plus 200ms extra hold — it's rare now, let it land |
| Pool empty when a square reopens | Pool panel + overlay | Tile holds in reopened state, "waiting for entries", rolls into the next draw |
| Only burned viewers left in the pool | Pool panel | Normal. Badges read `BURNED ×2`; no special state needed |
| Viewer redrawn onto the square that burned them | Reopening takeover | Blocked for one draw. Panel shows them greyed with "not eligible this draw" |
| Viewer goes red then leaves the stream | Pool panel | Stays in the pool. Absence is not a forfeit; no UI distinction |
| Square burned 3+ times | Board + takeover | Cursed-square treatment — burn count on the tile, holders listed in the takeover |
| Reopenings firing back to back | Overlay | Full takeover capped at one per 90s; the rest collapse to a header banner (§20) |
| Match point reached | Overlay | Band holds through pick, buy and result — does not collapse (§21) |
| Two lines at match point on one square | Overlay | Both named in full. Never "+1 more" |
| Budget cap reached mid-board | Overlay + dashboard | Board resolves by best line, labelled **capped** — a distinct pill from "settled early" |
| Sudden-death tail begins | Overlay + dashboard | Full-frame transition, pips extinguish, meter swaps back to LINES ALIVE (§23) |
| Rebuy spent on an all-dead square | Dashboard + tile | Allowed, badged permanently. The streamer's call, visibly theirs |
| Last rebuy token spent | Dashboard | Token row goes hollow; the "Spend a rebuy" button disables with "No tokens left" |
| Revert requested after a Model B redraw | Result entry | Blocked. Inline error naming why: "C3 has a new owner — use Reopen instead" |
| Endless mode running | Overlay | LINES ALIVE removed entirely; leaderboard + budget bar in its place (§19.3, §22) |

---

## Build order

**§2 joining → §18 pool browser *(already built, see inventory)* → §3 draw → §15 dashboard board → §16 line rail → §17 result entry → §4 playing → §9 compact board → §10 spotlight → §11 result flip → §12 one-away → §5 and §13 unlock → §6 and §14 results → §8 board reveal → §7 joining overlay → §1 setup.**

Joining and the draw first, because nothing downstream can be tested without a filled board. Then the **dashboard board, line rail and result entry as one unit** — together they let you step a full session end to end in the dashboard alone, with no overlay work at all, and that is the fastest path to knowing whether the game is any good.

The compact board and the result-flip sequence come next and deserve the most time on the whole project. Everything after them is presentation layered on a game that already works.

**The board reveal and the unlock takeover come late deliberately.** They are the two highest-effort animations in the game and they are pure spectacle — a Slot Bingo session is fully playable without either, and neither should be allowed to block getting a real board onto a real stream.

### Retry mode, if it gets built

**§24 rebuy tokens → §19.1 square states → §19.2 result sequences → §19.3 meters → §21 match point → §20 reopening takeover → §22 and §19.3 Endless → §23 sudden death.**

**Rebuy tokens first, and possibly only.** They are a token row, a confirm dialog and a badge — a day's work against a fortnight for the dial — and they exercise the same "a red isn't necessarily final" path through the reducer, the tile states and the log. They answer the question the whole retry dial exists to answer, which is *can this board reach a bingo*, without rounds, ownership history or a rescaled unlock schedule. Ship tokens, watch one real session, and only build the dial if streamers ask for more. This mirrors the build order in spec §15 and it is the single most useful line in either document.

**If the dial does get built, build Model B and skip Model A until asked.** Model B is the default, it is the more visual of the two, and it reuses the unlock takeover and the standby pool that §13 and §5 already produced. Model A needs a round-order re-shuffle and a life-pip system that exists for one mode nobody chose. Two models in the spec is cheap; two models in the overlay is not.

**§23 last, and it is not optional.** A board that changes its own rules mid-session without a full-frame moment to announce it will read as a bug on stream, and it will be the clip that circulates.
