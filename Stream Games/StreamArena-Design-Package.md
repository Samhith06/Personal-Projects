# StreamArena Design Package

Tier 1, single journey. Written before generation. Consumed by the build.
Every line of copy below ships verbatim. Band ranges are starting points, validated by the flick test.

---

## 1. The brand premise

**Chat does the typing.**

One real word from the subject's world: *typing*. Today the streamer is the typist. They read chat out loud, type slot names into a spreadsheet, miscount, and lose entries when chat moves fast. StreamArena moves the keyboard into chat. Viewers type, the runtime parses, the overlay shows it, and the streamer plays.

Every section teaches that one sentence. The problem section shows who types now. The Bonus Hunt section shows chat typing instead. The interactive moment makes the visitor type a command themselves. The closing line pays it off. A section that does not serve the premise does not belong on the page.

---

## 2. The palette as CSS tokens

Direction sampled from the storyboard's world: scattered cool light on deep blue-black, resolving into one warm-cored band. Exact values get finalized from the approved footage after the video gate.

```css
:root{
  --canvas:#0A0D14;        /* deep blue-black, tinted from the footage grade, never pure black */
  --panel:#121826;         /* cards and raised surfaces */
  --panel-2:#1A2233;       /* the second surface level, for insets and chat rows */
  --accent:#FF5B34;        /* live broadcast coral, the CTA and rare emphasis only */
  --accent-hover:#FF7551;
  --accent-muted:rgba(255,91,52,.22);   /* borders, glows, particles at whisper level */
  --text-primary:#EEF2F8;
  --text-secondary:#97A3B8;
  --hairline:rgba(151,163,184,.16);
  --border-strong:rgba(151,163,184,.34); /* interactive borders, which need their own stronger value */
}
```

Measured contrast on the canvas: primary text 17.4:1, secondary text 7.5:1, accent 6.3:1. Dark canvas text on the accent button 6.3:1.

**Why not the obvious palette.** Near-black with acid green is both an AI-cliché look and Kick's own brand colour, so it would make the site read as a casino promo and as a template at the same time. The warm accent on cool blue-black reads as an on-air light instead, which is the right idea for a broadcast tool.

---

## 3. The type trio

| Role | Face | Weights |
|---|---|---|
| Display | **Bricolage Grotesque** | 600, 800 |
| Body | **Public Sans** | 400, 500 |
| Mono | **JetBrains Mono** | 400, 500 |

Bricolage Grotesque has real character in its odd widths and tight joins, which suits a tool that is precise but not corporate. JetBrains Mono is not decoration here: every chat command on the page (`!sr gates`) has to look like something a viewer actually typed.

Trimmed to those weights only, loaded with `preconnect`.

---

## 4. The band map

Hero height 500vh, so the scroll range is 400vh. Four bands, each 0.24 to 0.25 of progress (band 3 widened after the flick test), giving roughly 100vh per band with 8vh eased ramps and an 84vh fully-settled plateau. Starting points, validated by the flick test.

| Band | Range | Footage moment | Copy (verbatim) | Entrance |
|---|---|---|---|---|
| 1 | 0.00 to 0.24 | Thousands of separate points of light drifting on their own, no order anywhere | "Right now, you're the one typing." | **Scatter**, characters fly in from seeded random offsets, echoing the loose motes. Band 1 also gets the one-time load ramp so it opens settled. |
| 2 | 0.25 to 0.50 | The motes begin to find a shared direction, drift turning into alignment | "Every slot name. Every entry. By hand." | **Grid snap-align**, characters slide horizontally into place in reading order, echoing the alignment happening behind them. |
| 3 | 0.51 to 0.75 | Aligned motes gather inward and pull into forming columns | "Chat can do all of it." | **Converge** (invented for this build): each character starts pushed outward from the line's centre and pulls inward to rest, echoing the gathering. |
| 4 | 0.76 to 1.00 | The band of light comes to rest across the frame, everything else quiet | Headline: "Chat does the typing." Subline: "Interactive games for Kick streamers. Viewers play from chat, the overlay keeps up, and you get to just play." CTA: "Get early access" | **Word-by-word rise into a staged settle**: headline words rise in reading order, then the subline at k 0.66, then the CTA row at k 0.78. Three arrivals, one band. |

Band 1 skips the opacity ease-in. Band 4 skips the ease-out. The action lane is the centre of frame, so all four bands sit in the upper third and lower third, never across the middle.

---

## 5. The static-hero copy block

For phones, portrait tablets, landscape phones, and reduced motion. Composed over the ending frame, standing on its own with no journey behind it.

- **Headline:** "Chat does the typing."
- **Subline:** "Interactive games for Kick streamers. Viewers play from chat, the overlay keeps up, and you get to just play."
- **CTA:** "Get early access"

---

## 6. The below-fold outline

Every section funnels to one anchor: `#early-access`. No two adjacent sections share a layout skeleton.

### 6.1 The loop (the signature element)

Full-width dark band. The **live chat lane** runs down the left as real commands, and overlay cards assemble on the right as you scroll. This is the site's signature and the boldness budget is spent here.

- Kicker: "The loop"
- Headline: "One message. Four steps. On screen."
- Chat lane rows, in mono, verbatim:
  - `viewer_92: !sr gates`
  - `mlnq: !sr sweet bonanza`
  - `hexed: !sr gatez`
  - `tovi: !sr wanted`
- The four steps, each one label and one line:
  1. **Read** / "A viewer types in chat. Nothing to install, nothing to sign up for."
  2. **Match** / "The name resolves to a real slot, even when it is spelled wrong."
  3. **Update** / "The game state changes. Entry counted, guards applied."
  4. **Show** / "The overlay updates on stream, in the same second."
- Closing line: "Every game we build is that loop with different rules."

### 6.2 The problem

Asymmetric split, text left, a single generated still right.

- Kicker: "Today"
- Headline: "The tool most streamers use is a Notepad window."
- Body: "You set the balance in a spreadsheet you built yourself. You screen-cap it into the corner of your layout. Then you type every slot chat shouts at you, while playing, for four hours. Entries get missed. Names get typed wrong. The count drifts."
- Body: "Viewers cannot tell whether you caught their suggestion, so they send it again. Which makes it worse."
- Pull line: "You are running the game and being the database."

### 6.3 Bonus Hunt

Editorial layout, wide. The break-even number is the visual anchor and it is large, because that number is the emotional core of a hunt.

- Kicker: "The first game"
- Headline: "Bonus Hunt, running itself."
- Body: "Set a starting balance and a target. Viewers fill the list from chat while you play. Every entry resolves to a real slot with its name, provider, and thumbnail, and lands on the overlay the moment it is counted."
- The break-even display: label "Needed per bonus to break even", figure "€166.67", sub-label "€5,000 across 30 bonuses"
- Three stat cards, equal treatment:
  - "One entry per viewer" / "Configurable, with a cooldown between requests."
  - "Duplicates caught" / "Same slot twice never enters the list twice."
  - "Mods can fix it" / "A bad entry comes off with a command, not a login."
- Closing line: "You record the bonuses as they land. That is the only typing left."

### 6.4 Try it (the one interactive moment)

The visitor performs the premise. A chat input sits on the page. They type a slot name after `!sr` and press enter, and the overlay card assembles on the right exactly as it would on stream.

- Kicker: "Your turn"
- Headline: "Type it the way a viewer would."
- Helper: "Try gates, sweet bonanza, or wanted. Spell it wrong on purpose."
- Input prefix, in mono: `!sr`
- Placeholder: "gates of olympus"
- Success state on the card: the resolved slot name, provider, and a counted badge reading "Entry 1 of 30"
- Near-miss state, shown when the spelling is off: "Matched from `gatez`"
- Empty submit state: "Type a slot name first."
- Closing line: "That is the entire viewer experience. No signup, no link, no site visit."

Reduced motion gets the completed card immediately, with no typing required.

### 6.5 Three steps to live

Three cards, equal treatment, each with its own generated still in the hero's world. No card without an image.

1. **Sign in with Kick** / "One consent screen. Read chat, send chat, read channel."
2. **Paste one URL into OBS** / "A browser source, added once. Position it and forget it."
3. **Press start** / "StreamArena begins listening. The overlay goes live."

- Closing line: "Nothing is installed on your machine. There is no bot to run and nothing to keep updated."

### 6.6 What is coming

Compact grid, quieter than everything around it, deliberately.

- Kicker: "The catalog"
- Headline: "Bonus Hunt is the first, not the point."
- Body: "The runtime underneath is built for chat-driven games. Adding the tenth one should cost days, not months."
- Items, name and one line each:
  - **Slot Battles** / "Two slots, a fixed number of spins, chat picks the matchups."
  - **Giveaways** / "Keyword entry, optional follower gating, an animated draw."
  - **Predictions** / "Chat calls the final balance before the hunt opens."
  - **Guess the Multiplier** / "Fast, repeatable, runs dozens of times a stream."
  - **Slot Roulette** / "Chat fills the pool, the wheel picks what you play next."
  - **Community Goals** / "Chat hits a target together and you make the bigger bet."

### 6.7 Straight answers (FAQ)

Answers the real objections, in the buyers' own words.

- **"Do my viewers have to sign up for anything?"** / "No. They type in chat. That is the whole interaction, and it is the point."
- **"Do I have to install software?"** / "No. One browser source URL in OBS, added once. Everything else runs on our side."
- **"Is this gambling?"** / "No. Viewers never stake money. There are no deposits, no withdrawals, and no cash out. Points are engagement scoring with no monetary value and no way to redeem them. StreamArena sits beside gambling content, it is not a gambling operator."
- **"What happens when my overlay drops mid stream?"** / "It reconnects and resyncs on its own. OBS browser sources drop constantly, so the overlay is built to expect it."
- **"Will the bot spam my chat?"** / "It stays quiet by default and only speaks when something goes wrong. Four settings: off, errors only, batched summaries, or every request."
- **"What if chat spells the slot name wrong?"** / "`gates`, `gates of olympus`, and `gatez` all land on the same slot. When it genuinely cannot tell, it asks the viewer instead of guessing."
- **"Does it work on Twitch?"** / "Kick first. The platform layer is separated from the games, so Twitch is an addition rather than a rewrite."

### 6.8 The call to action

- Kicker: "Early access"
- Headline: "Put your chat to work."
- Body: "StreamArena is in build. Early access streamers get it first and shape which game we ship after Bonus Hunt."
- Form labels: "Kick channel", "Email"
- Placeholders: "your channel name", "you@example.com"
- Button: "Get early access"
- Success state: "Thanks. Nothing was sent anywhere, the list is not open yet."
- Error state: "Add your email and we'll take it from there."
- Microcopy under the form: "This form is not connected yet, so nothing is sent."
- **Form handling: JS-only success state, chosen by the user.** Submissions go nowhere and are never stored. The success state and the microcopy both say so, because a form that pretends to collect leads it discards is the one thing this page must not do. Swapping in a real endpoint later is a one-line change.

### 6.9 Footer

- The mark, the wordmark, and the line "Interactive games for Kick streamers."
- Column: Product, Bonus Hunt, The catalog, Early access
- Legal line: "StreamArena is not affiliated with Kick. No real-money wagering. 18+."
- Disclosure line: "Imagery on this page is generated. The product is in build."

The disclosure line is not optional. Nothing on the page is a screenshot of software that does not exist yet, and the footer says the imagery is generated so the page never overstates what is built.

---

## 7. The vector layer plan

Everything here is drawn by hand as inline SVG, never an icon font or a stock pack.

- **The brand mark:** an arena rendered as a settled band. A rounded rectangle outline with a single horizontal bar resting across its lower third and three dots above it converging toward the bar. The mark is the hero's story at 24px. Doubles as the inline SVG favicon.
- **The self-drawing loop line:** in section 6.1, a single path threading Read, Match, Update, Show, drawn with `stroke-dasharray` as the section scrolls into view. Reduced motion shows it fully drawn.
- **The mote field:** the fixed background environment layer behind the whole page. Twelve to twenty small blurred dots drifting on a 90 second cycle at whisper opacity, so scrolling feels like moving through one place. Negative animation delays so the loop is mid-cycle at first paint.
- **The hairline dividers:** asymmetric rules that start at the accent at whisper strength and fade out, never a full-width grey line.
- **The chat lane glyphs:** the `↳` reply marker drawn as a path, matching Kick's threaded replies described in the product doc.

All of it honors reduced motion: final states shown, drives stopped.

---

## 8. The engineering list

The build implements the full standard in `references/scrub-pipeline.md`, specifically:

- Blob fetch of the hero video, with the streamed loader and progress ring if the encode lands over 8 MB, plus the 20 second no-progress watchdog aborting into the still fallback.
- Poster painted first, blob fetch started only once the poster is in or has failed, with the 4 second safety timer.
- dt-normalized lerp in a rAF loop that rests when converged and when the hero is off-screen, tracked by IntersectionObserver.
- Gated seeks that coalesce to the newest target, with the `error` handler resetting the busy flag so the gate cannot deadlock.
- Delta-gated DOM writes on every band, every `--k`, and every scroll-driven string, with `--k` gated at 0.008.
- Band pacing in scroll distance, smoothstep ramps, validated by the flick test at 120px, 240px, and 360px.
- The four-layer legibility system: global base scrim, per-band scrim riding `--k`, the three-layer text-shadow token, and chip scrims on small text. Worst-frame audit at 3.5:1 minimum per band.
- The five static-hero gates, character-for-character identical in CSS and JS, armed and disarmed live from `change` listeners on all five queries.
- Complete without the video: every caption, section, and the CTA work over the poster alone.
- Reduced motion honored live and in both directions, with `pinToFinalStates` and its full undo.
- `overflow-x: clip` on both `html` and `body`, with `hidden` declared first.
- Semantic landmarks, skip link to `#main`, `aria-hidden` and `tabindex="-1"` on the decorative video, `:focus-visible` in the accent, 44px touch targets under coarse pointer.
- The whole-site-animated standard: one living element per section at whisper level, one entrance per moment, easing on everything, paused off-screen and on hidden tabs via the body-class pattern.

---

## 9. The copy gate line

Every viewer-facing line above ships verbatim. Before anyone sees the built page it must pass the Phase 9 grep gate: zero em dashes, and zero instances of leverage, seamless, empower, unlock, robust, actionable, data-driven, and solutions. Then the body-copy sweep for the quieter tells, run over the lower sections as well as the hero.

Deliberate brand devices in this package are craft and stay: the staccato triplet in band 2 ("Every slot name. Every entry. By hand."), the four one-word step labels in 6.1, and the pull line in 6.2. They were chosen here on purpose for this brand.


---

## 10. The generation prompts, written and priced

Written to the twelve laws before any credits move. Prices below are real, returned by Higgsfield free cost checks on these exact calls.

### The starting frame

`nano_banana_pro`, 16:9, 2k. **2 credits.**

> Thousands of tiny points of cool light suspended at many depths through a vast deep blue volume, scattered and unaligned, composed as the first moment of a slow steady descent down through them. The points fill the frame edge to edge, denser and brighter through the centre lane where the camera will travel, thinning into soft receding depth across the upper third and the lower third so those regions read as calm continuing space. Deep blue-black atmosphere with faint haze catching the light, one warm ember tone glowing far below and out of focus. Slow drifting particles, volumetric depth, shallow falloff. Cinematic, photorealistic, 16:9, high detail. No text, no logos, no lettering anywhere.

Law notes: the calm caption regions are described as receding depth inside one continuous world, never as emptiness or darkness, because naming them as empty makes the model paint literal black panels.

### The hero video

Image-to-video from the approved frame, 6 seconds, 1080p, 16:9, no audio.

| Model | Cost |
|---|---|
| Kling v3.0 standard | 9 credits |
| Kling v3.0 pro | 10.5 credits |
| Wan 2.7 | 15 credits |
| Seedance 2.0 | 54 credits |

> One continuous shot, no cuts. The camera descends steadily straight down through a vast field of thousands of tiny cool lights. At the start the points drift independently with no order. As the descent continues they find a shared direction, align into vertical lanes, then gather inward and draw together. The lights stay alive throughout, each one pulsing faintly and shifting as it moves. The scene stays alive: haze drifting past the lens, depth of field breathing, a warm glow strengthening from below as the camera nears it. Midway the camera passes through a thin veil of haze, with a brief soft bloom and one beat of blur as it crosses. The shot ends at rest: the gathered lights settled into a single steady horizontal band of warm-cored light stretched across the upper third of the frame, perfectly still, the space below it calm and open with only faint slow motes drifting, the whole frame quiet and arrived. No text or lettering anywhere.

Law notes: the motion agrees with the scroll (a descent), one subject and one unbroken trajectory, the path is locked while the lights stay alive, the boundary crossing at the haze veil carries its physical lens moment, and the ending is written explicitly as a composed arrival with the band in the upper third so the settle copy has calm space beneath it.

### Supporting stills

Three, one per card in the three-steps section, all in the approved hero footage world. Roughly 2 credits each, priced exactly once the hero grade is fixed.
