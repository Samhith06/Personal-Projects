# StreamArena — UI Brief

**The foundation every game UI document assumes.** `StreamArena-BonusHunt-UI.md`, `StreamArena-Tournament-UI.md`, `StreamArena-SlotBingo-UI.md`, and `StreamArena-TeamBattles-UI.md` all open by saying *"paste this document's §1 and §2 first."* This is that document, and it also carries the full prompts for every screen that isn't a game — the ones Master Spec §20 assigns here.

**How to use it.** Building a game screen: paste **§1 + §2 + §3**, then the game document's section. Building a shell or admin screen: paste **§1 + §2 + §3**, then the section below. §4 (dashboard shell) and §5 (overlay platform) are laws rather than screens — read them once, obey them everywhere.

**Document map**

| Part | Contents |
|---|---|
| §1 | App context — what this is, who touches it, what the two surfaces are for |
| §2 | Design tokens — colour, type, space, radius, motion, elevation |
| §3 | Primitives — the components every screen is built from |
| §4 | Dashboard shell — layout, navigation, the live-session chrome |
| §5 | Overlay platform — OBS constraints, transparency, reconnect, the legibility floor |
| §6 | Screens — login, catalog, history, session detail, settings |
| §7 | Admin panel — slot catalog, alias queue, health, channels |
| §8 | Cross-cutting states — empty, loading, error, offline |
| §9 | Writing rules |
| §10 | Build order and open questions |

---

# §1. App context

**Paste this section verbatim at the top of any build prompt.**

> StreamArena is a web platform that lets gambling streamers on Kick run interactive games with their chat. The streamer signs in with Kick, picks a game, configures it, drops an overlay URL into OBS as a Browser Source, and starts. Viewers play by typing commands in chat — `!join gates of olympus`, `!side chaos`, `!vote a`. Everything appears live on the stream through the overlay. No software is installed, no config file is written, no bot runs on anyone's machine.
>
> **There are four surfaces and only two of them have a UI:**
>
> | Surface | Audience | What it is |
> |---|---|---|
> | **Dashboard** | The streamer, alone, on a second monitor | Login, game catalog, setup, live control, history, settings |
> | **Overlay** | Everyone watching the stream | A transparent OBS browser source, per-game, composited over live slot gameplay |
> | Chat bot | Viewers | No UI. Speaks only when it has to |
> | Admin panel | The platform operator | Slot catalog, alias review, health, channels |
>
> **The dashboard and the overlay are two different design problems and must never be built with the same instincts.** The dashboard is a dense control panel operated by one person on a second monitor while they are busy doing something else. The overlay is broadcast graphics, seen by thousands, at low bitrate, over busy game art, by people who are not looking directly at it. §5 covers the second one; assume nothing carries over.
>
> **The viewer never visits the website.** This is the constraint that shapes the whole product: if a feature requires a viewer to leave the stream, the feature has failed. Everything a viewer does, they do by typing in chat, and everything they get back, they get on the overlay.
>
> **The streamer is playing slots while operating this.** Their hands are on a casino in another window, they are talking to chat, and their attention is worth protecting. Every control on a live screen is judged by one question: can it be found and used without looking away for more than two seconds?

### The three people the UI is for

**The streamer**, primarily and overwhelmingly. Mid-size upward, on Kick, playing slots. Cares about: zero setup, an overlay that matches their layout, not babysitting the game while they play, and chat that stays busy.

**The viewer**, who sees only the overlay and only in their peripheral vision. Cares about: knowing instantly whether their entry landed, and being able to tell what's happening from a glance at a stream in a background tab.

**The moderator**, who fixes things mid-game without a login — removing a troll entry, correcting a misread slot. They get chat commands, not a screen, and the dashboard only has to show that their action happened.

---

# §2. Design tokens

**Paste this section verbatim at the top of any build prompt.**

Dark, high-energy, neon. A premium betting product, not corporate SaaS — it must look at home beside slot games on a stream.

```css
:root{
  /* Surfaces — never pure black */
  --bg-base:        #0A0A0F;
  --bg-surface:     #13131C;   /* cards, panels */
  --bg-raised:      #1C1C28;   /* inputs, insets, hover */
  --border:         #2A2A3A;
  --border-strong:  #3D3D52;   /* interactive borders */

  /* Text — never pure white */
  --text-primary:   #F5F5FA;
  --text-secondary: #9A9AB0;
  --text-muted:     #6A6A80;

  /* Semantic — meaning, never decoration */
  --accent:         #A855F7;   /* brand purple: primary action, active nav, live */
  --accent-dim:     #7E3FBF;   /* hover / pressed */
  --accent-glow:    rgba(168,85,247,.30);
  --win:            #22E88F;   /* profit, success, positive */
  --gold:           #FFC53D;   /* best result, notable, jackpot */
  --loss:           #FF4D6A;   /* loss, error, destructive */
  --info:           #3B9EFF;   /* informational, neutral status */

  /* Overlay-only */
  --overlay-panel:  rgba(19,19,28,.88);
  --overlay-blur:   blur(12px);

  /* Space — 4px base */
  --s1:4px; --s2:8px; --s3:12px; --s4:16px; --s5:24px; --s6:32px; --s7:48px; --s8:64px;

  /* Radius */
  --r-sm:6px; --r-md:10px; --r-lg:16px; --r-full:999px;

  /* Motion */
  --ease:cubic-bezier(.16,1,.3,1);
  --t-fast:150ms; --t-base:200ms; --t-slow:400ms; --t-count:900ms;
}
```

### Type

| Role | Face | Weights | Notes |
|---|---|---|---|
| UI and body | **Inter** | 400 / 500 / 600 | Everything that is words |
| Display and **all numbers** | **Space Grotesk** | 600 / 700 | Always with `font-variant-numeric: tabular-nums` |

**Tabular numerals are not optional.** Every headline figure in this product updates live — running totals, multipliers, countdowns, team averages. Proportional digits make a number jitter horizontally as it counts, which is both ugly and, on a 96px overlay figure, genuinely distracting. Set it globally on the display face.

**Scale.** 12 · 14 · 16 · 20 · 24 · 32 · 48 · 64 · 96 · 140. Dashboard body is 14 minimum. Overlay text is 20 minimum (§5).

### Colour rules

- **One accent carries the primary action per screen.** If two things are purple, neither is primary.
- **Green means profit, red means loss, gold means best-or-notable.** Never decorative, never swapped, never used for anything else. A green border on a card that isn't about profit is a bug.
- **Never pure black `#000` or pure white `#FFF`.** Both read as a rendering error against this palette.
- **Neon glow on emphasis only** — primary buttons, active nav, the LIVE dot. Applied broadly it stops meaning anything and starts looking cheap.
- **A game may override the accent.** Team Battles suppresses `--accent` entirely because its Chaos violet measures 1.02:1 against it. When a game document says the accent is retired, that instruction wins.

### Motion rules

- **150–200ms ease-out** for interface transitions. `--t-slow` for anything taking over the frame.
- **Numbers count up, never snap.** `--t-count` (900ms), eased, digits rolling. This is the single most repeated animation in the product and it is what makes a result *felt* rather than read. It applies to counting down too.
- **New list items slide in from the top with an accent flash.** One pattern, used for every feed in the app.
- **Nothing loops indefinitely** except one small LIVE dot. On the overlay, motion means data changed — a looping element trains viewers to ignore movement, which is the opposite of what an overlay is for.

---

# §3. Primitives

Build these once. Every screen in every game document is assembled from them.

> **Button** — three levels. Primary: `--accent` fill, `--bg-base` text, subtle glow, 44px tall minimum. Secondary: `--bg-raised` fill, 1px `--border-strong`. Tertiary: text only, `--text-secondary`, underline on hover. Destructive: `--loss` outline, filling on hover. All 10px radius, 150ms, disabled at 40% opacity with `cursor:not-allowed`.
>
> **Input** — `--bg-raised`, 1px `--border`, 10px radius, 14px text, 40px tall. Focus: 2px `--accent` ring, no glow. Error: `--loss` border with the message beneath at 12px, never a tooltip. Currency and number inputs use Space Grotesk with tabular numerals and a leading unit chip.
>
> **Card** — `--bg-surface`, 1px `--border`, 16px radius, 24px padding. No shadow (they read as mud on this palette); separation comes from the border and the surface step.
>
> **Segmented control** — for 2–4 exclusive options where all of them should be visible. `--bg-raised` track, `--accent` selected pill, 150ms slide. Preferred over a dropdown everywhere in setup: a streamer configuring a game should see the options, not go looking for them.
>
> **Toggle** — 44×24, `--bg-raised` off, `--accent` on, label always to the left, helper text beneath in `--text-muted`.
>
> **Slider** — `--accent` fill left of the handle, `--border-strong` right, with the live value shown in a mono chip above the handle. Always paired with a plain-language line beneath that translates the value ("5 minutes", "€50–€500 per bonus").
>
> **Badge** — 12px, 500 weight, `--r-full`, coloured background at 20% opacity with the full-strength colour as text. Used for roles (sub, mod, follower), states (LIVE, ENDED, DRAFT), and streamer's-pick markers.
>
> **Feed row** — avatar, username with role badge, an arrow, a slot thumbnail, slot name. Slides in from the top with an accent flash on arrival. Hover reveals row actions on the right. This one component serves the join feed, the request feed, and the ledger in every game.
>
> **Stat tile** — a label at 12px `--text-secondary` above a figure in Space Grotesk. Three sizes: 24 (inline), 48 (row hero), 96 (screen hero). Figures count up on change.
>
> **Empty state** — a glyph at 20% opacity, a single line of what should happen, and the command that makes it happen shown in mono at the largest size the space allows. Never a spinner where an empty state belongs.
>
> **Toast** — bottom-right, `--bg-raised`, 1px `--border-strong`, 4s auto-dismiss, stacking upward, max three. Errors persist until dismissed.
>
> **Confirm dialog** — used only for the irreversible. Title states the consequence rather than asking a question ("This ends the session and publishes results"), the confirm button carries the verb, and the cancel is secondary and to the left.

**One rule about dialogs, and it matters more here than in most products:** a confirm dialog on a live screen is a two-second cost to a streamer who is mid-game. Use one for *irreversible and consequential*, not for *irreversible*. Ending a session, running a draw, and reverting a banked result earn one. Closing a join window does not.

---

# §4. Dashboard shell

The frame every dashboard screen lives inside. Build it once; game documents assume it exists and describe only what sits in the content area.

```
┌────────────────────────────────────────────────────────────────┐
│  StreamArena          Games   History   Settings      @user ▾  │  64px
├──────────┬─────────────────────────────────────────────────────┤
│          │  ● LIVE · Team Battles · 01:12:04 · PICK 8/10       │  56px
│  session │  Joining → Pick → Flip → Buying → Result → Complete │
│  rail    ├─────────────────────────────────────────────────────┤
│          │                                                     │
│  280px   │              content area                           │
│  (live   │              max 1200px, centred                    │
│  only)   │                                                     │
└──────────┴─────────────────────────────────────────────────────┘
```

> **Top bar, 64px, always.** Wordmark left. Centre nav: Games · History · Settings, active item in `--accent` with a 2px underline. Right: avatar, username, dropdown (Kick channel, Sign out).
>
> **Session bar, 56px, live sessions only.** A pulsing `--accent` LIVE dot, the game name, elapsed time in tabular mono, a game-specific progress figure, and the phase indicator — every phase shown, completed ones in `--text-muted`, current in `--accent`, future in `--border`. Right-aligned: "End session" as a destructive tertiary button.
>
> **Right rail, 280px, live sessions only.** Fixed, always visible, containing in order:
> - **Overlay status** — a green dot with "Connected", or a `--loss` card with the overlay URL, a copy button, and a troubleshooting link. This is the first thing a streamer looks at when something is wrong on stream
> - **Chat status** — connected, messages seen in the last minute, and the current ack policy
> - **Recent bot messages** — the last five, exactly as they appeared in Kick, so the streamer can see what their audience is being told
> - **Game-specific panel** — the slot each game document fills (the guess leaderboard, the prediction standings, the session ledger)
>
> **Content area** — max 1200px, centred, 24px gutters. Scrolls independently of the rail.

**The right rail is not optional and it is not decoration.** When something goes wrong mid-stream, it goes wrong in one of two places — the overlay dropped, or chat stopped arriving — and both are invisible from the game screen itself. A streamer who has to go hunting for connection status while their overlay is frozen on stream is having the worst possible experience of this product.

### Keyboard

The dashboard is operated one-handed by someone whose attention is elsewhere. Every live screen supports:

| Key | Action |
|---|---|
| `Enter` | Confirm the primary action of the current phase |
| `Tab` / `Shift-Tab` | Move between the fields of the active entry component |
| `1` `2` `3` | Pick the corresponding suggestion in the unresolved queue |
| `D` | Discard the current unresolved entry |
| `Esc` | Close any dialog, never destructively |
| `?` | Shortcut overlay |

**Shortcuts are shown inline on the controls themselves**, in `--text-muted` at 12px, not hidden behind the help overlay. A shortcut nobody discovers is a shortcut that was never built.

---

# §5. Overlay platform

**The biggest source of mistakes in this product, and the section to re-read before every overlay build.**

The overlay renders as a transparent OBS Browser Source at exactly **1920×1080**, composited over live slot gameplay and re-encoded at low bitrate.

### Laws

- **Background fully transparent.** Never set a page background colour. Not even during loading.
- **Fixed canvas.** No scrolling, no responsive breakpoints, no media queries. 1920×1080, always.
- **No text under 20px. No font weight under 500. No borders under 2px. No low-contrast greys.** Thin and subtle does not survive re-encoding — it vanishes entirely.
- **Panels sit on `--overlay-panel` with `--overlay-blur`.** Never fully opaque, never fully transparent behind text.
- **Keep the centre third clear.** The slot game and the facecam live there. Overlay elements are edge-anchored.
- **Animate only when data changes.** No idle loops, no ambient particles, no breathing gradients on anything except a single small LIVE indicator or an explicit rest state defined by a game document.
- **Test against a screenshot of a real slot game, not a white page.** This is the one that catches people. Layouts that look crisp in a builder routinely disappear over Gates of Olympus.

### Reconnection

OBS browser sources drop constantly, and **a silently desynced overlay showing stale data on stream is the worst failure mode in the product.**

> On connect, the server sends a **full snapshot**; after that, patches. The client tracks a sequence number and requests a resync on any gap.
>
> **An animation interrupted by a reconnect is never replayed.** Jump to the settled state. Replaying a reveal that viewers already saw reads as the result being re-rolled, which is far worse than a missed animation.
>
> **Never show a connection error on the overlay.** It is composited into a live broadcast. A disconnected overlay renders its last known state and says nothing; the failure surfaces on the dashboard rail, where the person who can fix it is looking.

### The legibility test

Before an overlay state ships, all four:

1. **Greyscale.** Can you tell what's happening with no colour at all?
2. **Over game art.** Screenshot a real slot, put the overlay on top, look at it.
3. **At 25%.** Scale the frame down to roughly what a phone viewer sees. The hero figure must still be readable.
4. **Peripheral.** Look away from the screen and back. Whatever you noticed first should be the most important thing in the state.

---

# §6. Screens

## 6.1 Login

> Build the StreamArena login screen. Single centred card, 420px, on `--bg-base` with a subtle `--accent-glow` radial behind it.
>
> Wordmark above. One line: "Run games with your Kick chat." One button, full width, primary, with the Kick glyph: **"Continue with Kick"**. Beneath it in `--text-muted` at 12px, the permissions in plain words: "We'll read your chat for commands, post occasional messages, and read your channel info. Nothing else."
>
> **Returning-user state:** if a session exists, skip this screen entirely — never make a streamer click through a login they've already done.
>
> **Error states:** OAuth denied ("You'll need to allow access for StreamArena to read chat commands" with a retry), Kick unreachable (`--info` card, "Kick's API isn't responding — this is on their side. Try again in a minute"), and account not permitted.

Stating the permissions in plain language beneath the button, rather than relying on Kick's consent screen to explain them, is worth the four lines. This product asks to read a streamer's chat and post as them; being unambiguous about that at the front door is how it earns the click.

## 6.2 Game catalog

> Build the game catalog — the screen after login and the app's home.
>
> **If a session is live**, a full-width `--accent`-bordered resume card sits above everything: game name, elapsed time, current phase, and a primary "Return to session". Nothing else on the page competes with it.
>
> **Header:** "Games", with a subhead: "Pick one, set it up, drop the overlay into OBS."
>
> **Game cards in a responsive grid**, 3-up at 1200px. Each card: an illustrative glyph or thumbnail, the game name at 24px, a one-line description, and three metadata chips — typical session length, viewer commands used, and whether it needs the slot catalog. Hover raises the card to `--bg-raised` and reveals a primary "Set up".
>
> ```
> Bonus Hunt      Collect bonuses, open them, chase break-even.   90–240 min · !sr
> Slot Tournament A knockout bracket where every slot is a viewer. 60–120 min · !join !vote
> Slot Bingo      A board of viewers. Lines live and die.          2–4 hrs · !join
> Team Battles    A coin flip puts each viewer on a team.          45–90 min · !join !side
> ```
>
> **Coming-soon cards** are shown at 50% opacity with a "Soon" badge and no hover state — visible, not clickable. Streamers should be able to see the roadmap.
>
> **Beneath the grid:** "Recent sessions" — three compact rows linking into history.

## 6.3 History

> Build the session history screen. A dense, scannable table — this is a records screen, not a dashboard.
>
> **Filters across the top:** game (multi-select chips), date range, outcome (profit / loss / abandoned), and a search field matching viewer usernames and slot names.
>
> **Columns:** date and time · game (with its glyph) · duration · a game-specific headline result · profit or loss in `--win` / `--loss` with the sign always shown · participant count · a status badge (Completed / Abandoned).
>
> The headline result column is per-game: the final balance for a hunt, the champion for a tournament, the winning line for bingo, the winning team for Team Battles.
>
> **Row click opens the session detail.** Row hover reveals "Copy results" and "Delete".
>
> **A summary strip above the table:** sessions run, total profit or loss across all of them, most-played game, and largest single multiplier ever recorded. This is the screen a streamer screenshots, so it should be worth screenshotting.
>
> **Empty state:** "No sessions yet" with a primary "Pick a game".

## 6.4 Session detail

> Build the session detail screen — a permanent record of one completed session.
>
> **Header:** game name, date, duration, and a status badge. Right-aligned: "Copy results for chat", "Export CSV", and, where the game supports it, "Replay overlay reveal".
>
> **Result block** — the same three-card layout the game's complete screen used, so a streamer looking at a session from three weeks ago sees exactly what they saw on the night.
>
> **Full participant table**, sortable, per-game columns.
>
> **Timeline** — a vertical event log: every entry, draw, result, and correction with timestamps. Corrections are marked in `--gold` and show both values. Collapsed by default with a count: "48 events".
>
> **Fairness block, where the game commits a sequence** (Team Battles, Slot Bingo): the committed sequence in mono, its fingerprint, and when it was locked. Copyable.
>
> **Chat log** — every message the bot sent this session, exactly as it appeared. Collapsed by default.

**The timeline exists for one specific conversation.** When a viewer claims something went wrong three days after a session, this is the screen that answers it in ten seconds. That is worth building properly even though it will be opened rarely.

## 6.5 Settings

> Build the settings screen. A left tab rail, content on the right, 720px max.
>
> **Account** — Kick channel with avatar and follower count, connection status, reconnect, sign out, delete account.
>
> **Chat bot** — the shared block every game document references:
> - Ack frequency — segmented: Off / Errors only *(default)* / Batched summaries / Every request. Each option shows a live example rendered as a mock Kick message, because the difference between these is not obvious from the labels
> - Announce winners — toggle, default on
> - **Stream delay** — number input, seconds, default 12, with the plain-language hint: *"How many seconds behind is your stream? We'll hold chat announcements this long so they don't spoil your overlay."*
> - Command prefix — text input, default `!`
>
> **Overlay** — the overlay URL with a copy button and a regenerate action behind a confirm ("This breaks the URL in your OBS scene"), plus a live preview iframe on a checkerboard transparency background at 25% scale, and a one-time OBS setup guide.
>
> **Templates** — a per-game message template editor. Each field shows a live preview rendered as a mock Kick message, with the available tokens listed beside it as clickable chips that insert at the cursor, and a character counter that turns `--loss` above 500.
>
> **Defaults** — per-game saved setups so a streamer who always runs a 15-pick Team Battles with the same bounds doesn't rebuild it weekly.

**The stream delay input is the most under-appreciated control in the product.** Set wrong, every dramatic reveal in every game is spoiled in chat before viewers see it. It deserves the plain-language hint, a sensible default, and a place a streamer will actually find it.

---

# §7. Admin panel

Operator-facing, not streamer-facing. It can be denser and plainer than the dashboard — the only user is you, and you will use it a lot.

> **Shell:** a persistent left nav (Slot catalog · Alias queue · Health · Channels), no session bar, no right rail, and a visually distinct top bar so it is never mistaken for the streamer dashboard.

## 7.1 Slot catalog

> Build the slot catalog admin screen. A dense table with a persistent search across name, provider, and alias.
>
> **Columns:** thumbnail · canonical name · provider · buy cost in bet multiples · has-bonus-buy flag · volatility · alias count · times requested (all-time) · last seen.
>
> **Row click opens an edit drawer** from the right: all fields editable, an alias list with add and remove, thumbnail upload, and a "merge into another slot" action for duplicates.
>
> **Bulk actions:** import from CSV, export, and bulk provider reassignment.
>
> **Sort by "times requested" descending as the default view.** The most-requested slots are the ones whose data being wrong hurts most, so that's the working order.

## 7.2 Alias review queue

**The highest-value screen in the admin panel**, because slot name matching is what makes the product feel magic or feel stupid, and this is where that gets fixed.

> Build the alias review queue. A single-column worklist, one unresolved request at a time, designed to be worked in fast bursts with the keyboard.
>
> **Each item shows:** the raw string the viewer typed, in mono at 24px · how many times it has been seen and across how many channels · when it was last seen · and up to three fuzzy-match candidates as cards with thumbnail, canonical name, provider, and a match confidence figure.
>
> **Keyboard-first:** `1` `2` `3` accept the corresponding candidate and create the alias · `S` search manually · `D` discard as unmatchable · `N` skip · and each action advances immediately to the next item.
>
> **A counter in the header:** "412 unresolved · 38 seen more than once". Sort by frequency descending, because an alias seen 60 times is worth sixty fixes.
>
> **Undo lives in a toast for 8 seconds** after every action, because this screen is worked fast and mistakes are certain.

## 7.3 Health

> Build the system health screen.
>
> **Top row of stat tiles:** active sessions · connected overlays · chat messages processed in the last hour · commands parsed · Kick API quota used against the limit, as a bar that turns `--gold` at 70% and `--loss` at 90%.
>
> **Kick quota panel** — the important one. Current window usage, time to reset, messages queued in the priority lane versus the batch lane, and any rate-limit rejections in the last hour with the channel and timestamp.
>
> **Live sessions table:** channel · game · phase · elapsed · overlay connected · events per minute. Row click opens a read-only view of that session's state.
>
> **Error log**, filterable by severity, with the last 200 entries.

## 7.4 Channels

> Build the channels admin screen. A table of every connected Kick channel: avatar · channel name · follower count · date connected · sessions run · last active · token status (valid / expiring / revoked).
>
> **Token status is the operationally important column.** An expiring or revoked token means that streamer's next session fails at start, so surface it with `--gold` and `--loss` badges and sort those to the top by default.
>
> Row actions: view sessions, force token refresh, and suspend.

---

# §8. Cross-cutting states

Build each of these once, as a shared component, and use it everywhere. Every game document's "States to build" table assumes these already exist.

| State | Treatment |
|---|---|
| **Loading — first paint** | Skeleton blocks matching the eventual layout, `--bg-raised`, shimmering at 400ms. Never a centred spinner on a full screen |
| **Loading — action in flight** | The button holds its label and gains an inline spinner; it never changes width, because a button that resizes moves everything around it |
| **Empty — nothing yet** | Glyph at 20%, one line of what happens next, and the relevant chat command in mono at the largest size the space allows |
| **Empty — filtered to nothing** | Different from the above and must say so: "No sessions match these filters" with a "Clear filters" action |
| **Error — recoverable** | Inline `--loss` card with a plain-language cause and a retry. Never a modal |
| **Error — the session broke** | Full-screen takeover with what happened, what was saved, and a "Recover session" action. State is event-sourced, so recovery is nearly always possible and the copy should say so |
| **Offline — dashboard** | A persistent `--gold` bar under the top bar: "You're offline. The session is still running on our servers." This is true and it is the single most reassuring sentence the product can show |
| **Offline — overlay** | Nothing. Last known state, silently (§5) |
| **Kick API degraded** | `--info` bar naming Kick as the cause, so the streamer doesn't spend ten minutes debugging their own setup |
| **Permission denied** | Plain explanation and a route back, never a raw status code |

**"The session is still running on our servers" is the most important sentence in this table.** The whole premise of the product is that nothing runs on the streamer's machine. A network blip that looked like data loss would undo that promise instantly, and one line of copy prevents it.

---

# §9. Writing rules

The interface talks to two audiences with two different voices, and mixing them is the most common copy mistake in this product.

**Dashboard copy — to the streamer, direct and technical.** They know what a bonus buy is. Say what a control does, not how it will make them feel. "Winner is the higher multiplier (payout ÷ buy cost)" beats "Fair and exciting matchups!"

**Overlay copy — to thousands of viewers, at a glance.** Short, loud, and never a full sentence where a fragment works. `FORTUNE NEED 41.8×` not `Fortune needs a 41.8x multiplier to take the lead`.

**Chat copy — see the games' chat sections.** Terse, threaded for acks, top-level for announcements, and silent by default.

**Rules that apply everywhere:**

- **Numbers are always formatted the same way.** Multipliers to two decimals with a trailing `×` (`4.25×`). Currency with the streamer's symbol and thousands separators. Percentages with no decimals. Durations as `1:12:04`.
- **Never say "Error" as a heading.** Say what happened.
- **Never blame the user.** "That slot's already claimed" not "Invalid entry".
- **Name the cause when it's external.** "Kick's API isn't responding" is dramatically more useful than "Something went wrong".
- **Irreversible actions state their consequence in the button**, not in the dialog title: "End session & publish results".
- **Never use "just".** "Just click", "just wait", "it's just a" — it makes a real problem sound like the reader's fault.

---

# §10. Build order

**§2 tokens → §3 primitives → §4 shell → §6.1 login → §6.2 catalog → §5 overlay platform harness → the first game → §6.3 history → §6.4 session detail → §6.5 settings → §8 states → §7 admin.**

Tokens and primitives first, obviously — every screen after them is assembly. The shell, login, and catalog next, because they're the path to any game screen and they're small.

**The overlay platform harness before the first game overlay.** Transparent canvas, snapshot-and-patch transport, sequence tracking, resync on gap, and the no-replay-after-reconnect rule — built once as a wrapper, tested with a dummy state, before a single game-specific pixel exists. Retrofitting reconnection into four game overlays is four times the work and three chances to get it wrong on stream.

Then a complete game, end to end, on a real Kick channel. Everything after that is informed by having done it once.

History and session detail follow the first completed session, because that's the first moment there's anything to show. Settings can lag — sensible defaults carry a beta. Admin comes last in polish but the **alias queue** needs a rough version early, since slot matching quality gates how good every game feels.

### Open questions

| Question | Why it's open |
|---|---|
| Overlay theming | Streamers will want their colours. Every game document currently assumes one theme; a token-swap layer is the likely answer but it interacts with the colour-safety rules in Team Battles §3 |
| Mobile dashboard | A streamer on a phone can't realistically run a live session, but they may want to check one. Read-only mobile view of the live session is probably the whole scope |
| Multiple concurrent games | The shell assumes one live session. Supporting two changes the session bar and the rail structurally, so decide before those are polished |
| Overlay layout presets | Corner-anchored versus lower-third versus full-side. Currently every game document picks its own anchoring, which will look inconsistent once a streamer runs two of them |
