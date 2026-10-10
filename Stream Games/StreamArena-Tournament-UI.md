# Slot Tournament — Complete UI Specification

Companion to `StreamArena-UI-Brief.md` — paste that document's §1 (app context) and §2 (design tokens) first, then build from here. Game rules live in `StreamArena-Game-Specs.md` §Game 2.

**The organising principle:** the tournament has six phases and the middle three loop once per match. Build it as phase-states of two screens, and build the match loop once — it runs eleven to fifteen times per session.

```
        JOINING  →  DRAW  →  [ VOTING  →  PLAYING  →  ADVANCE ] × n  →  COMPLETE
Dash    pool       seats      countdown   enter 4      confirm         champion
        grows      fill       + split     numbers                      + predictor
Overlay counter    reveal     match card  live totals  result flash    two winners
```

**What makes this UI different from Bonus Hunt:** every slot belongs to a person. Usernames are the headline everywhere — on the bracket, on the match card, in the result. A bracket showing only slot names loses the entire point of the game.

---

## Screen inventory

**Dashboard**
1. Setup
2. Live control — joining
3. Live control — draw
4. Live control — voting
5. Live control — playing
6. Live control — complete

**Overlay**
7. Joining
8. Draw reveal
9. Match card (voting + playing)
10. Match result flash
11. Between-rounds bracket takeover
12. Final result

**Components**
13. Pool browser and reserve picker
14. Dashboard bracket
15. Match result entry
16. Overlay bracket minimap

---

## 1. Setup

> Build the Slot Tournament setup screen. Two columns — form left (60%), sticky summary right (40%).
>
> **Tournament format**
> - Seats — segmented control: 8 / 12 / 16, default 16. Beneath it a live explainer line that updates with the choice: "16 entrants · 4 rounds · 15 matches" or for 12, "12 entrants · 4 rounds · 11 matches · 4 byes in the play-in round"
> - Match metric — read-only info card, not an input: "Winner is the higher multiplier (payout ÷ buy cost)". Include a worked example beneath in muted text: "€100 buy paying €425 = 4.25x beats €200 buy paying €610 = 3.05x"
>
> **Joining**
> - Join command — text input, prefilled `!join`, with a live preview: "Viewers type: !join gates of olympus"
> - Who can join — radio: Anyone / Followers only / Subscribers only
> - Join window — slider 1–15 minutes, default 5, with a "no limit, I'll close it manually" checkbox
> - Info card, not a setting: "Each slot can only be claimed once — first come, first served."
>
> **Predictions**
> - Voting window per match — slider 15–180 seconds, default 60
> - Vote command — text input, prefilled `!vote`
>
> **Bot messages** — same block as Bonus Hunt: ack frequency segmented control, announce-winners toggle, stream delay input.
>
> **Right column, sticky:** settings recap, overlay URL with copy button, and a large primary "Open joining" button.

---

## 2. Live control — joining

> Build the joining phase of the Slot Tournament live control screen.
>
> **Top bar:** LIVE dot · "Slot Tournament" · elapsed timer · six-step phase indicator (Joining → Draw → Voting → Playing → … → Complete) · "End tournament" in red outline.
>
> **Hero row** — three cards, the first dominant:
> - Entrants joined — 184, very large, counting up with a flash on each increment
> - Seats — 16
> - Time left — countdown, or "Manual close" if no window was set
>
> **Reserved seats panel** — full width, purple border. Header "Reserved seats — 2 of 16" with helper text "Hand-pick entrants to guarantee them a spot. The rest are drawn at random."
> - A username search field that filters the joined pool as you type
> - Selected picks shown as removable cards: avatar, username, their claimed slot with thumbnail
> - A warning line if reserved count equals seat count: "All seats reserved — no random draw will run."
>
> **Join feed** — two columns:
>
> *Left, the live feed.* Newest joins at top. Each row: Kick avatar, username with role badge, an arrow, slot thumbnail and name. New rows slide in with a purple flash. A "Reserve" button appears on row hover, so the streamer can grab someone straight from the feed.
>
> *Right, claimed slots.* A compact scrollable list of every slot taken so far, alphabetical, each with its owner's username beneath. This is what the streamer glances at when chat asks "is X still free?".
>
> **Unresolved queue** — same component as Bonus Hunt (§10 of the Bonus Hunt spec), sitting above the feed when non-empty. Here a resolution assigns the slot to the viewer who typed it.
>
> **Bottom action bar, sticky:** primary "Close joining & run draw", with a subtle warning beneath if the pool is smaller than the seat count: "Only 11 joined for 16 seats — reduce to 8 seats, or fill the rest manually."

---

## 3. Live control — draw

> Build the draw phase of the Slot Tournament live control screen.
>
> **Before the draw runs:** a centred confirmation panel. "Ready to draw 14 of 16 seats from 184 entrants. 2 seats are reserved." A large primary button, "Run the draw". Beneath it, in muted text: **"The draw runs once and can't be re-rolled."**
>
> That warning matters. A visible re-roll button on stream would undermine the whole thing — the fairness of this game is the product.
>
> **While drawing:** seats fill one at a time, roughly 800ms apart, mirroring the overlay animation. Each filled seat card shows seed number, avatar, username, slot thumbnail and name, plus a "Streamer's pick" badge in purple on reserved seats.
>
> **After the draw:** the full entrant list as a grid of 8/12/16 seat cards, followed by the bracket preview (§14). For 12 seats, the four byes are clearly labelled "BYE — advances to round 2".
>
> **Per-seat actions**, available only before the bracket locks: a "Replace" button that opens the pool browser, for when a selected viewer's slot turns out to be unresolvable or they've been banned. Replacing draws a fresh random entrant, or lets the streamer pick.
>
> **Bottom bar:** primary "Lock bracket & start round 1". Confirm dialog notes this is final.

---

## 4. Live control — voting

> Build the voting phase — shown while a match's prediction window is open.
>
> **Top bar** unchanged, plus a round label: "Quarter-final · Match 3 of 4".
>
> **Countdown hero:** timer at 72px, purple, turning red and pulsing under 15 seconds. Label "VOTING CLOSES IN". Two buttons beside it: "Extend 30s" and primary "Start match now".
>
> **Match card** — the dominant element, two sides split by a central VS badge. Each side shows, top to bottom: the viewer's avatar and username at 24px (this is the headline, larger than the slot name), the slot thumbnail at 80×80, the slot name and provider, and the seed number. The reserved-pick badge carries through if applicable.
>
> **Live vote split** — a single horizontal bar directly beneath the match card, purple on the left for A and a contrasting blue on the right for B, with percentages and raw counts on each end. It animates smoothly as votes arrive. Add a small "247 votes" label centred beneath.
>
> **Bracket panel** below, collapsed by default with an expand toggle — the streamer doesn't need it every match, but wants it on demand.
>
> **Right rail:** overlay connection status, chat status, recent bot messages, and a compact prediction leaderboard showing the current top five predictors.

---

## 5. Live control — playing

The screen the streamer uses while actually buying the bonuses. Four numbers decide the match, and they should be enterable without looking away from the game for long.

> Build the playing phase — the streamer enters bonus buy results for both slots.
>
> **Match card stays at the top**, now with an entry block under each side:
> - Buy cost — currency input
> - Payout — currency input
> - **Multiplier** — computed live and displayed large in Space Grotesk as soon as both fields have values. Gold above 10×
>
> As soon as both sides have a multiplier, the winning side gains a green border and a "LEADING" pill, and the losing side dims to 60%. Nothing is committed yet — this is a preview so the streamer can catch a typo before it becomes a result.
>
> **Keyboard flow:** Tab moves through the four fields in order (A cost, A payout, B cost, B payout). Enter in the final field confirms. Accept messy input — strip currency symbols and commas, expand a `k` suffix.
>
> **Validation:** buy cost must be greater than zero, shown as an inline red error, and confirm stays disabled. Payout of zero is valid and common.
>
> **Tie handling:** if both multipliers are equal, show an amber panel explaining how it resolved — "Tied at 0.00x. Resolved on lower buy cost: @slotgoblin advances." Never resolve a tie silently; the streamer needs to be able to explain it out loud.
>
> **Bottom bar:** primary "Confirm result & advance", plus a secondary "Revert last match" that opens a warning dialog explaining that votes and scores will be recalculated.
>
> **Right rail:** a live "prediction accuracy" readout — how many of the viewers who voted got this match right — appearing the moment the result is confirmed. Good narration material.

---

## 6. Live control — complete

> Build the completed state of the Slot Tournament live control screen.
>
> **Two winner cards side by side**, both full-height and visually equal — these are different achievements for different people and neither should dominate:
>
> *Champion.* Purple border with glow. The winner's avatar and username at 48px, their slot thumbnail and name, and the final match line: "beat @kickfan92's Le Bandit, 4.25x to 3.05x".
>
> *Top predictor.* Gold border. Username at 48px, "9 / 11 matches called correctly", and an accuracy percentage.
>
> Each card has its own "Announce again in chat" button.
>
> **Full bracket** below, in its final state with every result filled in and the champion's path highlighted in purple.
>
> **Prediction leaderboard:** top 20 — rank, username, correct/total, accuracy percentage. The streamer's own row highlighted if they voted.
>
> **Tournament stats row:** total entrants joined · seats · matches played · total votes cast · biggest multiplier of the tournament with slot and owner.
>
> **Action bar:** "Export CSV" · "Copy shareable link" · "Run again with same settings" · "Back to games".

---

## 7. Overlay — joining

> *(Prefix with the overlay constraints block from `StreamArena-UI-Brief.md` §5.)*
>
> Build the tournament joining overlay. Anchored left edge, vertically centred, roughly 440px wide.
>
> **Header:** "SLOT TOURNAMENT" uppercase with purple underline glow, and beneath it "16 SEATS" as a subtitle.
>
> **Hero number:** the entrant count at 88px, Space Grotesk 700, white, counting up with a purple flash on each new join. Label beneath: "ENTRANTS".
>
> **Countdown** if a join window is set — 32px, muted, turning red under 60 seconds. Label "JOINING CLOSES IN".
>
> **Recent joins feed:** last five, newest at top. Username in purple at 18px, slot thumbnail at 36×36, slot name in white at 16px. Rows slide in from the top.
>
> **Footer, large and unmissable:** "Type !join <slot> to enter" at 24px with `!join` highlighted purple. Second line, smaller and muted: "Each slot can only be claimed once".
>
> That second line prevents a large share of the duplicate rejections — most people don't know the rule until they hit it.

---

## 8. Overlay — draw reveal

> Build the tournament draw reveal as a full-frame overlay takeover. This is the most anticipated moment of the session and deserves the whole screen.
>
> **Layout:** a grid of empty seat slots — 4×2 for 8 seats, 4×3 for 12, 4×4 for 16. Each empty slot shows only its seed number on a dark card with a dashed border.
>
> **Fill animation, one seat at a time, ~800ms apart:** the target card lights up with a purple border, usernames cycle rapidly inside it for ~500ms, then land on the drawn entrant — avatar, username at 22px, slot thumbnail, slot name. A brief flash and a settle.
>
> **Reserved seats** fill first, before the random draw begins, and carry a purple "STREAMER'S PICK" badge. Showing them first and labelling them plainly is the honest ordering — it reads as the streamer giving someone a shot, rather than as an anomaly discovered mid-draw.
>
> **Header throughout:** "THE DRAW" with a live counter, "Seat 7 of 16".
>
> **On completion:** a two-second hold on the full grid, then the header changes to "BRACKET LOCKED" and the panel transitions out.
>
> Keep the total runtime under about 20 seconds. Longer and the streamer runs out of things to say.

---

## 9. Overlay — match card

The screen that's live for most of the session. It carries both the voting and playing phases — same layout, different content in the lower half.

> Build the tournament match card overlay. Anchored bottom-centre, roughly 1100×340, leaving the upper frame clear for the slot game.
>
> **Round label, top centre:** "QUARTER-FINAL · MATCH 3 OF 4" at 20px, uppercase, muted.
>
> **Two contenders, split by a central VS badge.** Each side, arranged horizontally: slot thumbnail at 88×88, then a text block with the **viewer's username at 28px in purple** as the top line and the slot name at 22px in white beneath it, provider at 16px muted below that.
>
> Username above slot name is deliberate. The viewer is the contender; the slot is what they brought.
>
> **During voting:** a horizontal vote-split bar spans the full card width beneath the contenders — purple left, blue right, percentages at each end, animating as votes land. A countdown timer sits centred on the bar. Beneath, the call to action: "!vote a or !vote b" at 20px.
>
> **During playing:** the vote bar is replaced by two result blocks, one under each contender — buy cost and payout at 18px muted, then the **multiplier at 44px** in Space Grotesk as the dominant figure. Values appear as the streamer enters them, so viewers watch the numbers land in real time. The leading side gains a green border.
>
> **Bracket minimap** in the corner, per §16.

---

## 10. Overlay — match result flash

> Build the match result reveal — a short animation between confirming a result and moving to the next match.
>
> The losing side desaturates and slides down and out over 400ms. The winning side expands to fill the card, centring the username at 44px with "ADVANCES" beneath in green, and the winning multiplier large in gold.
>
> If the match was decided by a tiebreak, a single line appears beneath: "Won on lower buy cost" or "Decided by coin flip". Never let a tiebreak pass unexplained on stream — unexplained results read as broken software.
>
> Hold for 4 seconds, then transition to the next match card.

---

## 11. Overlay — between-rounds bracket takeover

> Build a full-frame bracket display shown for about 6 seconds between rounds.
>
> The whole bracket rendered large enough to be legible — this is the only moment it gets the full frame, which is exactly why it works here and nowhere else.
>
> Each node: username at 20px (the primary label), slot name at 16px muted beneath, and the winning multiplier on completed matches. Completed matches show the winner in white and the loser dimmed to 40% with a strikethrough. The upcoming round's nodes pulse gently in purple.
>
> **Header:** "SEMI-FINALS" with a subtitle, "4 players remaining".
>
> Entrance: fade and scale from 0.95 over 400ms. Exit: fade out.

---

## 12. Overlay — final result

Two stages, sequenced, matching the two chat announcements.

> Build the tournament final result overlay as a two-stage reveal, centred at roughly 900×560.
>
> **Stage one — champion.** Header "TOURNAMENT CHAMPION". The winner's Kick avatar at 120×120 with a gold ring, username at 72px in gold, and their slot thumbnail and name beneath at 28px. Then the final-match line: "beat @kickfan92's Le Bandit — 4.25x to 3.05x". A four-stat row underneath: matches won · best multiplier · entrants beaten · total joined.
>
> Entrance: scale from 0.9 with a fade, gold particles or a shimmer sweep, and the multiplier counting up. Hold 8 seconds.
>
> **Stage two — top predictor.** Crossfade to a purple-themed card: header "BEST PREDICTOR", username at 64px in purple, "9 / 11 CORRECT" at 44px, and accuracy as a percentage. Below, second and third place as two compact muted rows.
>
> Hold 8 seconds, then fade out.
>
> Two stages rather than one card with both winners: they're separate achievements for separate people, and a shared card makes each look like a runner-up to the other.

---

## 13. Component — pool browser and reserve picker

> Build a searchable browser for the joined entrant pool.
>
> Opens as a modal at 720px or renders inline in the joining screen. A search field filters by username or slot name as you type.
>
> Each row: avatar, username with role badge, claimed slot (thumbnail plus name), join time, and a "Reserve" button that toggles to a filled "Reserved" state.
>
> Filter chips across the top: All · Subscribers · Followers · Reserved. A count line reads "184 entrants · 2 reserved".
>
> Rows are virtualised — the pool can run to several hundred entries and must stay smooth while new joins arrive.

---

## 14. Component — dashboard bracket

Distinct from the overlay bracket. This one lives on a monitor, so it can be dense and interactive.

> Build an interactive tournament bracket for the dashboard.
>
> Horizontal tree, left to right, one column per round, connector lines between nodes. Horizontally scrollable with a zoom control for 16-entry brackets.
>
> **Each node** (roughly 200×64): seed number, avatar, username at 15px semibold, slot name at 13px muted, and on completed matches the multiplier right-aligned. Winners keep a green left border; losers dim to 50%. The live match has a pulsing purple border. Bye nodes are labelled "BYE" on a dashed border.
>
> **Interactions:** hovering a node shows a tooltip with full entrant detail and the match's vote split. Clicking a completed match opens a detail popover with both results and a "Revert this match" action. The current match auto-scrolls into view when the round advances.
>
> For a 12-seat bracket, label the first column "Play-in round" rather than "Round 1", and render the four bye entrants in a visually distinct column that connects straight into round 2.

---

## 15. Component — match result entry

> Build the four-field result entry block for a tournament match.
>
> Two groups side by side, one per contender, each containing a buy cost field and a payout field, both currency inputs with the symbol as a permanent prefix.
>
> Beneath each group, the computed multiplier appears live in Space Grotesk at 36px the moment both of that side's fields hold values — gold above 10×, white otherwise. Show the formula in small muted text under it: "€425 ÷ €100".
>
> Once both sides compute, the higher side gains a green border and a "LEADING" pill; the other dims. This is a preview only — nothing commits until confirm.
>
> Tab cycles the four fields in order. Enter on the last field confirms. Buy cost of zero blocks confirm with an inline error, "Buy cost must be more than €0".
>
> Confirmed matches collapse to a compact summary row with an edit pencil that reopens the fields.

---

## 16. Component — overlay bracket minimap

> Build a compact structural bracket for the stream overlay. Corner-anchored, roughly 280×180.
>
> **No readable text at all.** Each match is a small rounded node — filled purple for completed, outlined for upcoming, pulsing green for the live match. Connector lines show the tree. The champion slot at the right is a slightly larger node, gold once filled.
>
> A single label beneath: "QUARTER-FINALS · 8 LEFT" at 18px.
>
> The purpose is orientation, not information. Any attempt to fit 16 usernames into this space at a legible size will fail — that job belongs to the between-rounds takeover.

---

## 17. States to build

| State | Where | Behaviour |
|---|---|---|
| Fewer joiners than seats | Joining, bottom bar | Warning with two actions: reduce seat count, or fill manually |
| All seats reserved | Joining | Note that no random draw will run; draw button reads "Lock bracket" |
| Zero joins yet | Joining + overlay | "Waiting for the first !join" with the command shown large |
| Entrant's slot unresolvable at draw | Draw | Seat flagged amber with a "Replace" action |
| Duplicate slot attempted | Chat only | Error ack: "Gates of Olympus is already claimed by @x — pick another" |
| Both bonuses pay zero | Playing | Amber tie panel stating which tiebreak decided it |
| Match reverted | Bracket + leaderboard | Downstream matches clear, scores recalculate, toast confirms |
| Nobody voted on a match | Voting | Vote bar shows "No votes yet"; match proceeds normally |
| Overlay disconnected | Right rail | Red card with copy-URL and troubleshooting link |
| Session recovered after refresh | Dashboard | "Session restored" toast, bracket and scores intact |
| Tournament abandoned mid-bracket | Complete | Skip champion card; still show the prediction leaderboard and announce the top predictor |

---

## Build order

**§2 joining → §7 joining overlay → §13 pool browser → §3 draw → §14 dashboard bracket → §5 playing → §15 result entry → §9 match card → §4 voting → §10 result flash → §6 and §12 results → §8 draw reveal → §11 and §16 bracket overlays → §1 setup.**

Joining and the pool browser first, because nothing else can be tested without a populated pool. Then the draw and the dashboard bracket, which together let you step a full tournament through end to end. The match loop next, since it runs fifteen times a session and is where all the polish pays back. The draw reveal and bracket overlays come late — they're the highest-effort animations and they're pure presentation, so they shouldn't block a playable tournament.
