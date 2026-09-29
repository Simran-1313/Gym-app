# Clasendra Design Rules

Instructions for any designer or AI agent continuing the Clasendra admin dashboard. Follow these exactly; they encode decisions already made and verified. When a rule and your own taste disagree, the rule wins unless the user says otherwise.

## 1. Product context

- **Clasendra** is a gym-management SaaS (India). The admin dashboard is used by gym owners **every day**, often for long sessions.
- Core modules: Members, Follow-ups (WhatsApp), Classes, Check-ins (biometric/RFID), Reports, Leads, Invoices (GST), POS.
- **Differentiator:** AI churn prediction ("members likely to cancel"). It is the only element allowed an accent-coloured border. Give it visual priority.
- Currency is INR with Indian digit grouping: `₹14,85,320`, `₹14.85L`. Names are Indian (e.g. Priya Sharma, Arjun Mehta).
- Target feel: **calm, premium, macOS-level polish.** Calm comes from restraint (spacing, muted colour, soft depth), not from decoration or extra motion.

## 2. Colour tokens

Always use tokens, never raw hex, in designs. In pen.dev these exist as variables themed on the `mode` axis (`light` / `dark`).

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg` | `#FAF8F4` | `#0F0E0C` | Page background (warm stone / warm near-black) |
| `sidebar` | `#F3F0EA` | `#141312` | Sidebar background |
| `surface` | `#FEFCF8` | `#18171A` | Cards, sheets, dialogs (warm white, never pure `#FFF`) |
| `inset` | `#F2EFE7` | `#232025` | Tracks, segmented controls, avatars, recessed areas |
| `border` | `#201A1017` | `#FFFFFF12` | Hairlines, card borders |
| `text` | `#1C1712` | `#F7F5F1` | Primary text (17:1 / 16:1) |
| `text-2` | `#1C1712BD` | `#F7F5F1AD` | Secondary text (≥7:1) |
| `text-3` | `#1C17129C` | `#F7F5F17E` | Captions, hints, timestamps (≥4.6:1) |
| `accent` | `#5D56D5` | `#8E97EB` | Accent **text, icons, highlights only** |
| `accent-soft` | `#5D56D51A` | `#8E97EB24` | Tinted backgrounds for accent pills/active states |
| `accent-glow` | `#7174E3` | `#AFBAF2` | Chart gradients only (no text on it) |
| `accent-fill` | `#5D56D5` | `#5E5CE6` | **Button backgrounds with white text** (Apple systemIndigo in dark) |
| `accent-fill-hi` | `#7174E3` | `#7572EA` | Top stop of gradient badges (brand mark, avatars, app icon) |
| `success` | `#146C34` | `#4ADE80` | Positive status text |
| `success-soft` | `#16A34A1F` | `#4ADE801F` | Positive pill background |
| `warning` | `#A14B08` | `#FBBF24` | Expiring / medium-risk text |
| `warning-soft` | `#D977061F` | `#FBBF241F` | Warning pill background |
| `danger` | `#C62828` | `#F0768B` | Error / high-risk / overdue **text** |
| `danger-soft` | `#DC262612` | `#F0768B14` | Danger pill / alert icon background |
| `danger-fill` | `#C62828` | `#C8384A` | **Destructive/urgent button backgrounds** with white text |
| `shadow` | `#201A1014` | `#00000066` | Shadow colour (warm-tinted in light) |
| `scrim` | `#14100A47` | `#000000A6` | Dim layer behind blocking sheets/dialogs |
| `scrim-soft` | `#14100A38` | `#0000008C` | Lighter dim for Spotlight/search |

### Colour rules
1. **One accent (indigo).** No other decorative hues. Status colours (success/warning/danger) are semantic only, never decoration.
2. **Text-vs-fill split is mandatory.** White text sits only on `accent-fill` or `danger-fill`, never on `accent`/`danger` (dark-mode `accent` with white text is 2.7:1 and fails).
3. **Status colours stay saturated.** They must read as urgent; don't desaturate them for "calm".
4. **Contrast minimums (WCAG):** body/small text ≥ 4.5:1, large text (≥18px bold / 24px) ≥ 3:1, UI shapes ≥ 3:1. Measure. Don't eyeball.
5. Neutrals are **warm** (R > G > B). Never introduce cool/blue greys.
6. Never pure black `#000` backgrounds or pure white `#FFF` surfaces (halation in dark, glare in light). `#FFFFFF` is allowed only as text/icon on filled buttons.

## 3. Typography

- **Display / headings / big numbers:** `Outfit` (weights 600–700).
- **Everything else:** `Inter` (400/500/600). Chosen for screen legibility over long sessions; SF Pro isn't on Google Fonts, so don't swap it.
- Tracking is size-specific: large text negative, body ~0, small uppercase labels positive.

| Role | Font | Size | Weight | Letter-spacing |
|---|---|---|---|---|
| Page greeting / title | Outfit | 28 | 600 | -0.6 |
| Hero metric | Outfit | 40 | 700 | -1.2 |
| Stat value | Outfit | 26 | 600 | -0.6 |
| Card title | Outfit | 17 | 600 | 0 |
| Dialog title | Outfit | 18–20 | 600 | 0 |
| Body / row name | Inter | 13 | 600 (names) / 400 | 0 |
| Secondary line | Inter | 12 | 400 | 0 |
| Caption / section label | Inter | 11–12 | 500–600 | 0.2 on group labels |
| Button label | Inter | 13 | 600 | 0 |

- Use sentence case everywhere ("Add member", not "Add Member"). No ALL-CAPS eyebrows.
- Numbers that align in columns use tabular figures (HTML: `font-variant-numeric: tabular-nums`).

## 4. Spacing, radius, elevation

- **Spacing scale:** 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 28, 36. Card-to-card gap = **18**. Main content padding = **28 vertical / 36 horizontal**. Section gap inside main = **20**.
- **Radius scale:** controls 8–10, kbd chips 4–5, segmented inner 7, cards 16–18, sheets/dialogs 20–22, pills/avatars fully round (999 / half size).
- **Elevation by role, not by default:**
  - Standard card: `border` 1px + optional soft shadow `0 8 24 shadow`.
  - Active nav item / selected segment: `surface` fill + shadow `0 1 3 shadow` (a raised pill, macOS style).
  - Sheets/dialogs: shadow `0 24–30 60–80` at ~30% plus 1px border.
- Separate rows with a bottom hairline (`border`) on all but the last row. Don't box every element; not everything is a card.

## 5. Layout

- Canvas: **1440 × 1100** screens. Horizontal root: **Sidebar 248px** + **Main (fill)**.
- **Sidebar (macOS style):** traffic lights (`#FF5F57`, `#FEBC2E`, `#28C840`, 12px, gap 8) → brand (30px gradient mark + "Clasendra" / gym name) → nav groups (Gym, Biometric, Sales) with 11px group labels → account card pinned at bottom. Nav item: icon 16 + label 13, padding 7/10, radius 8. Counts are `accent-soft` pills.
- **Header:** left = date (12, `text-3`) above greeting ("Good evening, {name}", time-of-day aware); right = search field (280w, `⌘K` chip) + 38px icon buttons.
- **Dashboard order (card grid, owner-approved):** header → dues alert strip → hero row (revenue card fill + AI churn card 400w, equal height) → health row (3 equal stat cards) → bottom row (follow-ups fill + revenue split 380w) → "Jump to" quick-action chips.
- Alert strips: content left, actions flush right (`space_between`). Only the action button is red; the strip itself stays a neutral surface.
- **Do not add:** a second tab row under the header (duplicates the sidebar), six equal-weight metric tiles, or stark "0" values. Show a friendly empty state instead ("Doors open at 6:00 AM · 24 checked in yesterday").

## 6. Components (anatomy)

- **Primary button:** `accent-fill`, white 13/600 text, padding 8–10 / 14–16, radius 9–10, optional 14px leading icon.
- **Secondary button:** `surface` or `inset` fill + `border`, `text` label.
- **Destructive/urgent:** `danger-fill` + white text.
- **Status pill:** soft fill + matching text, 12/600, padding 3/9, fully round, optional 6px dot.
- **Segmented control:** `inset` track, padding 3, radius 9; selected segment = `surface` + small shadow.
- **Switch:** 38×22 track (`success` when on), 18px white knob with shadow.
- **Inputs:** label above (12/600 `text-2`), field `bg` fill + `border`, radius 10, padding 10/12, 14px text. Focus = `accent` 1.5px border. Error = `danger` border + 12px `danger` message below. Never placeholder-as-label.
- **Selectable cards (e.g. plans):** selected = `accent-soft` fill + `accent` 1.5px border + filled radio.
- **Avatars:** round, `inset` fill with initials; hero avatars use the indigo gradient (`accent-fill-hi` → `accent-fill`).
- **Charts:** current period in accent gradient, prior periods in `inset`, value label above each bar, month below. Donuts: `innerRadius` ~0.72, segments accent → accent-glow → text-3 → inset, total in the centre.

## 7. Overlays (Apple patterns)

| Pattern | When | Spec |
|---|---|---|
| Inspector sheet | Viewing an entity (member) | Right side, 460w, full height inset 12px, radius 20, bar with close/more, body, sticky action footer |
| Alert dialog | Confirming an action with consequences | Centered 400w, 56px app icon, title (question), 1-sentence message, context list, 50/50 Cancel / primary buttons |
| Form sheet | Creating a record | Centered 560w, title + helper line, fields, footer with total + Cancel / primary |
| Spotlight (⌘K) | Search & commands | 640w, top at y≈150, large 20px query, grouped results (Members / Actions / Pages), selected row = `accent-fill` with white text, keyboard-hint footer |

- Always place a full-screen `scrim` (Spotlight uses `scrim-soft`) over the dimmed screen behind.
- Primary button label names the action ("Send reminders", "Add & collect payment"), never "OK"/"Submit".
- Anchored popovers (notifications) scale from their trigger; modals stay centred.

## 8. Motion (HTML/prototype)

- Easing tokens: `--ease-out: cubic-bezier(0.23,1,0.32,1)`, `--ease-in-out: cubic-bezier(0.77,0,0.175,1)`, `--ease-drawer: cubic-bezier(0.32,0.72,0,1)`. Never `ease-in` on UI.
- Durations: press 100–160ms, popovers 150–200ms, sheets/drawers 220–300ms. Exit faster than enter.
- Animate only `transform` and `opacity`. Press = `scale(0.97)`.
- One-time load choreography is allowed: cards settle in (fade + 10px rise, 520ms, 40–60ms stagger), the chart line draws in, rings sweep, key numbers count up (~900ms).
- Everything wrapped in `prefers-reduced-motion` (shorten or remove). Hover effects behind `@media (hover:hover) and (pointer:fine)`.
- No looping/decorative animation.

## 9. Copy voice

Plain, specific, calm. State the fact and the next step: "3 members owe ₹18,400", "Plan expires in 2 days", "Enter a 10-digit mobile number". No exclamation marks, no "Oops", no marketing words (elevate, seamless, unleash).

## 10. pen.dev technical rules (learned the hard way)

- Always reference variables (`fill:"$surface"`), never hex, so both themes update together. Dark variants = copy the whole root screen with `theme:{mode:"dark"}`, then also set `theme:{mode:"dark"}` on any nested copies that carry their own `theme:{mode:"light"}`.
- **Render glitch recipe (always use it):** content inserted into a root screen often silently fails to render (bounds report a +50px y-offset, screenshots come back blank). This happens on copied roots *and* on fresh ones. Reliable fix: build everything, then **create a new root frame in its own `execute` call**, and in the next call `Move` every top-level child (sidebar, main, background copy, scrim, sheet) into it and `Delete` the old root. Verify with a screenshot after the move.
- Overlay screens: root with `layout:"none"`; children at explicit x/y (background copy at 0,0 → scrim → sheet).
- Set `layout:"horizontal"` explicitly on screen roots; check `ctx.bounds` after each section.
- "fit_content parent with fill_container child" warnings on the Hero Row are fixed by giving the row a fixed height (361).
- Lucide icon names that exist: `chart-column` (not `bar-chart-3`), `fingerprint-pattern` (not `fingerprint`).
- Screenshots of frames still marked `placeholder:true` render faded or blank. Remove the flag before judging visuals.

## 11. Screen inventory (current file)

Light + dark of each: Dashboard, Members, Member Profile (sheet), Send Reminders (alert), Spotlight Search, Add Member (form sheet), Support (tickets list + conversation), New Support Ticket (form sheet). 18 screens total.

Support ticket sheet pattern (reuse for any "report / request" form): required fields marked with a red `*`; helper text + character count under long text areas; **urgency/priority as three selectable cards with one-line descriptions, never a dropdown**; optional attachment drop area; footer states the reply expectation on the left, Cancel + primary action on the right.

## 12. Before handing back any screen, check
- [ ] Only tokens used; both themes render correctly
- [ ] Text contrast measured (≥4.5:1 small, ≥3:1 large); white text only on `-fill` tokens
- [ ] One accent; status colours used only for status
- [ ] Sentence case, specific copy, INR formatting
- [ ] No clipped/overflowing nodes (`ctx.problems` empty)
- [ ] Empty/error states designed, not raw zeros
