# Team Battles — Complete UI Specification

Companion to `StreamArena-UI-Brief.md` — paste that document's §1 (app context), §2 (design tokens), and §3 (primitives) first, then build from here. §5 of that document (overlay platform laws) governs every overlay state below. Game rules live in `StreamArena-TeamBattles-Spec.md`.

**The organising principle:** this game has **one persistent object and one repeating event**. The object is a two-column scoreboard that never leaves the screen. The event is a five-second flip that takes the screen away from it, ten to fifteen times a session. Build the scoreboard first, build the flip properly, and everything else is a variation on those two.

```
        JOINING  →  [ PICK  →  FLIP  →  BUYING  →  RESULT ] × n  →  FINAL

Dash    pool         draw     fire      enter 2     confirm       three
        grows        next     flip      numbers     + recount     takeovers
Overlay counter      card     TAKEOVER  swing no.   bank + climb  win/MVP/anchor
        + crests                                                  + resting board
```

**What makes this UI different from Tournament and Bingo:** in those games the drama is in a structure — a bracket, a board. Here there is no structure at all. There are two numbers. Everything the UI does is either **making those two numbers feel like a fight**, or **protecting the five seconds where the coin decides who a person belongs to.** A build that gets the scoreboard right and the flip wrong has failed; the reverse is nearly survivable.

---

## The four highest-value UI decisions

**1. The flip takeover is the product.** It runs 10–15 times a session, it is the mechanic every other game in the catalog doesn't have, and it is pure front-end — no logic runs during it (spec §6.1, the result is already committed). It should be built first, in isolation, before any game state exists. If those five seconds don't hold up on the eleventh viewing, nothing else in this spec matters.

**2. The swing number is the second-largest thing on screen, permanently.** Bonus Hunt has break-even; Bingo has the one-away line; Team Battles has **"FORTUNE NEED 41.8× ON THIS PICK"**. It is what makes the *buying* phase — a streamer silently loading a bonus — watchable. Without it the overlay is two numbers that only change when something already happened.

**3. Averages must count up, never snap.** The team score is the win condition and it moves once per pick. Watching `11.4×` climb to `14.2×` over 900ms is the payoff of the entire pick, and it's also the only moment the audience can *feel* the size of a result rather than read it. A number that jumps has thrown away the reward for watching.

**4. Team identity is carried by three signals, not one.** Colour, glyph shape, and column position — always all three, always consistent. Chaos is violet, angular, left. Fortune is gold, circular, right. A viewer who can't see colour, or is watching a 240p mobile stream, still knows who's winning.

---

## A note on the two colours

The whole overlay is two colours reporting who's winning, so the pair was chosen against colour-vision simulation rather than by taste (spec §3).

```css
--chaos:      #B44BFF;   /* electric violet */
--chaos-dim:  #6B2C99;   /* member rows, inactive states */
--chaos-glow: rgba(180,75,255,.28);

--fortune:      #FFC53D; /* gold */
--fortune-dim:  #99752A;
--fortune-glow: rgba(255,197,61,.28);
```

Violet against gold gives a **2.80× greyscale luminance separation** — the widest of any pair tested, and the number that matters when the stream is being watched on a phone in daylight.

**Three rules that come out of that, all non-negotiable:**

- **Colour is never the only signal.** Chaos carries the angular ⚡ glyph and always sits left; Fortune carries the circular 🪙 glyph and always sits right. Every member row, every badge, every result card carries the glyph.
- **The app accent purple `--accent #A855F7` is suppressed everywhere Team Battles renders.** Against Chaos violet it measures **1.02:1 contrast and 0.033 worst-case CVD separation** — they are, to a viewer, the same colour. On Team Battles screens the primary action colour becomes neutral white-on-raised (`--text-primary` on `--bg-raised`, 2px `--border-strong`), and `--accent` is used nowhere. This is a correct outcome rather than a compromise: "Run the flip" must not wear a team's colour.
- **`--gold` is suppressed too, for a different reason.** The semantic gold token (`#FFC53D`, "best result / notable") is *the same value* as Fortune's team colour. A gold MVP marker on a Team Battles screen reads as "Fortune" to every viewer. So on these screens `--gold` carries no semantic meaning: MVP, best-result, and notable markers all use neutral `--text-primary` with a shape cue instead. This is why the MVP takeover in §14 is deliberately neither team's colour.
- **Test in greyscale before shipping.** Same instruction as the Bingo board, same reason. If you can't tell who's leading, it isn't done.

**Motion is a fourth signal**, and it's free: Chaos elements snap in, overshoot, and settle late. Fortune elements ease in and land square. Two easing curves, applied consistently, and viewers learn the difference without being told.

---

## Screen inventory

**Dashboard**

1. Setup
2. Live control — joining
3. Live control — pick & flip
4. Live control — buying & result
5. Live control — complete

**Overlay**

6. Joining
7. Standing scoreboard — persistent
8. Pick card
9. **The flip takeover**
10. Buying state — the swing number
11. Result bank & recount
12. Lead change sting
13. Sudden death transition
14. Final — three takeovers

**Components**

15. Team column
16. Pick result entry
17. Crowd meter
18. Pool browser and reserve picker *(reused from Tournament §13, unchanged)*
19. Session ledger

---

## 1. Setup

> Build the Team Battles setup screen. Two columns — form left (60%), sticky summary right (40%).
>
> **Format**
> - Picks this session — segmented control: 10 / 15 / 20 / Custom, default 10. Beneath it a live explainer that updates with the choice: **"10 picks · roughly 45–70 minutes · ~€2,000 at a €200 typical buy"**. The spend figure recalculates from the buy-bounds fields below and must move visibly when either input moves.
> - Win metric — segmented: **Average per pick** (default) / Total / Trimmed average. Selecting Total reveals an inline amber warning that cannot be dismissed: *"Team sizes are decided by coin flips, so they're rarely equal. On total, the team that got more picks wins about 80% of the time."*
> - Draw mode — radio: **Coin flip, 50/50** (default) / Balanced bag. Choosing the bag reveals: *"Teams end even, but the last pick of the session is always predetermined."*
> - Sudden death — toggle, default on, with threshold and max-extra-picks inputs revealed beneath it.
>
> **Teams**
> - A preset picker showing colour swatch pairs: **Chaos / Fortune** (default, selected), Blaze / Frost, Kraken / Phoenix, High / Low, Custom.
> - Selecting Custom reveals two name fields and two colour pickers, plus a **live contrast readout** beneath them — greyscale separation ratio and a pass/warn chip. Below 2.0× shows a warning: *"These two teams will be hard to tell apart on a monochrome capture or a low-quality stream."*
> - A preview strip showing both team crests as they'll appear on the overlay, at actual size.
>
> **Joining**
> - Join command — text input, prefilled `!join`, with live preview: "Viewers type: !join gates of olympus"
> - Who can join — radio: Anyone / Followers only / Subscribers only
> - Join window before pick 1 — slider 1–15 min, default 5, with a "close it manually" checkbox
> - Info card, not a setting: **"Joining never closes. Viewers can enter right up to the final pick."**
> - Pool cap — number input, default empty with placeholder "No cap", plus helper text: "Leave empty unless you want a smaller pool. Entry rules already stop spam."
>
> **Slot rules**
> - Buy cost range — a dual-handle range slider in bet multiples, default 50×–500×, with a live line beneath: "At €1 bet, that's €50–€500 per bonus."
> - Blocked providers — multi-select chips
> - Blocked slots — searchable multi-add against the catalog
> - Volatility floor — optional dropdown, default off
>
> **Sides**
> - Side command — text input, prefilled `!side`, with a preview showing all four accepted forms
> - Who can declare — radio: Anyone / Followers / Subscribers
> - Sides lock at pick — number input, default half the pick count, with helper: "After this, no new sides. Stops viewers piling onto the winner at pick 14."
>
> **Awards** — two toggles: MVP (locked on, shown greyed with a tooltip) and **The Anchor** (default on, helper: "The lowest multiplier of the session, awarded with affection.")
>
> **Bot messages** — the shared block: ack frequency segmented control, announce-winners toggle, stream delay input. Plus one game-specific toggle: **Announce lead changes**, default on.
>
> **Right column, sticky:** settings recap, **the projected spend and session length as a large figure**, overlay URL with copy button, and a primary "Open joining" button.

**The fairness commitment lives on this screen.** Below the primary button, in muted text with a small lock glyph:

> *The flip sequence for all 10 picks is generated and locked when you open joining — before anyone has entered. A fingerprint is posted to chat now; the full sequence is published when the session ends.*

That sentence is doing real work. It's the answer to the only accusation this game will reliably attract, and it has to be visible in the product rather than in documentation.

---

## 2. Live control — joining

> Build the joining phase of the Team Battles live control screen.
>
> **Top bar:** LIVE dot · "Team Battles" · elapsed timer · phase indicator (Joining → Pick → Flip → Buying → Result → Complete) · pick counter **"PICK 0 / 10"** · "Abandon session" in red outline.
>
> **Hero row** — three cards, the first dominant:
> - Entrants in pool — very large, counting up with a violet flash on each increment
> - Picks this session — 10
> - Time until pick 1 — countdown, or "Manual start"
>
> **The two team crests, full width, idle.** Both at 40% opacity, greyed, side by side exactly as they'll sit on the overlay — Chaos left, Fortune right. Empty rosters beneath each, showing "0 picks · —". They are on screen from the first second because they are what the session is about, and a streamer glancing at this screen should already be looking at the shape of the game.
>
> **Reserved picks panel** — full width, violet border. Header "Reserved picks — 1" with helper text: **"Guarantee someone gets drawn. You can't choose their team — nobody can."** That second sentence is the whole point and must not be cut.
> - Username search filtering the pool as you type
> - Selected picks as removable cards: avatar, username, claimed slot with thumbnail, buy cost in bet multiples
>
> **Join feed** — two columns.
>
> *Left, the live feed.* Newest at top: avatar, username with role badge, arrow, slot thumbnail, slot name, and the buy cost as a small mono chip (`180×`). New rows slide in with a violet flash. A "Reserve" button on row hover.
>
> *Right, claimed slots.* Compact scrollable list, alphabetical, owner's username beneath each. What the streamer glances at when chat asks "is X still free?"
>
> **Rejected entries strip** — collapsed by default, above the feed, showing count only: "6 entries rejected — buy out of range (4), blocked provider (2)". Expandable. This exists so a streamer can spot bounds set too tight before the session rather than after.
>
> **Unresolved queue** — same component as Bonus Hunt, sitting above the feed when non-empty.
>
> **Crowd meter** (§17) in the right rail, live from the first `!side`.
>
> **Bottom action bar, sticky:** primary **"Start battle — draw pick 1"**. If the pool is smaller than the pick count, a warning beneath rather than a block: "Only 6 in the pool for 10 picks. Joining stays open, so this usually resolves itself — or enable re-entry in settings."

---

## 3. Live control — pick & flip

The most consequential screen in the product, because it contains the one irreversible button.

> Build the pick and flip phases of the Team Battles live control screen.
>
> **PICK state — before the flip:**
>
> **Drawn entrant card**, centred and dominant: avatar, username at 28px, slot thumbnail at 96×96, slot name, provider, buy cost in bet multiples and in currency. A "Streamer's pick" badge in violet if reserved. Both team crests flank the card, **both still neutral grey** — no colour anywhere yet.
>
> Beneath the card, two buttons of deliberately unequal weight:
> - **"Run the flip"** — large, primary, full width
> - "Veto this slot" — small, tertiary, right-aligned, with a required reason dropdown (Not on my casino / Buy out of range / Troll entry / Other)
>
> Directly under both, in muted text with a lock glyph: **"The flip runs once. Veto is unavailable after this point."**
>
> **FLIP state — while the animation plays:**
>
> The dashboard mirrors the overlay animation at reduced scale so the streamer isn't watching their own stream on delay to know what happened. **Every control on the page is disabled for the duration**, replaced by a single "Skip animation" text button that jumps to the settled frame.
>
> **After the snap:** the entrant card recolours to the assigned team, flies into that team's column, and the screen advances to Buying. A one-line log entry appears in the session ledger (§19).
>
> **If the drawn viewer had declared the other side**, the card shows a struck-through allegiance badge — *"declared FORTUNE"* — and the flash line **"THE COIN SAYS CHAOS"**. This carries through to their member row for the rest of the session.

**The veto ordering is a state machine rule, not guidance.** `veto` is a legal action in PICK and rejected in every phase after it (spec §6.2). Build it as such — a disabled button is not enough, because the reason it exists is to be un-clickable at a moment when the streamer has a strong motive to click it.

---

## 4. Live control — buying & result

The screen the streamer looks at while actually buying the bonus. Two numbers decide the pick, and they should be enterable without looking away from the game for long.

> Build the buying and result phases of the Team Battles live control screen.
>
> **The entrant card stays pinned at the top**, now in their team's colour, with the team crest active beside it.
>
> **The swing number, large, directly beneath:** "FORTUNE NEED 41.8× ON THIS PICK" if the trailing team is up, or "CHAOS CAN PUT THIS OUT OF REACH — 62.0× MAKES IT A 3× LEAD" if the leader is. Same figure the overlay is showing, so the streamer can react to it out loud without checking the stream.
>
> **Result entry** (§16), inline, two currency inputs side by side:
> - Buy cost — prefilled from the slot catalog's typical buy where known, editable, tab-focused on entry
> - Payout — empty, accepts 0
> - A live multiplier readout between them at 48px, updating as the streamer types, greyed until both fields are valid
>
> Keyboard: `Tab` between fields, `Enter` to bank. Buy cost of 0 is rejected inline with the message "Buy cost must be more than zero" — the field never accepts a value that would divide by zero.
>
> **Bank button:** "Bank 2.00× to Chaos", labelled with the live computed values so the streamer reads back what they're committing.
>
> **After banking** — a 900ms sequence mirrored from the overlay: the multiplier lands on the card, the card slots into the team column, the team average counts up, and the standing scoreboard redraws with the new swing number. Then a primary **"Draw pick 6 of 10"**.
>
> **Correction affordances:** an "Edit" link on the just-banked pick, available until the next flip begins. After that, "Revert pick" in the session ledger, which requires confirmation and is logged and shown on the overlay as a correction rather than applied silently.
>
> **Both team columns (§15) sit below**, live, ordered by multiplier descending.

**One rule for the entry component that is specific to this game:** the buy cost field must be pre-filled and the payout field must not. The streamer knows the buy before they spin and the payout after, so pre-filling both invites a stale number being banked. Pre-filling one and leaving the other empty makes the incomplete state obvious at a glance.

---

## 5. Live control — complete

> Build the complete phase of the Team Battles live control screen.
>
> **Winner banner** across the top in the winning team's colour: team name, glyph, final average, and the margin. If it went to a tiebreak rung, state which one: "Decided on best single multiplier."
>
> **Three result cards in a row:** Winning team (full roster), MVP (username, slot, multiplier, buy), Anchor (same shape, muted styling, never framed as a penalty).
>
> **Final scoreboard** — both team columns side by side, every pick listed, totals and averages beneath.
>
> **Session stats strip:** total spent, total returned, net, biggest single multiplier, number of picks, crowd split at lock, and how many drawn viewers were sent against their declared side.
>
> **The flip sequence, published.** A mono strip showing the committed sequence — `C F F C F C C F C F` — next to its fingerprint, with a copy button and one line: "Locked before joining opened. Fingerprint posted to chat at session start." This is the payoff of the commitment made on the setup screen and it should look like evidence, not like a footnote.
>
> **Overlay replay controls:** re-trigger the winner takeover, the MVP card, or the Anchor card. Streamers will want to re-show these while they talk.
>
> **Export:** "Copy results for chat" and "Save to history".

---

## 6. Overlay — joining

> Build the joining state of the Team Battles overlay. Transparent background, 1920×1080 safe area.
>
> **Hero:** the pool count at 140px, mono, counting up with a soft flash per join. Label beneath: "IN THE POOL".
>
> **The two crests, centre stage, idle.** Chaos left in dimmed violet, Fortune right in dimmed gold, each with its glyph, a placeholder score of `—`, and "0 picks". They occupy the same position and size they will hold all session. **Do not animate them in when the game starts — they are already there**, which makes the first flip feel like something arriving at a place rather than a screen being built.
>
> **Join feed**, six rows, newest sliding in at top: username, arrow, slot thumbnail and name. Rows fade toward the bottom of the stack.
>
> **Crowd meter** (§17) directly under the crests, live from the first `!side`, already showing the split before a single pick exists.
>
> **Footer, persistent, two lines:**
> `!join <slot>` — to play
> `!side chaos` or `!side fortune` — to pick who you're with

Both commands, always. A viewer who has missed the pool still has something to type, and that is the cheapest engagement in the catalog.

---

## 7. Overlay — standing scoreboard *(persistent)*

The state the overlay sits in for most of the session, and the thing the stream will rest on while the streamer talks. It has to survive being looked at for two hours.

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

> Build the persistent standing scoreboard. Two hard-split columns, no shared elements between them, mirrored so each team's identity reads outward from the centre.
>
> **Per column, top to bottom:**
> - Team glyph and name, 32px, team colour
> - **Average per pick — the largest figure on screen, 96px mono**, team colour, with the "avg per pick" label small beneath it
> - Pick count and total multiplier on one line, 18px, muted
> - Crowd bar (§17) — a thin filled bar with percentage
> - Member rows, ordered by multiplier descending, capped at six visible with a "+4 more" chip: username 16px, multiplier 20px mono right-aligned. Rows carry a faint team-coloured left border; a `0.00×` row is dimmed to 55% rather than coloured red
>
> **Leading team treatment:** a subtle outer glow in its colour and a slightly heavier score weight. Nothing more — a big trophy or crown on the leader makes every lead change a heavy re-render and cheapens the actual ending.
>
> **Footer bar, full width:** pick counter left, **swing number right at 40px** in the trailing team's colour, pulsing gently when the required figure is under 20×.
>
> **Rest state:** after 20 seconds with no event, member rows fade to 80% and the two averages gain a slow breathing pulse. Motion that never fully stops keeps a resting overlay from looking frozen or disconnected.

**Sizing rule:** the whole scoreboard occupies a 1000×420 region, edge-anchored, and never overlaps the centre third of the frame where the streamer's slot is playing.

---

## 8. Overlay — pick card

> Build the pick card takeover — the moment a viewer is drawn, before the flip.
>
> Scoreboard slides to 30% opacity and blurs slightly. The card lands centre frame, scaling from 0.9 with a fast ease-out.
>
> **Card contents:** avatar at 96px, username at 56px display weight, slot thumbnail at 200×200, slot name at 32px, provider and buy cost at 20px muted. A "Streamer's pick" badge in violet-neutral if reserved.
>
> **The two crests flank the card, both fully neutral grey.** No colour on screen except the slot art. This is the only moment in the session where the frame is deliberately colourless, and it exists to make the next five seconds land harder.
>
> Hold for 2 seconds minimum before the flip can begin, so chat sees who it is before the coin starts.

---

## 9. Overlay — the flip takeover

**Build this first, standalone, before any game state exists.** It runs 10–15 times a session. If it doesn't survive the eleventh viewing, the game doesn't work — and that is much cheaper to discover with a static page and two colours than after the backend is done.

> Build the flip takeover. Full frame, 5.5 seconds, transparent background. **This animation is playback, not decision — the result is passed in as a prop.**
>
> ```
> 0.0s   pick card centred, both crests neutral, scoreboard hidden
> 0.5s   "3 · 2 · 1" counts over the card, each digit landing with a
>        rising pitch. Chat's window to shout.
> 2.0s   the coin starts — a wide disc edge-on, spinning fast,
>        faces alternating violet ⚡ and gold 🪙, motion-blurred.
>        Frame edges pull in the two colours as alternating rim light.
> 3.4s   deceleration begins; alternation becomes readable, the pitch
>        of the spin audio drops with it
> 4.2s   FAKE-OUT (scheduled, ~1 flip in 3) — settles almost onto the
>        LOSING colour and holds 0.4s. Rim light commits to that side.
> 4.8s   SNAP to the true result. Colour floods the frame from the
>        winning side. Team one-shot fires. Screen shake, 6px, 200ms.
> 5.0s   the pick card recolours to the team, rotates upright, and
>        flies into that team's column
> 5.5s   scoreboard returns, new member row highlighted for 2s
> ```
>
> **Chaos and Fortune resolve differently.** A Chaos result snaps hard, overshoots by 8%, and settles late with a jagged violet burst. A Fortune result eases in, lands square, and blooms outward with a gold coin-scatter. Two easing curves and two particle behaviours — viewers should be able to call the result from motion alone, with the sound off.
>
> **Prop contract:** `{ result: 'A' | 'B', fakeOut: boolean, entrant, teams }`. Nothing is computed inside the component. `fakeOut` arrives seeded from the session (spec §6.3), so the same session replays identically.
>
> **`skip` prop** jumps straight to the 4.8s snap frame with no fake-out and no countdown, total duration 700ms.

**Three rules the animation must not break:**

**The fake-out always settles onto the losing colour.** A near-miss that resolves where it was already pointing is an anticlimax with extra steps. The snap must always be a reversal, because chat is mid-celebration when it fires and that half-second is the entire emotional payload of the mechanic.

**The fake-out is scheduled, not universal.** Roughly one flip in three, seeded. Every flip faking out becomes a rhythm chat learns by pick five, and a tell chat can read is worse than no tell at all.

**An interrupted flip is never replayed.** If the overlay reconnects mid-animation it jumps to the settled state. A flip that replays after an OBS hiccup, showing chat a result they already saw, looks exactly like a re-roll — which is the one thing this entire design is built to be immune to.

### 9.1 The allegiance override

> When the drawn viewer had declared the opposite side, insert a beat between 5.0s and 5.5s:
>
> The card carries their declared badge — "FORTUNE" in gold — which **strikes through and desaturates** as the card flies into the Chaos column, with the line **"THE COIN SAYS CHAOS"** in violet. Total added duration 800ms.
>
> The struck badge persists on their member row for the rest of the session, small, and is called out again in the final result if their pick decided the session against the side they picked.

This is one of the best recurring beats the game produces and it costs one badge state. Build it.

---

## 10. Overlay — buying state

The dead air problem. The streamer is loading a bonus and the overlay has nothing new to say for anywhere from thirty seconds to three minutes. This state exists to make that stretch worth watching.

> Build the buying state of the overlay.
>
> **The active pick sits in a slim banner at the top**, in the team's colour: username, slot name, buy cost, team glyph.
>
> **The swing number is promoted to hero size — 88px**, centred beneath the scoreboard, in the trailing team's colour:
>
> **FORTUNE NEED 41.8× ON THIS PICK**
>
> Three visual states, all useful and all honest:
>
> | Required | Treatment | Label |
> |---|---|---|
> | Under 20× | Trailing team's colour, pulsing 1.2s | "THIS PICK IS LIVE" |
> | 20×–100× | Team colour, static, full weight | "IT'S THERE — IT'S JUST BIG" |
> | Over 100×, or trailer has no picks left | Muted grey, no pulse | "FORTUNE NEED 340× — THIS IS CHAOS'S UNLESS THE LAST TWO BOTH LAND FORTUNE" |
>
> **When the leading team is on the pick**, the number inverts: "CHAOS CAN PUT THIS OUT OF REACH — 62.0×". Weaker beat, but it keeps the region occupied and gives the streamer a line to react to.
>
> **A live "if this pays X" ladder** sits small beneath the hero number — three rows showing what a 2×, 10×, and 50× result would do to the team's average. It recomputes on the flip and it is the single cheapest way to make the audience numerate about a metric they've only just met.

**The muted third state is deliberate.** Faking tension when there isn't any is worse than admitting there isn't — and in this game the tension comes back the moment the coin gives the trailing team two picks in a row, so nothing is lost by being honest for ninety seconds.

---

## 11. Overlay — result bank & recount

The payoff of the pick, and the place where the count-up rule earns its keep.

> Build the result banking sequence, 1800ms total.
>
> ```
> 0ms     multiplier lands on the pick card at 120px mono, in the team's
>         colour, scaling from 1.3 with a hard ease-out
> 400ms   cost and payout fade in small beneath it
> 700ms   card shrinks and flies into the team column, slotting into
>         its sorted position; other member rows shift to make room
> 900ms   TEAM AVERAGE COUNTS UP — 11.4x → 14.2x over 900ms, eased,
>         digits rolling, the whole figure glowing in team colour
> 1500ms  total and pick count update; the swing number recomputes
>         and slides to its new value
> 1800ms  rest
> ```
>
> **Result tiers change the treatment, not the timing:**
>
> | Multiplier | Treatment |
> |---|---|
> | 0.00× | Card desaturates to grey, drops rather than flies, dull thud, no glow. The average counts **down** |
> | Under 1× | Muted team colour, no particles |
> | 1×–10× | Full team colour, small particle burst |
> | 10×–50× | Bright, screen-wide colour wash, sustained chime |
> | 50×+ | **Full-frame takeover for 3s** before the banking sequence — the multiplier alone, huge, then the sequence runs |

**The count-up is the rule that must not be optimised away.** Watching `11.4×` climb to `14.2×` is the only moment the audience feels the *size* of a result rather than reading it, and it's the difference between a scoreboard and a leaderboard. Ease it, roll the digits, and never let it snap — including on the 0.00× case, where watching an average sag downward is its own small piece of theatre.

---

## 12. Overlay — lead change sting

> Build the lead change sting — 2 seconds, fires only when the top position actually changes hands.
>
> The two team columns swap emphasis: the new leader's glow ramps up, the old leader's fades, and a single line crosses the centre — **"CHAOS TAKE THE LEAD"** — in the new leader's colour, entering from that team's side.
>
> Fires **after** the banking sequence completes, never during it. Suppressed entirely on the first pick of the session, when there is no lead to take.

Small, and it earns its place because in a two-number game the lead changing hands is the only structural event that exists between the flip and the ending.

---

## 13. Overlay — sudden death transition

> Build the sudden death transition — 3.5 seconds, full frame.
>
> The scoreboard compresses to the top third. **"SUDDEN DEATH"** lands centre in white, with the margin beneath: "0.4× SEPARATES THEM · ONE MORE PICK". Both team colours pulse alternately behind the type, matching the flip's alternation rhythm so the audience reads it as *the coin is coming*.
>
> Then straight into the pick card. No pause, no return to the resting scoreboard.
>
> Extras beyond the first are labelled: "SUDDEN DEATH · PICK 2 OF 3".

**The counter matters.** Sudden death is bounded (spec §9.2) and showing the bound is what stops it reading as the streamer extending the session at will — which is the exact thing the declared pick count exists to prevent.

---

## 14. Overlay — final, three takeovers

> Build the final sequence as three separate full-frame takeovers, played in order with the stream delay respected between the overlay and the chat writes.
>
> **1. Winning team — 8 seconds.** The team's colour floods the frame. Glyph and name at 120px. Final average enormous beneath, with the loser's beneath it small for contrast. Then the full roster fades in, username and multiplier, ordered by multiplier descending — everyone who played for that team, on screen at once. Footer: "and everyone who called CHAOS."
>
> If it went to a tiebreak rung, a line states which: "Decided on best single multiplier — 34.0× to 31.2×."
>
> **2. MVP — 6 seconds.** Neutral background, deliberately not either team's colour, because this award is cross-team. Username at 72px, slot art large, the multiplier at 160px, and the buy cost small beneath it. Label: "BIGGEST PULL OF THE SESSION".
>
> **3. The Anchor — 5 seconds, if enabled.** Same layout as MVP, muted palette, warm rather than mocking. Label: "THE ANCHOR". A closing line: "It happens."
>
> **Then the resting final scoreboard**, which the stream will sit on while the streamer talks — both columns complete, every pick visible, session totals beneath.

**Three takeovers rather than one combined card.** The team winner, the best individual pull, and the worst are three different achievements belonging to three different people, and merging them buries all three. Same doctrine as the tournament's champion and top predictor.

---

## 15. Component — team column

Used at three fidelities. Build one component with a `density` prop rather than three components.

| Where | Density | Shows |
|---|---|---|
| **Overlay scoreboard** | Compact | Score, picks, total, crowd bar, top 6 members + overflow chip |
| **Dashboard live** | Full | Every member, with cost, payout, multiplier, and per-row edit affordance |
| **Final takeover** | Roster | Every member, username and multiplier only, large |

> Build the team column component.
>
> Props: `team`, `picks[]`, `score`, `total`, `crowdPct`, `density`, `isLeading`, `side` ('left' | 'right').
>
> **Mirroring is real, not cosmetic.** On the left column, the glyph sits left and multipliers align right, reading inward toward the centre. On the right column, everything mirrors. The centre line between them is the axis of the whole layout and both columns should read *outward* from it.
>
> **Member row states:** normal · just-banked (2s highlight in team colour) · MVP-so-far (small crown glyph) · overridden allegiance (struck badge) · reserved pick (violet dot) · `0.00×` (dimmed to 55%, never red).
>
> **Empty state:** "No picks yet" with the team's glyph at 20% opacity. Must look intentional — a team can genuinely sit empty for the first four picks and that is a story, not a bug.

---

## 16. Component — pick result entry

> Build the pick result entry component. Reuses the Tournament match-entry component (§15 of that spec) at half width — one side instead of two.
>
> Two currency inputs side by side, buy cost pre-filled from the catalog and payout empty, with a live multiplier readout between them at 48px. `Tab` to move, `Enter` to bank.
>
> **Validation:** buy cost > 0, rejected inline with "Buy cost must be more than zero". Payout accepts 0 and, when banked as 0, the confirm button reads "Bank 0.00× to Chaos" in muted styling rather than the team's colour — the streamer should feel the weight of what they're about to enter.
>
> **Edit state:** available on the just-banked pick until the next flip begins. After that, the ledger's "Revert pick" flow takes over, which is confirmed, logged, and shown on the overlay as a correction.

---

## 17. Component — crowd meter

> Build the crowd meter. A single horizontal bar, violet fill from the left, gold fill from the right, meeting at the split point, with percentages and raw counts at each end.
>
> **A "SIDES LOCKED" chip** appears at the lock pick and the bar freezes from that point.
>
> Animates smoothly as declarations arrive. Never at any point implies an effect on scoring — no trophy, no multiplier, no "crowd bonus". Label it plainly: "WHO CHAT IS WITH".

**Expect this bar to skew toward Fortune** and don't correct for it. "Fortune" means good luck and "Chaos" means things going wrong, so the naming carries a bias that the flip does not (spec §3). A permanently lopsided crowd bar with Chaos winning on the scoreboard is a good picture — the underdog framing writes itself. What the UI should do is **alternate which team sits on the left between sessions, seeded**, so a naming bias isn't compounded by a reading-order bias.

---

## 18. Component — pool browser and reserve picker

Reused from Tournament §13, unchanged, with one addition: each pool row shows the entrant's slot buy cost as a mono chip, since buy bounds are a live concern in this game and a reserved pick with a €500 buy is a decision rather than a detail.

---

## 19. Component — session ledger

New to this game and worth building properly, because Team Battles produces a long linear history that the streamer needs to scan quickly.

> Build the session ledger — a compact scrollable list, one row per pick, newest at top, sitting in the dashboard right rail.
>
> **Each row:** pick number · team glyph in team colour · username · slot name truncated · multiplier mono, right-aligned. Vetoed picks show struck through with their reason. Reverted picks show an amber correction marker.
>
> **Row actions on hover:** "Revert pick" (confirmed, logged) and "Copy result".
>
> **Header strip:** picks banked / total, running spend, and the flip sequence fingerprint with a copy button.

---

## States to build

| State | Where | Behaviour |
|---|---|---|
| Zero joins yet | Joining, dashboard + overlay | "Waiting for the first !join", command shown large, both crests already visible |
| Pool empties mid-session | Pick, dashboard + overlay | Draw button disabled, overlay switches to "waiting for entries" with `!join` large. **Session does not end** |
| Fewer in pool than picks remaining | Joining, bottom bar | Warning, not a block — joining never closes, so it usually resolves itself |
| Pool cap reached | Joining, feed header | "Pool full — 30 claimed. Spots reopen as entrants are drawn" |
| Entry rejected on buy bounds | Chat + rejected strip | Ack in chat, aggregated count on dashboard |
| Slot unresolvable at draw | Pick | Amber card with "Redraw" — the flip has not run, so the pick index is untouched |
| Veto attempted after flip | Pick → Flip | Control absent, not disabled. State machine rejects the action |
| Buy cost entered as zero | Buying | Inline rejection, bank button stays disabled |
| Payout entered as zero | Result | Valid. Grey card, dull thud, average counts **down** |
| One team has no picks | Scoreboard | Score shows `0.00×`, "No picks yet" roster. Never a draw, never hidden |
| Both teams on 0.00× | Final | Tiebreak ladder runs; the takeover states which rung decided it |
| Lead change | Overlay | 2s sting, suppressed on pick 1 |
| Sudden death fires | Overlay + dashboard | 3.5s transition, counter shows the bound |
| Sudden death exhausted, still tied | Final | Tiebreak ladder, stated on the takeover |
| Viewer declares side after lock | Chat only | Ack: "Sides are locked — but you can still !join" |
| Drawn viewer had declared the other side | Flip + roster | Struck badge, "THE COIN SAYS CHAOS", persists all session |
| Pick reverted | Ledger + scoreboard | Averages recalculate with a count-**down**; overlay shows a correction marker, never a silent change |
| Overlay disconnected | Right rail | Red card with copy-URL and troubleshooting |
| Overlay reconnects mid-flip | Overlay | Jumps to settled state. **Never replays the animation** |
| Session recovered after refresh | Dashboard | "Session restored" toast, ledger and scores intact |
| Session abandoned | Complete | No winner takeover, no MVP, no Anchor, no chat announcement. Ledger saved |

---

## Build order

**§9 flip takeover (standalone) → §7 standing scoreboard → §15 team column → §2 joining → §6 joining overlay → §4 buying & result → §16 result entry → §11 result bank → §3 pick & flip control → §10 swing number → §19 ledger → §17 crowd meter → §12 lead change → §14 final takeovers → §13 sudden death → §5 complete → §1 setup.**

**The flip comes first and it comes before any state exists.** Everything in this design assumes five seconds can carry a session fifteen times over. That assumption is cheap to test with a static page, two colours, and a hardcoded result — and ruinously expensive to discover was wrong once the backend is built around it. Two days on a throwaway prototype here is the highest-leverage decision in the whole build.

Then the scoreboard and the team column, because they're on screen for 95% of the session and every other overlay state either decorates them or takes them away temporarily. Joining next, so there's a real pool to draw from. Then the play loop — result entry, banking, the pick control — which is where the streamer spends their hands and where polish repays itself ten to fifteen times a session.

The swing number sits mid-order deliberately: it is high-value but it depends on both teams having real scores, so it's hard to build honestly before the loop works. The final takeovers, sudden death, and setup come last — they run once per session, and none of them blocks a playable game.
