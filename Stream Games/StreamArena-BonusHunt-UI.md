# Bonus Hunt — Complete UI Specification

Everything the Bonus Hunt needs, across both surfaces. Companion to `StreamArena-UI-Brief.md` — paste that document's §1 (app context) and §2 (design tokens) first, then build from here.

**The organising principle:** Bonus Hunt has four phases, and each phase changes *both* the dashboard and the overlay. Build it as four states of two screens, not as eight separate screens.

```
                COLLECTING  →  GUESSING  →  OPENING  →  COMPLETE
Dashboard       build list     watch          enter        results
                               guesses        wins
Overlay         hunt list      countdown      running      reveal
                               + break-even   profit
```

---

## Screen inventory

**Dashboard**
1. Setup (pre-session)
2. Live control — collecting
3. Live control — guessing
4. Live control — opening
5. Live control — complete

**Overlay**
6. Collecting
7. Guessing
8. Opening
9. Result reveal

**Shared components**
10. Unresolved queue
11. Result entry
12. Slot picker modal
13. Guess distribution

---

## 1. Setup

> Build the Bonus Hunt setup screen. Two columns — configuration form on the left (60%), sticky summary panel on the right (40%).
>
> **Hunt settings**
> - Starting balance — currency input with a € / $ / £ selector
> - Target bonuses — number input, default 30
> - Default bet size — currency input, used to prefill each entry
>
> **Who can add slots**
> - Radio group: Anyone in chat / Followers only / Subscribers only / Only me
> - Max slots per viewer — stepper, default 1
> - Cooldown between requests — slider 0–120s, default 30
>
> **Guess the Balance**
> - Master toggle, on by default. When off, everything below collapses away
> - Guessing window — slider 1–10 minutes, default 3
> - Guess command — text input, prefilled `!guess`
> - Max guess — "reject guesses above ___ × starting balance", default 100
> - Helper text: "Guessing opens after you close entries, so viewers can see the full list before guessing."
>
> **Chat commands**
> - Add slot command — text input, prefilled `!sr`, with a live preview line reading "Viewers type: !sr gates of olympus"
> - Toggle rows for `!hunt` and `!myslot`
>
> **Bot messages**
> - Segmented control: Off / Errors only / Batched / Every request. "Errors only" default, tagged Recommended
> - Announce winners in chat — toggle, on by default
> - Stream delay — number input in seconds, default 12, hint: "How many seconds behind is your stream? We hold chat announcements this long so they don't spoil your overlay reveal."
>
> **Right column, sticky:** live recap of chosen settings; the overlay URL in a read-only field with a copy button and an "Add as Browser Source in OBS" hint; and a large full-width primary button, "Start Hunt".

---

## 2. Live control — collecting

The screen the streamer keeps on a second monitor while playing. Every frequent action must be one click, and it must be readable at a glance from a metre away.

> Build the live control screen for a Bonus Hunt in its collecting phase.
>
> **Top bar:** pulsing green LIVE dot · "Bonus Hunt" · elapsed timer · a four-step phase indicator showing Collecting → Guessing → Opening → Complete with the current step highlighted. Right side: "Pause entries", a settings gear, and a red-outlined "End hunt".
>
> **Stat strip** — five cards, each a small uppercase muted label above a large Space Grotesk number:
> - Starting balance — €5,000
> - Bonuses — 18 / 30, with a thin purple progress bar beneath
> - Spent — €3,240 *(inline editable)*
> - Break-even per bonus — €180, rendered in gold and visually the largest card in the strip
> - Participants — 247
>
> **Unresolved queue** — sits directly under the stat strip, only rendered when non-empty, amber left border, heading "3 requests we couldn't match". See §10.
>
> **Slot list** — a dense table, newest entry at the top, scrollable:
>
> | # | Slot | Requested by | Bet | Status | |
> |---|---|---|---|---|---|
>
> - Slot cell: 40×40 thumbnail, name in white, provider in muted text beneath
> - Requested by: Kick username with a small role badge — sub (gold), follower (purple), mod (green)
> - Bet: inline editable currency input, prefilled from the default
> - Status: pill — Pending (grey) or Collected (green)
> - Row actions: a prominent "Mark collected" button on pending rows, plus an edit-slot pencil and a remove ×
>
> New rows slide in from the top over 300ms with a brief purple flash.
>
> **Right rail (320px, sticky):**
> - Overlay status — green "Overlay connected" or red "Not connected", with a Copy URL button
> - Chat status — "Listening" plus a messages-per-minute counter
> - Recent bot messages — the last five things the bot posted, timestamped
> - Quick actions — Pause entries, Undo last, Clear all
>
> **Bottom action bar, full width, sticky:** primary button "Close entries & open guessing". Clicking it opens a confirm dialog that also asks for the streamer's current balance, so `spent` can be calculated — a single currency input labelled "What's your balance now?" with helper text "We'll use this to work out what the hunt cost."

---

## 3. Live control — guessing

> Build the guessing phase of the Bonus Hunt live control screen.
>
> **Top bar:** unchanged, phase indicator now on "Guessing".
>
> **Countdown hero** — replaces the stat strip as the dominant element. A large centred timer (72px, Space Grotesk, purple, switching to red under 30 seconds) with the label "GUESSING CLOSES IN". Beneath it two buttons: "Extend 1 min" and a primary "Lock guesses & start opening".
>
> **Below that, a compact four-stat row:** Bonuses collected · Total spent · Break-even per bonus (gold) · Guesses received.
>
> **Two-column body:**
>
> *Left — guess feed.* A live scrolling list of incoming guesses, newest at top. Each row: Kick username with role badge, the guessed amount in Space Grotesk, and a relative timestamp. When a viewer edits their guess, the existing row updates in place with a brief flash rather than adding a duplicate. Small header above: "247 guesses from 247 viewers".
>
> *Right — guess distribution.* A horizontal histogram of guesses bucketed by amount, with a vertical gold marker showing the break-even balance. Bars in purple. Below it, four small stats: lowest, median, highest, and "clustered around". This tells the streamer at a glance whether chat thinks the hunt profits — which is exactly the thing worth narrating out loud while the clock runs.
>
> **Slot list** — still present below, but read-only now, collapsed to a compact summary row with an expand toggle.

---

## 4. Live control — opening

The most keyboard-intensive screen in the product. The streamer is opening bonuses and typing numbers while talking to chat, so entry speed matters more than anything else here.

> Build the opening phase of the Bonus Hunt live control screen.
>
> **Stat strip** — five cards, different from the collecting phase:
> - Total won — €4,120, counting up when it changes
> - Best win — €1,840 (gold) with the slot name beneath in small muted text
> - Opened — 11 / 18, with a progress bar
> - Remaining spend to break even — €1,260
> - Profit / loss — large, green above break-even and red below
>
> **Opening list** — the core of the screen. Each row is one bonus:
> - The *current* row is visually elevated: larger, purple border, thumbnail at 56×56
> - Current row contains a large focused number input for the win amount, with the currency prefix baked in, plus a computed multiplier appearing live beside it as the streamer types ("×214")
> - Enter confirms and auto-advances focus to the next row. Tab moves without confirming. Escape clears
> - Completed rows collapse to a compact line: thumbnail, name, win, multiplier. Multipliers over 100× get a gold left border
> - Rows not yet opened are dimmed
>
> A persistent "Undo last" button sits beside the list.
>
> **Right rail** replaces the chat cards with a **guess leaderboard**: the five guesses currently closest to the running total, updating live as wins are entered. The current leader is highlighted in purple. Header: "Closest guesses right now". This is the streamer's narration fuel for the entire opening phase — as the balance climbs, the leader changes, and that's the story.
>
> **Bottom bar:** primary button "Finish hunt", disabled until every bonus has a win entered, with a small counter showing how many remain.

---

## 5. Live control — complete

> Build the completed state of the Bonus Hunt live control screen.
>
> **Result hero:** large centred profit or loss figure at 72px in green or red, with "PROFIT" or "LOSS" as an uppercase label above and "€5,000 → €6,720" beneath.
>
> **Winner card** — full width, purple border with a soft glow: "@slotgoblin won Guess the Balance", their guess, the final balance, and the difference. A small "Announce again in chat" button on the right, in case the first announcement failed or the streamer wants to repeat it.
>
> **Four-stat row:** total spent · total won · return multiple · best slot.
>
> **Results table:** every entry — thumbnail, slot, requested by, bet, win, multiplier. Sortable.
>
> **Guess results:** the top ten guesses ranked by closeness, showing username, guess, and difference.
>
> **Action bar:** "Export CSV" · "Copy shareable link" · "Run again with same settings" · "Back to games".

---

## 6. Overlay — collecting

> *(Prefix with the overlay constraints block from `StreamArena-UI-Brief.md` §5 — transparent background, fixed 1920×1080, no text under 20px, no weight under 500.)*
>
> Build the Bonus Hunt collecting overlay. Anchored to the left edge, vertically centred, roughly 420px wide.
>
> **Header:** "BONUS HUNT" uppercase with a purple underline glow. Beneath it the counter "18 / 30" — 18 in white at 48px, "/ 30" muted at 32px. A thin purple progress bar spans the panel width.
>
> **Stat block** — two rows of two, label above value:
> - START €5,000 · SPENT €3,240
> - BREAK EVEN €180 *(gold, the largest number in the block)* · AVG BET €4.50
>
> **Slot list:** the ten most recent entries, newest at the top. Each row: 44×44 thumbnail, slot name at 18px weight 600 truncated with ellipsis, requester username beneath at 14px in purple. New rows slide in from the top over 300ms with a purple flash and push the rest down. The bottom two rows fade out to imply more below.
>
> **Footer:** "Type !sr <slot> in chat to add" at 16px muted, with `!sr` highlighted purple.
>
> Panel: `rgba(19,19,28,0.88)`, `backdrop-filter: blur(12px)`, 2px `#2A2A3A` border, 16px radius, soft outer purple glow.

---

## 7. Overlay — guessing

> Build the Bonus Hunt guessing overlay. Same left anchor and width as the collecting state, so the transition feels like the same panel changing rather than a new element appearing.
>
> **Dominant element:** a countdown timer at 88px, Space Grotesk 700, purple — switching to red and gaining a pulse under 30 seconds. Label above it: "GUESS THE FINAL BALANCE".
>
> **Beneath it, the information viewers need to guess well:**
> - BONUSES 18 · SPENT €3,240
> - BREAK EVEN €180 per bonus — gold, largest, because this is the anchor every guess is made against
>
> **Call to action, large and unmissable:** "Type !guess <amount> in chat" at 24px, with `!guess` in purple.
>
> **Live guess counter:** "247 guesses" — counting up with a brief flash on each increment. Momentum is visible and it pulls more people in.
>
> **A short scrolling feed** of the last four guesses: username in purple, amount in white. Enough to prove it's live without becoming a wall of numbers.
>
> On lock, the whole panel does a single flash and the countdown replaces itself with "GUESSES LOCKED" for two seconds before the panel transitions to the opening state.

---

## 8. Overlay — opening

> Build the Bonus Hunt opening overlay. Anchored bottom-left now, wider (560px) and shorter, because the streamer's game needs the upper frame.
>
> **Dominant element:** running profit or loss at 88px, Space Grotesk 700 — green above break-even, red below, with a matching coloured glow. Label above reads "PROFIT" or "DOWN".
>
> **Three-column stat row beneath:** Won €4,120 · Spent €3,240 · Remaining 7 bonuses.
>
> **Last five opened slots** as a horizontal strip: 64×64 thumbnails, each with its multiplier overlaid on the bottom edge — white on dark normally, gold with a glow above 100×.
>
> **Currently opening:** a highlighted row above everything showing the active slot's thumbnail, name, and a pulsing purple "OPENING" label.
>
> **Optional closest-guess strip** — a single compact line at the bottom: "Closest guess: @slotgoblin €6,750". Updates as the running total moves past guesses. Include it as a toggleable element; it adds real drama during opening but it's the first thing to cut if the panel feels crowded.
>
> **Motion:** the profit figure counts up over 800ms when a win is entered. A new slot slides into the strip from the right. A win over 100× triggers a one-second gold flash across the panel — once, never looping.

---

## 9. Overlay — result reveal

Two stages, sequenced, matching the two chat announcements.

> Build the Bonus Hunt result overlay as a two-stage reveal. Centred, roughly 900×540 — it may occupy the middle of the frame because the hunt is over.
>
> **Stage one — hunt result.** Header "HUNT COMPLETE". Final profit or loss at 120px in green or red with a strong glow, and "€5,000 → €6,720" beneath as the before-and-after. A four-stat row: bonuses · total spent · total won · return multiple. Then a best-slot spotlight — a wide card with a 96×96 thumbnail, slot name, win in gold, multiplier, and the requesting viewer's username in purple under a small "requested by" label.
>
> Entrance: panel scales up from 0.9 with a fade over 400ms, then the profit figure counts up. A shimmer sweep or gold particles are welcome here — this is the one moment where spectacle is the point.
>
> **Stage two — guess winner.** After 6 seconds, the panel crossfades to the winner card: "GUESS THE BALANCE" header, the winner's Kick username at 64px in purple, their guess and the final balance side by side, and the difference highlighted ("off by just €30"). Beneath, smaller: "from 247 guesses". Second and third place appear as two small muted rows at the bottom.
>
> If Guess the Balance was disabled or nobody guessed, skip stage two entirely rather than showing an empty card.
>
> The whole reveal holds for about 30 seconds, then fades out.

---

## 10. Component — unresolved queue

The highest-value component in the dashboard. When `!sr gatez` fails to match, this is how the streamer rescues it in two seconds without leaving the game.

> Build an unresolved-request queue component.
>
> Amber left border, sits above the main slot list, only rendered when non-empty. Header: "3 requests we couldn't match".
>
> Each row shows the raw text the viewer typed in monospace and larger than surrounding text ("gatez"), the requester's username, and how many times that same text has appeared this session. To the right, up to three suggested slots as clickable chips — each with a 24×24 thumbnail, name, and a confidence percentage. Plus a "Search…" chip that opens the slot picker, and a "Discard" ×.
>
> Clicking a suggestion resolves the entry, animates the row out, and inserts it into the main list. Show a brief toast with an undo.
>
> Keyboard shortcuts on the focused row — 1, 2, 3 to pick a suggestion, D to discard — with the key shown on each chip. This gets worked in bursts and the mouse is too slow.

---

## 11. Component — result entry

> Build a keyboard-first inline number entry component for recording win amounts.
>
> The active row is elevated with a purple border. It contains a large number input with the currency symbol as a permanent prefix, and a live-computed multiplier appearing to the right as the user types ("×214" in gold above 100×).
>
> Behaviour: **Enter** confirms and auto-advances focus to the next row. **Tab** moves without confirming. **Escape** clears the field. **Shift+Enter** confirms and stays. Typing while a row is focused starts entry immediately with no click needed.
>
> Accept messy input — strip currency symbols, commas and spaces, and expand a `k` suffix (`1.8k` → 1800). Show the parsed value beneath the field as confirmation while typing.
>
> Confirmed rows collapse to a compact read-only line with an edit pencil.

---

## 12. Component — slot picker modal

> Build a slot search modal.
>
> Opens centred at 640px wide with a search field auto-focused. Results appear as the user types — each row a 40×40 thumbnail, slot name, provider, and RTP, with the matched substring highlighted.
>
> Arrow keys move the selection, Enter picks, Escape closes. Show the eight best matches; no pagination.
>
> Empty state: "No slots found" plus an "Add as custom slot" option that accepts a free-text name so the hunt is never blocked by a missing catalog entry.

---

## 13. Component — guess distribution

> Build a horizontal histogram of guesses.
>
> Guesses bucketed into roughly 12 bands across the observed range. Bars in purple (`#A855F7`) on `#1C1C28`. A vertical gold line marks the break-even balance, labelled. Hovering a bar shows the band range and count.
>
> Beneath: four compact stats — lowest, median, highest, and the modal band. Keep the axis labels at 12px muted; this is a glanceable shape, not a precise chart.

---

## 14. States to build

Easy to forget, and each one will happen on a live stream.

| State | Where | Behaviour |
|---|---|---|
| Overlay disconnected | Dashboard right rail | Red card, "Overlay not connected", copy-URL and troubleshooting link |
| No entries yet | Dashboard + overlay | "Waiting for the first !sr" with the command shown large |
| No guesses yet | Guessing phase | "No guesses yet — chat has 3:00 to play" |
| Chat silent > 2 min | Dashboard | Amber warning: "No chat messages received recently. Check your connection." |
| Unresolved queue empty | Dashboard | Component not rendered at all — no empty placeholder |
| Session recovered after refresh | Dashboard | Brief toast, "Session restored", state intact |
| Bot message failed | Right rail | Failed message shown with a red dot and a retry action |
| Hunt ended with zero bonuses | Result | Skip the result hero, show "Hunt ended early" |
| Guessing disabled | Everywhere | Phase indicator shows three steps, not four; overlay skips the guessing state entirely |

---

## Build order

**§2 collecting → §6 collecting overlay → §11 result entry → §4 opening → §8 opening overlay → §3 and §7 guessing → §5 and §9 results → §10 unresolved queue → §1 setup.**

Collecting on both surfaces first gets you a hunt you can actually run end to end with manual workarounds. Result entry comes early because everything downstream depends on how fast it feels. Setup goes last — it's the least interesting screen and its shape is obvious once the rest exists.
